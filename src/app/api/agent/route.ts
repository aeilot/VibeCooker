import { z } from "zod";
import { parseLocale, translate } from "@/lib/i18n";
import { APICallError } from "ai";
import {
  adjustCooking,
  identifyIngredients,
  planRecipes,
  testConnection,
} from "@/lib/server/agent";
import { planRequestSchema, sessionSchema } from "@/lib/types";
import { providerSchema } from "@/lib/providers";
import { isSameOriginRequest } from "@/lib/server/same-origin";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("plan"), data: planRequestSchema }),
  z.object({
    action: z.literal("feedback"),
    data: z.object({
      session: sessionSchema,
      text: z.string().trim().min(1).max(1000),
    }),
  }),
  z.object({
    action: z.literal("photo"),
    data: z.object({
      image: z
        .string()
        .max(6_000_000)
        .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/),
    }),
  }),
  z.object({ action: z.literal("test") }),
]);

async function readBoundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 6_500_000) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function POST(request: Request) {
  const locale = parseLocale(request.headers.get("x-ui-locale"));
  const respond = (body: Record<string, unknown>, init?: ResponseInit) =>
    Response.json(
      typeof body.error === "string"
        ? { ...body, error: translate(locale, body.error) }
        : body,
      init,
    );
  if (!isSameOriginRequest(request))
    return respond({ error: "仅接受同站请求。" }, { status: 403 });
  try {
    // Credentials are request-scoped. Never put these in prompts, persistence or logs.
    const credentials = z
      .object({
        provider: providerSchema,
        model: z.string().trim().min(1).max(180),
        apiKey: z.string().trim().min(8).max(1024),
      })
      .safeParse({
        provider: request.headers.get("x-ai-provider"),
        model: request.headers.get("x-ai-model"),
        apiKey: request.headers.get("authorization")?.replace(/^Bearer /, ""),
      });
    if (!credentials.success)
      return respond(
        {
          error: "请先在「我的厨房」填写 Provider、模型 ID 和有效的 API Key。",
        },
        { status: 401 },
      );
    const parsed = requestSchema.safeParse(await readBoundedBody(request));
    if (!parsed.success)
      return respond(
        { error: "输入内容不完整或超出限制，请检查后重试。" },
        { status: 400 },
      );
    const input = parsed.data;
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(input.action === "test" ? 15_000 : 110_000),
    ]);
    if (input.action === "test") {
      await testConnection(credentials.data, signal);
      return respond({ ok: true });
    }
    if (input.action === "plan")
      return respond(
        await planRecipes(credentials.data, { ...input.data, locale }, signal),
      );
    if (input.action === "feedback")
      return respond(
        await adjustCooking(
          credentials.data,
          input.data.session,
          input.data.text,
          signal,
          undefined,
          locale,
        ),
      );
    const base64 = input.data.image.split(",")[1];
    const bytes = Buffer.from(base64, "base64");
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP";
    const mime = input.data.image.slice(5, input.data.image.indexOf(";"));
    if (
      bytes.length < 12 ||
      !(
        (mime === "image/jpeg" && jpeg) ||
        (mime === "image/png" && png) ||
        (mime === "image/webp" && webp)
      )
    ) {
      return respond(
        { error: "请上传有效的 JPG、PNG 或 WebP 照片。" },
        { status: 400 },
      );
    }
    return respond(
      await identifyIngredients(
        credentials.data,
        input.data.image,
        signal,
        undefined,
        locale,
      ),
    );
  } catch (error) {
    // Provider exceptions can include request headers. Return a fixed message; do not log raw errors.
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError")
      return respond(
        { error: "这次请求超时了。进度已保留，可以再试一次。" },
        { status: 504 },
      );
    if (error instanceof SyntaxError)
      return respond({ error: "请求格式不正确。" }, { status: 400 });
    if (error instanceof Error && error.message === "BODY_TOO_LARGE")
      return respond({ error: "照片过大，请压缩后重试。" }, { status: 413 });
    if (error instanceof Error && error.message === "EMPTY_TEST_RESPONSE")
      return respond(
        {
          error:
            "提供商已响应，但模型没有返回文本。请换一个支持文本对话的模型后重试。",
        },
        { status: 502 },
      );
    if (APICallError.isInstance(error)) {
      const messages: Record<number, string> = {
        400: "提供商不接受当前请求，请检查模型 ID 及模型能力。",
        401: "API Key 无效或已失效，请检查提供商和 Key 是否匹配。",
        402: "模型账户额度不足，请检查提供商账户余额。",
        403: "API Key 没有访问该模型的权限，请检查授权。",
        404: "未找到这个模型，请检查模型 ID 是否完整、正确。",
        429: "模型提供商限流或额度已用尽，请稍后重试并检查额度。",
      };
      return respond(
        {
          error:
            messages[error.statusCode ?? 0] ??
            "模型提供商暂时不可用，请稍后重试。",
        },
        { status: 502 },
      );
    }
    return respond(
      {
        error:
          "模型未能完成这次请求。请检查 Key、额度及模型是否支持工具调用、结构化输出；识图还需要视觉能力。原有进度已保留。",
      },
      { status: 502 },
    );
  }
}

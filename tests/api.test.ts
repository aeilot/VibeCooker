import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/agent/route";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
const fakeHeaders = {
  authorization: "Bearer test-key-not-real",
  "x-ai-provider": "openrouter",
  "x-ai-model": "test-model",
};

test("连接错误返回可操作说明，不泄露提供商原始错误或凭证", async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [401, 402, 404, 429]) {
      globalThis.fetch = async () =>
        Response.json(
          { error: { message: "SECRET-provider-error-test-key-not-real" } },
          { status },
        );
      const result = await POST(request({ action: "test" }, fakeHeaders));
      assert.equal(result.status, 502);
      const text = await result.text();
      assert.ok(!text.includes("SECRET"));
      assert.ok(!text.includes("test-key-not-real"));
      assert.match(text, /Key|额度|模型/);
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("API 在访问模型前拒绝缺少凭证或跨站请求", async () => {
  assert.equal((await POST(request({ action: "test" }))).status, 401);
  assert.equal(
    (
      await POST(
        request(
          { action: "test" },
          { ...fakeHeaders, origin: "https://other.example" },
        ),
      )
    ).status,
    403,
  );
});

test("API 拒绝非法 Provider、无效计划和伪造照片", async () => {
  assert.equal(
    (
      await POST(
        request(
          { action: "test" },
          { ...fakeHeaders, "x-ai-provider": "custom" },
        ),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await POST(
        request({ action: "plan", data: { ingredients: [] } }, fakeHeaders),
      )
    ).status,
    400,
  );
  const response = await POST(
    request(
      {
        action: "photo",
        data: {
          image: `data:image/png;base64,${Buffer.from("not an image at all").toString("base64")}`,
        },
      },
      fakeHeaders,
    ),
  );
  assert.equal(response.status, 400);
  assert.ok(!(await response.text()).includes("test-key-not-real"));
});

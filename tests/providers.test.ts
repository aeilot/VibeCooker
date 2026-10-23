import { test } from "node:test";
import assert from "node:assert/strict";
import {
  modelFor,
  identifyIngredients,
  planRecipes,
} from "../src/lib/server/agent";
import { makeDemoRecipes } from "../src/lib/cooking";
import { defaultProfile, type Credentials } from "../src/lib/types";
import { providers } from "../src/lib/providers";

function chatResponse(message: object, finishReason = "stop") {
  return Response.json({
    id: "test-completion",
    object: "chat.completion",
    created: 0,
    model: "test-model",
    choices: [
      {
        index: 0,
        message: { role: "assistant", ...message },
        finish_reason: finishReason,
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
  });
}

for (const provider of ["openrouter", "deepseek"] as const) {
  const credentials: Credentials = {
    provider,
    model: provider === "deepseek" ? "deepseek-flash" : "test/vision-model",
    apiKey: "fake-key-no-network",
  };

  test(`${provider} 使用官方 Chat Completions 地址并执行完整工具循环`, async () => {
    let requests = 0;
    const transport: typeof fetch = async (url, init) => {
      assert.equal(
        String(url),
        `${providers[provider].baseURL}/chat/completions`,
      );
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer fake-key-no-network",
      );
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, credentials.model);
      if (provider === "deepseek")
        assert.deepEqual(body.thinking, { type: "disabled" });
      else assert.deepEqual(body.provider, { require_parameters: true });
      requests++;
      const name = requests === 1 ? "get_kitchen_context" : "publish_recipes";
      const args =
        requests === 1
          ? {}
          : { recipes: makeDemoRecipes(["番茄", "鸡蛋"], defaultProfile) };
      assert.equal(
        body.tool_choice.type,
        requests === 1 ? "function" : undefined,
      );
      return chatResponse(
        {
          content: null,
          tool_calls: [
            {
              id: `call-${requests}`,
              type: "function",
              function: { name, arguments: JSON.stringify(args) },
            },
          ],
        },
        "tool_calls",
      );
    };
    const result = await planRecipes(
      credentials,
      { ingredients: ["番茄", "鸡蛋"], profile: defaultProfile, memories: [] },
      new AbortController().signal,
      modelFor(credentials, transport),
    );
    assert.equal(result.recipes.length, 6);
    assert.equal(requests, 2);
  });

  test(`${provider} 识图 JSON 输出模式兼容并进行 Schema 校验`, async () => {
    const expected = {
      ingredients: [{ name: "番茄", confidence: "较确定" }],
      note: "测试响应",
    };
    const transport: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(
        body.response_format.type,
        provider === "deepseek" ? "json_object" : "json_schema",
      );
      assert.equal(body.messages.at(-1).content[1].type, "image_url");
      assert.match(body.messages[0].content, /in English/);
      return chatResponse({ content: JSON.stringify(expected) });
    };
    const result = await identifyIngredients(
      credentials,
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGfQAAAAASUVORK5CYII=",
      new AbortController().signal,
      modelFor(credentials, transport),
      "en",
    );
    assert.deepEqual(result, expected);
  });
}

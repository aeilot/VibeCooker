import { test } from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";
import { planRecipes, adjustCooking } from "../src/lib/server/agent";
import { makeDemoRecipes } from "../src/lib/cooking";
import {
  defaultProfile,
  type CookingSession,
  type Credentials,
} from "../src/lib/types";

const credentials: Credentials = {
  provider: "openrouter",
  model: "test-model",
  apiKey: "test-only-never-sent",
};
const recipes = makeDemoRecipes(["番茄", "鸡蛋"], defaultProfile);
const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

function modelWithCalls(calls: { name: string; input: unknown }[]) {
  let index = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const call = calls[index++];
      assert.ok(call, "Agent 不应在完成提交后继续调用模型");
      return {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: `call-${index}`,
            toolName: call.name,
            input: JSON.stringify(call.input),
          },
        ],
        finishReason: { unified: "tool-calls" as const, raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
}

test("ReAct 读取上下文，拒绝冲突方案，接收修订方案并停止循环", async () => {
  const invalid = recipes.map((r) => ({ ...r, servings: 8 }));
  const model = modelWithCalls([
    { name: "get_kitchen_context", input: {} },
    { name: "publish_recipes", input: { recipes: invalid } },
    { name: "publish_recipes", input: { recipes } },
  ]);
  const result = await planRecipes(
    credentials,
    { ingredients: ["番茄", "鸡蛋"], profile: defaultProfile, memories: [] },
    new AbortController().signal,
    model,
  );
  assert.equal(result.recipes.length, 6);
  assert.equal(result.source, "ai");
  assert.equal(result.trace[0].label, "读取我的厨房");
  assert.equal(result.trace.at(-1)?.label, "计算并分散推荐");
  assert.equal(model.doGenerateCalls.length, 3);
  assert.ok(
    !JSON.stringify(model.doGenerateCalls).includes(credentials.apiKey),
  );
});

test("烹饪 Agent 先观察，再拒绝覆盖已完成步骤的方案", async () => {
  const recipe = recipes[0];
  const session: CookingSession = {
    recipe,
    currentStep: 1,
    completedIds: [recipe.steps[0].id],
    observations: [],
    timerEnd: null,
    version: 1,
    source: "ai",
    constraints: defaultProfile,
  };
  const valid = {
    reply: "先补充当前状态",
    needsClarification: true,
    remainingSteps: [],
  };
  const model = modelWithCalls([
    { name: "observe_cooking", input: {} },
    {
      name: "submit_revision",
      input: {
        reply: "重写",
        needsClarification: false,
        remainingSteps: recipe.steps,
      },
    },
    { name: "submit_revision", input: valid },
  ]);
  const result = await adjustCooking(
    credentials,
    session,
    "锅里太干了",
    new AbortController().signal,
    model,
  );
  assert.deepEqual(result.feedback, valid);
  assert.equal(model.doGenerateCalls.length, 3);
});

test("拒绝所有候选套用同一食材集合，修订为不同子集后才接受", async () => {
  const sameSubset = recipes.map((r) => ({
    ...r,
    ingredients: recipes[0].ingredients,
  }));
  const model = modelWithCalls([
    { name: "get_kitchen_context", input: {} },
    { name: "publish_recipes", input: { recipes: sameSubset } },
    { name: "publish_recipes", input: { recipes } },
  ]);
  const result = await planRecipes(
    credentials,
    { ingredients: ["番茄", "鸡蛋"], profile: defaultProfile, memories: [] },
    new AbortController().signal,
    model,
  );
  assert.equal(result.recipes.length, 6);
  assert.equal(model.doGenerateCalls.length, 3);
});

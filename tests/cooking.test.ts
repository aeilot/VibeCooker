import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyRevision,
  makeDemoRecipes,
  restrictionConflicts,
  validateRecipe,
} from "../src/lib/cooking";
import { defaultProfile, type CookingSession } from "../src/lib/types";

const recipes = makeDemoRecipes(["番茄", "鸡蛋", "面条"], defaultProfile);
const recipe = recipes[0];
const session: CookingSession = {
  recipe,
  currentStep: 1,
  completedIds: [recipe.steps[0].id],
  observations: [],
  timerEnd: 100,
  version: 1,
  source: "demo",
  constraints: defaultProfile,
};

test("明确忌口过滤食材及常见衍生物", () => {
  const withPeanutOil = {
    ...recipe,
    ingredients: [...recipe.ingredients, { name: "花生油", amount: "少量" }],
  };
  assert.deepEqual(restrictionConflicts(withPeanutOil, "不要花生"), ["花生"]);
  assert.equal(
    makeDemoRecipes(["虾仁"], { ...defaultProfile, restrictions: "海鲜" })
      .length,
    0,
  );
  assert.equal(
    validateRecipe(withPeanutOil, { ...defaultProfile, restrictions: "花生" })
      .valid,
    false,
  );
});

test("反馈修订保留完成的步骤，重置计时并升级版本", () => {
  const remainingSteps = [
    { ...recipe.steps[1], id: "new-current", instruction: "调整后的当前操作" },
    { ...recipe.steps[2], id: "new-last" },
  ];
  const result = applyRevision(session, {
    reply: "调整好了",
    needsClarification: false,
    remainingSteps,
  });
  assert.deepEqual(result.recipe.steps[0], recipe.steps[0]);
  assert.deepEqual(result.completedIds, session.completedIds);
  assert.equal(result.currentStep, 1);
  assert.equal(result.version, 2);
  assert.equal(result.timerEnd, null);
  assert.deepEqual(recipe.steps[1].id, "cook");
});

test("澄清不改动计划，恶意覆盖和重复步骤被拒绝", () => {
  assert.equal(
    applyRevision(session, {
      reply: "请补充状态",
      needsClarification: true,
      remainingSteps: [],
    }),
    session,
  );
  assert.throws(() =>
    applyRevision(session, {
      reply: "覆盖",
      needsClarification: false,
      remainingSteps: recipe.steps,
    }),
  );
  assert.throws(() =>
    applyRevision(session, {
      reply: "重复",
      needsClarification: false,
      remainingSteps: [recipe.steps[1], recipe.steps[1]],
    }),
  );
});

test("反馈修订也要重新检查忌口", () => {
  const restricted = {
    ...session,
    constraints: { ...defaultProfile, restrictions: "花生" },
  };
  assert.throws(() =>
    applyRevision(restricted, {
      reply: "调整",
      needsClarification: false,
      remainingSteps: [{ ...recipe.steps[1], instruction: "加入花生酱" }],
    }),
  );
});

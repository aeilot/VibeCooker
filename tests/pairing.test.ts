import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeRecipe,
  chemicalPrinciples,
  coreIngredients,
  jaccard,
  rankRecipes,
  subsetCount,
} from "../src/lib/pairing";
import { makeDemoRecipes } from "../src/lib/cooking";
import { defaultProfile, profileSchema } from "../src/lib/types";

const recipe = makeDemoRecipes(["番茄", "鸡蛋", "面条"], defaultProfile)[0];

test("按公式真实计算分数，未选中的油盐计入缺少食材", () => {
  const example = {
    ...recipe,
    minutes: 15,
    ingredients: ["番茄", "鸡蛋", "食用油", "盐"].map((name) => ({
      name,
      amount: "适量",
    })),
  };
  const result = analyzeRecipe(example, {
    ingredients: ["西红柿", "鸡蛋", "食用油", "面条"],
    profile: defaultProfile,
  });
  assert.equal(result.availability, 3 / 4);
  assert.equal(result.timeHeadroom, 0.5);
  assert.equal(result.simplicity, 1);
  assert.equal(result.score, 74);
  assert.deepEqual(result.missing, ["盐"]);
  assert.deepEqual(result.unused, ["面条"]);
  assert.equal(result.rawScore, 0.7375);
});

test("多样性排序选择不同主食材，而不是只返回重复配料的改名方案", () => {
  const a = { ...recipe, id: "a", minutes: 10 };
  const duplicate = { ...a, id: "duplicate", minutes: 11 };
  const different = {
    ...a,
    id: "different",
    minutes: 20,
    ingredients: ["鸡胸肉", "西兰花"].map((name) => ({ name, amount: "适量" })),
  };
  const ranked = rankRecipes([a, duplicate, different], {
    ingredients: ["番茄", "鸡蛋", "鸡胸肉", "西兰花"],
    profile: defaultProfile,
  });
  assert.deepEqual(
    ranked.map((r) => r.id),
    ["a", "different", "duplicate"],
  );
  assert.equal(jaccard(["番茄", "鸡蛋"], ["番茄", "面条"]), 1 / 3);
  assert.deepEqual(coreIngredients(["西红柿", "番茄", "盐", "鸡蛋"]), [
    "番茄",
    "鸡蛋",
  ]);
});

test("违反明确限制的候选不会进入排序，改变预算会改变评分", () => {
  const context = {
    ingredients: ["番茄", "鸡蛋"],
    profile: { ...defaultProfile, restrictions: "鸡蛋" },
  };
  assert.equal(rankRecipes([recipe], context).length, 0);
  assert.equal(analyzeRecipe(recipe, context).score, 0);
  assert.ok(
    analyzeRecipe(recipe, {
      ...context,
      profile: { ...defaultProfile, minutes: 60 },
    }).score >
      analyzeRecipe(recipe, { ...context, profile: defaultProfile }).score,
  );
});

test("候选支持 6/9 个选项，按不同食材子集生成；旧设置默认迁移到 6 个", () => {
  assert.equal(subsetCount(3), 7);
  assert.equal(subsetCount(5), 30);
  for (const optionCount of [6, 9] as const) {
    const result = makeDemoRecipes(["番茄", "鸡蛋", "面条"], {
      ...defaultProfile,
      optionCount,
    });
    assert.equal(result.length, optionCount);
    assert.ok(result.every((r) => r.ingredients.length < 3));
    assert.ok(
      new Set(
        result.map((r) =>
          r.ingredients
            .map((i) => i.name)
            .sort()
            .join("|"),
        ),
      ).size >= 3,
    );
  }
  const { optionCount: _removed, ...legacy } = defaultProfile;
  assert.equal(profileSchema.parse(legacy).optionCount, 6);
});

test("化学说明取决于技法，水煮不能直接宣称发生煎烤褐变", () => {
  assert.ok(
    chemicalPrinciples({ ...recipe, technique: "煮" }).some(
      (p) => p.source === "protein",
    ),
  );
  assert.ok(
    !chemicalPrinciples({ ...recipe, technique: "煮" }).some(
      (p) => p.source === "maillard",
    ),
  );
  assert.ok(
    chemicalPrinciples({ ...recipe, technique: "煎" }).some(
      (p) => p.source === "maillard",
    ),
  );
  assert.ok(
    chemicalPrinciples({ ...recipe, technique: "拌" }).every(
      (p) => p.source === "gastronomy",
    ),
  );
});

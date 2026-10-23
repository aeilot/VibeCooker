import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLocale,
  translate,
  canonicalEnglishIngredient,
} from "../src/lib/i18n";
import { pantry, categories, matchesIngredient } from "../src/lib/catalog";
import { restrictionConflicts, makeDemoRecipes } from "../src/lib/cooking";
import { canonicalIngredient, analyzeRecipe } from "../src/lib/pairing";
import { defaultProfile } from "../src/lib/types";
import { languageInstructions } from "../src/lib/server/agent";
import { POST } from "../src/app/api/agent/route";

test("全部内置食材和分类可双语显示，并保留稳定的食材标识", () => {
  for (const item of pantry) {
    assert.ok(!/[\u3400-\u9fff]/u.test(translate("en", item.name)), item.name);
    assert.equal(translate("zh-CN", item.name), item.name);
    assert.equal(
      canonicalEnglishIngredient(translate("en", item.name)),
      item.name,
    );
  }
  for (const category of categories)
    assert.ok(!/[\u3400-\u9fff]/u.test(translate("en", category)));
  assert.ok(matchesIngredient(pantry[0], "tomatoes"));
  assert.equal(canonicalIngredient("Eggs"), "鸡蛋");
});

test("英文食材参与相同的限制检查和配方评分", () => {
  const recipe = makeDemoRecipes(["番茄", "鸡蛋"], defaultProfile)[0];
  assert.deepEqual(restrictionConflicts(recipe, "no eggs"), ["鸡蛋"]);
  const english = {
    ...recipe,
    ingredients: recipe.ingredients.map((i) => ({
      ...i,
      name: translate("en", i.name),
    })),
  };
  assert.equal(
    analyzeRecipe(recipe, {
      ingredients: ["番茄", "鸡蛋"],
      profile: defaultProfile,
    }).score,
    analyzeRecipe(english, {
      ingredients: ["Tomato", "Egg"],
      profile: defaultProfile,
    }).score,
  );
  assert.deepEqual(restrictionConflicts(english, "鸡蛋"), ["鸡蛋"]);
});

test("动态通知、演示菜名和 API 错误按语言翻译，未知用户内容保持原文", async () => {
  assert.equal(
    translate("en", "共 178 种家常食材"),
    "178 everyday ingredients",
  );
  assert.equal(
    translate("en", "番茄与鸡蛋 · 家常小炒"),
    "Tomato & Egg · Everyday stir-fry",
  );
  assert.equal(translate("en", "我自己的料理笔记"), "我自己的料理笔记");
  assert.equal(parseLocale("unexpected"), "zh-CN");
  const response = await POST(
    new Request("http://localhost:3000/api/agent", {
      method: "POST",
      headers: { "x-ui-locale": "en" },
      body: JSON.stringify({ action: "test" }),
    }),
  );
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /Enter a provider/);
  assert.match(languageInstructions("en"), /in English/);
});

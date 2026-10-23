import { pantry } from "./catalog";
import { canonicalEnglishIngredient } from "./i18n";
import { validateRecipe } from "./cooking";
import type { KitchenProfile, Recipe } from "./types";

export type PairingContext = { ingredients: string[]; profile: KitchenProfile };

export function canonicalIngredient(name: string): string {
  const clean = name
    .replace(/[（(].*?[）)]/g, "")
    .trim()
    .toLocaleLowerCase();
  const englishName = canonicalEnglishIngredient(clean);
  if (englishName) return englishName;
  const entry = pantry.find(
    (p) =>
      p.name === clean ||
      p.aliases?.some((alias) => alias.toLocaleLowerCase() === clean),
  );
  return entry?.name ?? clean;
}

export function coreIngredients(names: string[]): string[] {
  const unique = [...new Set(names.map(canonicalIngredient))];
  return unique.filter(
    (name) =>
      name !== "水" &&
      name !== "清水" &&
      pantry.find((p) => p.name === name)?.category !== "调味",
  );
}

export function jaccard(a: string[], b: string[]): number {
  const left = new Set(a),
    right = new Set(b);
  const union = new Set([...left, ...right]);
  return union.size
    ? [...left].filter((name) => right.has(name)).length / union.size
    : 0;
}

export function analyzeRecipe(recipe: Recipe, context: PairingContext) {
  const inventory = new Set(context.ingredients.map(canonicalIngredient));
  const required = [
    ...new Set(
      [...recipe.ingredients.map((i) => i.name), ...recipe.missing].map(
        canonicalIngredient,
      ),
    ),
  ];
  const available = required.filter((name) => inventory.has(name));
  const missing = required.filter((name) => !inventory.has(name));
  const core = coreIngredients(recipe.ingredients.map((i) => i.name));
  const availability = required.length ? available.length / required.length : 0;
  const timeHeadroom = Math.max(
    0,
    1 - recipe.minutes / context.profile.minutes,
  );
  const simplicity = Math.max(0, 1 - Math.max(0, core.length - 2) / 6);
  const feasible = validateRecipe(recipe, context.profile).valid;
  const rawScore = feasible
    ? 0.45 * availability + 0.3 * timeHeadroom + 0.25 * simplicity
    : 0;
  return {
    core,
    available,
    missing,
    unused: context.ingredients.filter(
      (name) => !required.includes(canonicalIngredient(name)),
    ),
    availability,
    timeHeadroom,
    simplicity,
    feasible,
    rawScore,
    score: Math.round(100 * rawScore),
    contributions: [45 * availability, 30 * timeHeadroom, 25 * simplicity],
  };
}

/** Greedy maximal marginal relevance; fixed, disclosed heuristic weights, not taste probabilities. */
export function rankRecipes(
  recipes: Recipe[],
  context: PairingContext,
): Recipe[] {
  const pending = recipes
    .map((recipe) => ({ recipe, analysis: analyzeRecipe(recipe, context) }))
    .filter((item) => item.analysis.feasible);
  const chosen: typeof pending = [];
  while (pending.length) {
    let bestIndex = 0,
      bestValue = -Infinity;
    pending.forEach((item, i) => {
      const similarity = chosen.length
        ? Math.max(
            ...chosen.map((other) =>
              jaccard(item.analysis.core, other.analysis.core),
            ),
          )
        : 0;
      const value = chosen.length
        ? 0.75 * item.analysis.rawScore + 0.25 * (1 - similarity)
        : item.analysis.rawScore;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    });
    chosen.push(pending.splice(bestIndex, 1)[0]);
  }
  return chosen.map((item) => item.recipe);
}

export function subsetCount(n: number): number {
  let combinations = 1,
    total = 0;
  for (let k = 1; k <= Math.min(n, 4); k++) {
    combinations = (combinations * (n - k + 1)) / k;
    total += combinations;
  }
  return Math.round(total);
}

export const scienceSources = {
  gastronomy: {
    title: "计算美食学综述 · 2024",
    url: "https://www.nature.com/articles/s41540-024-00399-5",
  },
  network: {
    title: "Flavor Network · 2011",
    url: "https://www.nature.com/articles/srep00196",
  },
  graph: {
    title: "FlavorGraph · 2021",
    url: "https://www.nature.com/articles/s41598-020-79422-8",
  },
  maillard: {
    title: "Texas A&M · 美拉德反应",
    url: "https://meat.tamu.edu/texas-bbq/bbq-science/",
  },
  protein: {
    title: "IFST · 蛋白质凝固",
    url: "https://www.ifst.org/lovefoodlovescience/resources/protein-coagulation",
  },
  starch: {
    title: "American Society of Baking · 淀粉糊化",
    url: "https://asbe.org/article/starch-gelatinization/",
  },
} as const;

export function chemicalPrinciples(recipe: Recipe) {
  const names = recipe.ingredients.map((i) => canonicalIngredient(i.name));
  const categories = names.map(
    (name) => pantry.find((p) => p.name === name)?.category,
  );
  const notes: {
    title: string;
    mechanism: string;
    implication: string;
    limitation: string;
    source: keyof typeof scienceSources;
  }[] = [];
  const heated = ["炒", "煎", "煮", "蒸", "烤"].includes(recipe.technique);
  if (
    heated &&
    categories.some(
      (c) => c === "肉类" || c === "海鲜" || c === "蛋奶" || c === "豆制品",
    )
  )
    notes.push({
      title: "蛋白质变性与凝固",
      mechanism:
        "加热可使部分蛋白质展开、聚集，改变结构与口感；持续加热还可能引起收缩和失水。",
      implication: `这份方案标记为「${recipe.technique}」，需要关注质地变化和加热进程。`,
      limitation:
        "这是按食材类别触发的一般机制；不同蛋白质行为不同，不能据此判断熟度或食品安全。",
      source: "protein",
    });
  if (["炒", "煎", "烤"].includes(recipe.technique))
    notes.push({
      title: "美拉德反应与表面褐变",
      mechanism:
        "还原糖与氨基化合物参与一系列反应，可能产生褐色物质和烘烤香气。",
      implication: `「${recipe.technique}」可能提供表面褐变条件，具体取决于食材表面温度和水分。`,
      limitation:
        "没有测量表面温度、含水量或反应底物，因此这里只解释可能的机制，不预测香气或反应速率。",
      source: "maillard",
    });
  if (
    heated &&
    (categories.includes("主食") ||
      names.some((name) =>
        ["土豆", "红薯", "山药", "芋头", "淀粉"].includes(name),
      ))
  )
    notes.push({
      title: "淀粉糊化与吸水",
      mechanism:
        "淀粉在有足够水分并加热时，颗粒吸水膨胀、结构改变，影响软化和增稠。",
      implication:
        "规划水量和加热顺序时，需要考虑食材是否需要吸水，以及它此前是否已经煮熟。",
      limitation:
        "米饭、面包等可能已糊化；这里只提示相关机制，不计算吸水量或宣称这一步一定再次发生糊化。",
      source: "starch",
    });
  if (!notes.length)
    notes.push({
      title: "风味是配比与过程的共同结果",
      mechanism:
        "食材名称和共存关系能提供搭配线索，但风味还受用量、气味阈值、温度、质地和个人经验影响。",
      implication:
        "这份方案缺少足够的加热与组成信息，目前不对具体化学反应作判断。",
      limitation: "未接入分子组成或浓度数据，不能计算化学相似度。",
      source: "gastronomy",
    });
  return notes;
}

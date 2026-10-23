import type {
  CookingSession,
  FeedbackResponse,
  KitchenProfile,
  Recipe,
} from "./types";
import { canonicalEnglishIngredient, translate } from "./i18n";

// Deterministic checks supplement the model; they are not a comprehensive allergen database.
const aliases: Record<string, string[]> = {
  花生: ["花生", "花生油", "花生酱"],
  牛奶: ["牛奶", "奶酪", "黄油", "奶油", "乳酪"],
  乳制品: ["牛奶", "奶酪", "黄油", "奶油", "乳酪"],
  鸡蛋: ["鸡蛋", "蛋液", "蛋黄", "蛋白"],
  海鲜: ["虾", "蟹", "鱼", "贝", "蚝油"],
  虾: ["虾", "虾酱", "虾皮"],
  大豆: ["豆腐", "酱油", "豆浆", "大豆", "味噌"],
};

export function restrictionConflicts(
  recipe: Recipe,
  restrictions: string,
): string[] {
  if (!restrictions.trim()) return [];
  const text = JSON.stringify({
    ingredients: recipe.ingredients,
    missing: recipe.missing,
    steps: recipe.steps,
    tips: recipe.tips,
  }).toLocaleLowerCase();
  const terms = restrictions
    .split(/[，,、；;\s]+/)
    .map((v) =>
      v
        .replace(/过敏|不吃|不能吃|不要|不放|忌口|禁用|禁止|无/g, "")
        .replace(/^(?:allergic to|allergy to|avoid|no)\s+/i, "")
        .trim()
        .toLocaleLowerCase(),
    )
    .map(
      (term) =>
        ({
          seafood: "海鲜",
          dairy: "乳制品",
          soy: "大豆",
          peanut: "花生",
          egg: "鸡蛋",
          eggs: "鸡蛋",
          shrimp: "虾",
        })[term] ??
        canonicalEnglishIngredient(term) ??
        term,
    )
    .filter(Boolean);
  return terms.filter((term) =>
    (aliases[term] ?? [term]).some(
      (alias) =>
        text.includes(alias.toLocaleLowerCase()) ||
        text.includes(translate("en", alias).toLocaleLowerCase()),
    ),
  );
}

export function validateRecipe(recipe: Recipe, profile: KitchenProfile) {
  const issues: string[] = [];
  if (recipe.servings !== profile.people) issues.push("份数与要求不符");
  if (recipe.minutes > profile.minutes) issues.push("超出可用时间");
  if (new Set(recipe.steps.map((s) => s.id)).size !== recipe.steps.length)
    issues.push("步骤 ID 重复");
  const conflicts = restrictionConflicts(recipe, profile.restrictions);
  if (conflicts.length) issues.push(`出现禁用食材：${conflicts.join("、")}`);
  return { valid: issues.length === 0, issues };
}

export function applyRevision(
  session: CookingSession,
  response: FeedbackResponse,
): CookingSession {
  if (response.needsClarification || response.remainingSteps.length === 0)
    return session;
  const preserved = session.recipe.steps.filter((s) =>
    session.completedIds.includes(s.id),
  );
  if (response.remainingSteps.some((s) => session.completedIds.includes(s.id)))
    throw new Error("调整不能覆盖已完成的步骤，请重新尝试。");
  const steps = [...preserved, ...response.remainingSteps];
  if (steps.length > 16) throw new Error("调整后的步骤过多，请缩短计划。");
  if (new Set(steps.map((s) => s.id)).size !== steps.length)
    throw new Error("调整后的步骤编号重复，请重试。");
  const recipe = { ...session.recipe, steps };
  const conflicts = restrictionConflicts(
    recipe,
    session.constraints.restrictions,
  );
  if (conflicts.length) throw new Error("调整方案与忌口冲突，已保留原计划。");
  return {
    ...session,
    recipe,
    currentStep: preserved.length,
    version: session.version + 1,
    timerEnd: null,
  };
}

export function makeDemoRecipes(
  ingredients: string[],
  profile: KitchenProfile,
): Recipe[] {
  // Demo templates intentionally use only the selected ingredients; no pretend model inference.
  const subsets: string[][] = [];
  const seen = new Set<string>();
  const add = (names: string[]) => {
    const unique = [...new Set(names)];
    const signature = [...unique].sort().join("|");
    if (unique.length && !seen.has(signature)) {
      seen.add(signature);
      subsets.push(unique);
    }
  };
  for (
    let i = 0;
    i < ingredients.length && subsets.length < profile.optionCount;
    i++
  )
    add([ingredients[i], ingredients[(i + 1) % ingredients.length]]);
  for (const name of ingredients) {
    if (subsets.length >= profile.optionCount) break;
    add([name]);
  }
  if (!subsets.length) return [];
  const variants = [
    "家常小炒",
    "暖暖一锅",
    "灵感料理盘",
    "香煎小食",
    "清蒸小碗",
    "清爽拌盘",
    "锅边小实验",
    "温暖汤碗",
    "新意小拼盘",
  ];
  const techniques: Recipe["technique"][] = [
    "炒",
    "煮",
    "其他",
    "煎",
    "蒸",
    "拌",
    "炒",
    "煮",
    "其他",
  ];
  return variants
    .slice(0, profile.optionCount)
    .map((variant, index): Recipe => {
      const chosen = subsets[index % subsets.length];
      const core = chosen.join("与");
      return {
        id: `demo-${index}-${chosen.join("-").slice(0, 55)}`,
        title: `${core} · ${variant}`,
        subtitle: [
          "把冰箱里的小日常，炒成一份小幸福。",
          "热气腾腾的一锅，装下今天的好心情。",
          "一点熟悉，一点新意，刚好是你的味道。",
        ][index % 3],
        story:
          "这是用于体验交互的固定演示模板，尚未根据实际食材验证烹饪方法。接入自己的模型后，才能生成经过工具校验的专属方案。",
        minutes: Math.min(profile.minutes, 15 + index * 5),
        servings: profile.people,
        difficulty: "轻松上手",
        origin:
          index === 2 || profile.creativity === "creative"
            ? "creative"
            : "classic",
        mood: (["tomato", "golden", "green"] as const)[index % 3],
        technique: techniques[index],
        ingredients: chosen.map((name) => ({
          name,
          amount: "演示份量 · 需自行确认",
        })),
        missing: [],
        steps: [
          {
            id: "prep",
            title: "准备好今天的食材",
            instruction: `整理${chosen.join("、")}。这是流程演示，正式烹饪请先接入模型生成适合这些食材的具体处理方法。`,
            cue: "确认食材名称、实际数量与状态。",
            minutes: 3,
          },
          {
            id: "cook",
            title: "进入你的料理时间",
            instruction:
              "这里将展示食材用量、操作顺序和火候。你可以试用下方的即时反馈，体验 Agent 如何接收当前状态。",
            cue: "演示步骤不作为实际烹饪依据。",
            minutes: 5,
          },
          {
            id: "finish",
            title: "记录这次的小收获",
            instruction:
              "完成后为这道料理打分，记录口味。如果你明确选择记住，下次生成会读取你的偏好。",
            cue: "准备好记录本次体验。",
            minutes: 1,
          },
        ],
        tips: [
          "演示模式不会调用模型，也不会识别照片。",
          "在「我的厨房」连接模型，开启真实的原创料理。",
        ],
      };
    })
    .filter((r) => validateRecipe(r, profile).valid);
}

export function demoFeedback(text: string): FeedbackResponse {
  return {
    reply: `收到你的反馈「${text}」。演示模式已记录当前状态，但不会给出未经验证的料理调整。连接支持工具调用的模型后，我会结合已完成步骤、现场状态和你的忌口调整剩余计划。`,
    needsClarification: true,
    remainingSteps: [],
  };
}

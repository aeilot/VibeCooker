import { englishMessages } from "./en";
import { ingredientEnglish } from "./ingredients";
import { scienceEnglish } from "./science";

export type Locale = "zh-CN" | "en";
export const LOCALE_COOKIE = "vibecooker-locale";
export function parseLocale(value: unknown): Locale {
  return value === "en" ? "en" : "zh-CN";
}
export const english = {
  ...ingredientEnglish,
  ...englishMessages,
  ...scienceEnglish,
};
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

const patterns: [
  RegExp,
  (groups: string[], tr: (text: string) => string) => string,
][] = [
  [
    /^(\d+) 种食材 · (\d+) 人份 · (\d+) 分钟$/,
    ([n, people, minutes]) =>
      `${n} ingredients · ${people} servings · ${minutes} min`,
  ],
  [
    /^(\d+) 份候选 · 按实用评分与主食材集合差异排序；不要求用完全部食材$/,
    ([n]) =>
      `${n} options · ranked by practicality and ingredient-set variety; you do not need to use everything`,
  ],
  [
    /^计划 v(\d+) · 已完成 (\d+) 步$/,
    ([version, steps]) => `Plan v${version} · ${steps} steps completed`,
  ],
  [
    /^正在连接 (.+)，测试模型 (.+)。最长约 20 秒，可随时取消。$/,
    ([provider, model]) =>
      `Connecting to ${provider}, testing ${model}. This may take up to 20 seconds. You can cancel anytime.`,
  ],
  [
    /^这份料理与当前厨房设置不符：(.+)。请重新生成。$/,
    ([issues], tr) =>
      `This recipe does not match your kitchen settings: ${issues.split("、").map(tr).join(", ")}. Please generate again.`,
  ],
  [
    /^已把 (\d+) 种确认过的食材放进冰箱。$/,
    ([n]) =>
      `${n} confirmed ingredient${n === "1" ? "" : "s"} added to your fridge.`,
  ],
  [
    /^找到 (\d+) 种食材$/,
    ([n]) => `${n} ingredient${n === "1" ? "" : "s"} found`,
  ],
  [
    /^共 (\d+) 种家常食材$/,
    ([n]) => `${n} everyday ingredient${n === "1" ? "" : "s"}`,
  ],
  [
    /^(.+) · (\d+) 种$/,
    ([category, n], tr) =>
      `${tr(category)} · ${n} ingredient${n === "1" ? "" : "s"}`,
  ],
  [/^移除(.+)$/, ([name], tr) => `Remove ${tr(name)}`],
  [
    /^已经记住你的 (\d+) 个小偏好$/,
    ([n]) => `${n} little preference${n === "1" ? "" : "s"} remembered`,
  ],
  [/^删除偏好：(.+)$/, ([text]) => `Delete preference: ${text}`],
  [/^删除(.+)的记录$/, ([title], tr) => `Delete record for ${tr(title)}`],
  [/^(\d+) 星$/, ([n]) => `${n} star${n === "1" ? "" : "s"}`],
  [
    /^出现禁用食材：(.+)$/,
    ([names], tr) =>
      `Restricted ingredients: ${names.split("、").map(tr).join(", ")}`,
  ],
  [
    /^整理(.+)。这是流程演示，正式烹饪请先接入模型生成适合这些食材的具体处理方法。$/,
    ([names], tr) =>
      `Gather ${names.split("、").map(tr).join(", ")}. This is a workflow demo. Connect a model for cooking instructions suited to these ingredients.`,
  ],
  [
    /^收到你的反馈「(.+)」。演示模式已记录当前状态，但不会给出未经验证的料理调整。连接支持工具调用的模型后，我会结合已完成步骤、现场状态和你的忌口调整剩余计划。$/,
    ([text]) =>
      `Feedback received: “${text}”. Demo mode records the current state without suggesting unverified cooking changes. Connect a tool-capable model to adjust remaining steps using your progress, observations and dietary restrictions.`,
  ],
  [
    /^这份方案标记为「(.+)」，需要关注质地变化和加热进程。$/,
    ([method], tr) =>
      `This recipe is marked “${tr(method)}”. Watch texture changes and heating progress.`,
  ],
  [
    /^「(.+)」可能提供表面褐变条件，具体取决于食材表面温度和水分。$/,
    ([method], tr) =>
      `“${tr(method)}” may allow surface browning, depending on surface temperature and moisture.`,
  ],
  [
    /^(.+) · (家常小炒|暖暖一锅|灵感料理盘|香煎小食|清蒸小碗|清爽拌盘|锅边小实验|温暖汤碗|新意小拼盘)$/,
    ([names, style], tr) =>
      `${names.split("与").map(tr).join(" & ")} · ${tr(style)}`,
  ],
];

/** Source-language keys keep canonical ingredient IDs and user records unchanged. */
export function translate(locale: Locale, text: string): string {
  if (locale === "zh-CN") return text;
  const key = normalize(text);
  if (english[key] !== undefined) return english[key];
  for (const [pattern, render] of patterns) {
    const result = key.match(pattern);
    if (result)
      return render(result.slice(1), (value) => translate(locale, value));
  }
  return text;
}

export function canonicalEnglishIngredient(text: string): string | undefined {
  const normalizeName = (value: string) =>
    value
      .trim()
      .toLocaleLowerCase()
      .replace(/ies$/, "y")
      .replace(/oes$/, "o")
      .replace(/(?<!s|u)s$/, "");
  const query = normalizeName(text);
  return Object.keys(ingredientEnglish).find(
    (key) => normalizeName(ingredientEnglish[key]) === query,
  );
}

"use client";

import { useI18n } from "@/components/i18n-provider";
import { FlaskConical, Leaf } from "lucide-react";
import {
  analyzeRecipe,
  chemicalPrinciples,
  coreIngredients,
  scienceSources,
  subsetCount,
  type PairingContext,
} from "@/lib/pairing";
import type { Recipe } from "@/lib/types";

export function RecipeScience({
  recipe,
  context,
  demo,
}: {
  recipe: Recipe;
  context: PairingContext;
  demo: boolean;
}) {
  const { locale, t: tr } = useI18n();
  const data = analyzeRecipe(recipe, context);
  const labels = ["食材齐备率 A", "时间余量 E", "操作简洁度 C"];
  const weights = [45, 30, 25];
  const values = [data.availability, data.timeHeadroom, data.simplicity];
  return (
    <section className="recipe-science" aria-label={tr("搭配原理与计算")}>
      <h3>
        <FlaskConical size={17} />
        {tr("这份搭配，怎么算、为什么？")}
      </h3>
      <p className="science-boundary">
        {tr(
          demo
            ? "演示方案也使用下列真实公式，但方案本身未验证，分数只用于展示计算。"
            : "程序按生成时的厨房设置计算，权重是产品启发式；分数衡量实用性，不代表美味概率、营养评价或安全结论。",
        )}
      </p>
      <div className="subset-summary">
        <p>
          <strong>{tr("这份用到")}</strong>
          {recipe.ingredients
            .map((i) => tr(i.name))
            .join(locale === "en" ? ", " : "、")}
        </p>
        <p>
          <strong>{tr("留给下次")}</strong>
          {data.unused.map(tr).join(locale === "en" ? ", " : "、") ||
            tr("本次选择的食材均在方案中")}
        </p>
        {data.missing.length > 0 && (
          <p>
            <strong>{tr("还需确认")}</strong>
            {data.missing.map(tr).join(locale === "en" ? ", " : "、")}
          </p>
        )}
      </div>
      <details className="science-calculation">
        <summary>
          {tr("实用评分")}
          {data.score}
          {tr("/100 · 查看计算明细")}
        </summary>
        <code>Q = 45A + 30E + 25C</code>
        <div className="score-breakdown">
          {labels.map((label, i) => (
            <div key={label}>
              <span>{tr(label)}</span>
              <span className="score-bar">
                <i style={{ width: `${values[i] * 100}%` }} />
              </span>
              <strong>
                {values[i].toFixed(3)} × {weights[i]} ={" "}
                {data.contributions[i].toFixed(1)}
              </strong>
            </div>
          ))}
        </div>
        <p>
          A = {data.available.length}/
          {data.available.length + data.missing.length}
          {tr("；E = max(0, 1 −")} {recipe.minutes}/{context.profile.minutes}
          {tr(")；C = max(0, 1 − max(0,")} {data.core.length}
          {tr(
            "− 2)/6)。主食材不含已识别的调味料；按名称和别名匹配，未核实实际库存克数。",
          )}
        </p>
        {!data.feasible && (
          <p>
            {tr("当前人数、时间或已知忌口检查未通过，评分归零。请重新生成。")}
          </p>
        )}
      </details>
      <h4>
        {tr("相关的食品化学机制")}
        <span>{tr("条件推断 · 未做检测")}</span>
      </h4>
      {chemicalPrinciples(recipe).map((note) => (
        <article className="chemistry-note" key={note.title}>
          <h5>
            <Leaf size={14} />
            {tr(note.title)}
          </h5>
          <p>{tr(note.mechanism)}</p>
          <p>{tr(note.implication)}</p>
          <small>{tr(note.limitation)}</small>
          <a
            href={scienceSources[note.source].url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr(scienceSources[note.source].title)} ↗
          </a>
        </article>
      ))}
    </section>
  );
}

export function SciencePrimer({ context }: { context: PairingContext }) {
  const { locale, t: tr } = useI18n();
  const n = coreIngredients(context.ingredients).length;
  return (
    <div className="science-primer">
      <p className="science-lead">
        {tr(
          "先挑合适的食材子集，再设计做法，最后比较不同选项。拥有的食材是可选资源，不是每道菜都必须完成的清单。",
        )}
      </p>
      <section>
        <span className="small-eyebrow">{tr("01 · 组合优化")}</span>
        <h3>{tr("一份冰箱，可以有很多条路线")}</h3>
        <code>{tr("S ⊆ I，1 ≤ |S| ≤ 4")}</code>
        <p>
          {tr("以 1–4 种主食材为例，你当前的")}
          {n}
          {tr("种主食材共有")} {subsetCount(n).toLocaleString(locale)}
          {tr(
            "个理论子集。实际由模型提出 6 或 9 个候选，不会穷举，也不声称找到了全局最优解。调味料另计，实用菜谱可超过 4 种主食材。",
          )}
        </p>
        <p>
          {tr(
            "例如番茄、鸡蛋、面条，可以分别考虑番茄鸡蛋、番茄面、鸡蛋面，或一道单食材料理；这些是备选路线，并非一桌同时制作的菜。",
          )}
        </p>
      </section>
      <section>
        <span className="small-eyebrow">{tr("02 · 可复算评分")}</span>
        <h3>{tr("先判断做不做得成，再比较方便程度")}</h3>
        <code>Q = 100 × (0.45A + 0.30E + 0.25C)</code>
        <ul>
          <li>
            {tr(
              "A = 所需食材中已拥有的种类数 ÷ 所需种类数。未选中的油盐不会被默认当作已有。",
            )}
          </li>
          <li>{tr("E = max(0, 1 − 预计耗时 ÷ 可用时间)。")}</li>
          <li>
            {tr(
              "C = max(0, 1 − max(0, 主食材种数 − 2)/6)。这是鼓励简单组合的产品规则。",
            )}
          </li>
        </ul>
        <p>
          {tr(
            "份数、时间或已知忌口检查失败时 Q=0。权重未从实验或用户反馈中拟合；分数只用于实用排序。没有核实克数、预算或全量过敏原信息。",
          )}
        </p>
      </section>
      <section>
        <span className="small-eyebrow">{tr("03 · 多样性排序")}</span>
        <h3>{tr("避免六个选项都是同一种组合")}</h3>
        <code>
          J(A,B) = |A ∩ B| / |A ∪ B|
          <br />R = 0.75Q′ + 0.25(1 − max J)
        </code>
        <p>
          {tr(
            "先选实用评分最高的候选，再逐次平衡实用性与食材集合差异。Q′=Q/100，J 使用主食材集合。相同配料只换烹饪技法时 J 仍为 1，当前模型无法表示这部分差异。食材很少时，允许同一组合采用不同技法。",
          )}
        </p>
      </section>
      <section>
        <span className="small-eyebrow">{tr("04 · 食品化学与研究边界")}</span>
        <h3>{tr("风味来自分子、用量，也来自烹饪过程")}</h3>
        <p>
          {tr(
            "Flavor Network 研究观察到不同菜系的化合物共现倾向不同，因此“共享香气分子越多越好吃”不适合作为通用定律。",
          )}
          <a
            href={scienceSources.network.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr("阅读原论文 ↗")}
          </a>
        </p>
        <p>
          {tr(
            "FlavorGraph 将食材、化合物和历史搭配关联起来学习表示。当前项目尚未接入该图谱，也没有浓度和感官阈值数据，因此不计算化学相似度。",
          )}
          <a
            href={scienceSources.graph.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr("阅读 FlavorGraph ↗")}
          </a>
        </p>
        <code>
          {tr("还原糖 + 氨基化合物 → 多步反应产物")}
          <br />
          {tr("（美拉德反应示意，非配平反应方程）")}
        </code>
        <p>
          {tr(
            "料理详情会根据食材类别和标注技法提示美拉德反应、蛋白质凝固、淀粉糊化等可能机制；没有实际温度、水分或组成测量，不能预测反应速率或熟度。",
          )}
          <a
            href={scienceSources.gastronomy.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr("计算美食学综述 ↗")}
          </a>
        </p>
        <p>
          {tr(
            "长期口味目前通过你允许保存的反馈提供给模型，尚未训练个人口味模型，也未把一次评分当成化学或营养证据。",
          )}
        </p>
      </section>
    </div>
  );
}

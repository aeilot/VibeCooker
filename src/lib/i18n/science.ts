export const scienceEnglish: Record<string, string> = {
  "食材齐备率 A": "Ingredient availability A",
  "时间余量 E": "Time headroom E",
  "操作简洁度 C": "Simplicity C",
  搭配原理与计算: "Pairing science and calculations",
  "这份搭配，怎么算、为什么？": "Why this pairing? Let’s look at the numbers.",
  "演示方案也使用下列真实公式，但方案本身未验证，分数只用于展示计算。":
    "Demo recipes use the real formulas below, but the recipes are unverified. These scores demonstrate the calculation only.",
  "程序按生成时的厨房设置计算，权重是产品启发式；分数衡量实用性，不代表美味概率、营养评价或安全结论。":
    "Calculated from your kitchen settings at generation time. Weights are product heuristics. Scores describe practicality, not taste probability, nutritional value or food safety.",
  这份用到: "Used in this option",
  留给下次: "Save for another meal",
  本次选择的食材均在方案中: "All selected ingredients appear in this option",
  还需确认: "Still to confirm",
  "/100 · 查看计算明细": "/100 · see the calculation",
  "− 2)/6)。主食材不含已识别的调味料；按名称和别名匹配，未核实实际库存克数。":
    "− 2)/6). Known seasonings are excluded from the main-ingredient count. Matching uses names and aliases; actual quantities have not been verified.",
  "当前人数、时间或已知忌口检查未通过，评分归零。请重新生成。":
    "This option does not meet the current serving, time or known dietary checks. Its score is zero. Please generate again.",
  相关的食品化学机制: "Relevant food chemistry",
  "条件推断 · 未做检测": "Conditional explanation · not measured",
  "先挑合适的食材子集，再设计做法，最后比较不同选项。拥有的食材是可选资源，不是每道菜都必须完成的清单。":
    "Choose a suitable subset of ingredients, design a method, then compare options. Your ingredients are possibilities, not a checklist every dish must use.",
  "01 · 组合优化": "01 · COMBINATIONS",
  "一份冰箱，可以有很多条路线": "One fridge, many lovely possibilities",
  "以 1–4 种主食材为例，你当前的":
    "For subsets of 1–4 main ingredients, your current ",
  种主食材共有: " main ingredients allow ",
  "个理论子集。实际由模型提出 6 或 9 个候选，不会穷举，也不声称找到了全局最优解。调味料另计，实用菜谱可超过 4 种主食材。":
    " theoretical subsets. The model proposes 6 or 9 options without exhaustive search or a claim of global optimality. Seasonings are separate; practical recipes may use more than 4 main ingredients.",
  "例如番茄、鸡蛋、面条，可以分别考虑番茄鸡蛋、番茄面、鸡蛋面，或一道单食材料理；这些是备选路线，并非一桌同时制作的菜。":
    "With tomato, egg and noodles, consider tomato and egg, tomato noodles, egg noodles, or a single-ingredient dish. These are alternatives, not a menu you must cook all at once.",
  "02 · 可复算评分": "02 · REPRODUCIBLE SCORING",
  "先判断做不做得成，再比较方便程度":
    "Check feasibility, then compare convenience",
  "A = 所需食材中已拥有的种类数 ÷ 所需种类数。未选中的油盐不会被默认当作已有。":
    "A = available required ingredients ÷ all required ingredients. Oil and salt are not assumed available unless selected.",
  "E = max(0, 1 − 预计耗时 ÷ 可用时间)。":
    "E = max(0, 1 − estimated time ÷ available time).",
  "C = max(0, 1 − max(0, 主食材种数 − 2)/6)。这是鼓励简单组合的产品规则。":
    "C = max(0, 1 − max(0, number of main ingredients − 2)/6). This is a product rule that favors simpler combinations.",
  "份数、时间或已知忌口检查失败时 Q=0。权重未从实验或用户反馈中拟合；分数只用于实用排序。没有核实克数、预算或全量过敏原信息。":
    "Q=0 if serving, time or known dietary checks fail. Weights have not been fitted to experiments or feedback. Scores rank practicality only. Quantities, cost and comprehensive allergen information have not been verified.",
  "03 · 多样性排序": "03 · DIVERSITY",
  避免六个选项都是同一种组合: "Six options, more than one combination",
  "先选实用评分最高的候选，再逐次平衡实用性与食材集合差异。Q′=Q/100，J 使用主食材集合。相同配料只换烹饪技法时 J 仍为 1，当前模型无法表示这部分差异。食材很少时，允许同一组合采用不同技法。":
    "Start with the highest practical score, then balance practicality against ingredient-set differences. Q′=Q/100; J compares main-ingredient sets. Changing only the cooking method leaves J=1, a difference this model cannot represent. With few ingredients, the same combination may use different methods.",
  "04 · 食品化学与研究边界": "04 · CHEMISTRY & LIMITATIONS",
  "风味来自分子、用量，也来自烹饪过程":
    "Flavor depends on molecules, quantities and process",
  "Flavor Network 研究观察到不同菜系的化合物共现倾向不同，因此“共享香气分子越多越好吃”不适合作为通用定律。":
    "Flavor Network found different compound-sharing patterns across cuisines. More shared aroma compounds is not a universal rule for better taste.",
  "阅读原论文 ↗": "Read the original paper ↗",
  "FlavorGraph 将食材、化合物和历史搭配关联起来学习表示。当前项目尚未接入该图谱，也没有浓度和感官阈值数据，因此不计算化学相似度。":
    "FlavorGraph learns representations from relationships among ingredients, compounds and historical pairings. This app has not integrated the graph and lacks concentration and sensory-threshold data, so it does not calculate chemical similarity.",
  "阅读 FlavorGraph ↗": "Read FlavorGraph ↗",
  "还原糖 + 氨基化合物 → 多步反应产物":
    "Reducing sugars + amino compounds → multi-step reaction products",
  "（美拉德反应示意，非配平反应方程）":
    "(Maillard reaction schematic, not a balanced equation)",
  "料理详情会根据食材类别和标注技法提示美拉德反应、蛋白质凝固、淀粉糊化等可能机制；没有实际温度、水分或组成测量，不能预测反应速率或熟度。":
    "Recipe details explain possible mechanisms such as Maillard reactions, protein coagulation and starch gelatinization based on ingredient categories and the stated method. Without measured temperature, moisture or composition, reaction rates and doneness cannot be predicted.",
  "计算美食学综述 ↗": "Computational gastronomy review ↗",
  "长期口味目前通过你允许保存的反馈提供给模型，尚未训练个人口味模型，也未把一次评分当成化学或营养证据。":
    "Only feedback you allow us to remember is given to the model. No personal taste model has been trained, and a meal rating is not chemical or nutritional evidence.",
  "计算美食学综述 · 2024": "Computational gastronomy review · 2024",
  "Texas A&M · 美拉德反应": "Texas A&M · Maillard reaction",
  "IFST · 蛋白质凝固": "IFST · protein coagulation",
  "American Society of Baking · 淀粉糊化":
    "American Society of Baking · starch gelatinization",
  蛋白质变性与凝固: "Protein denaturation and coagulation",
  "加热可使部分蛋白质展开、聚集，改变结构与口感；持续加热还可能引起收缩和失水。":
    "Heat can unfold and aggregate some proteins, changing structure and texture. Continued heating may cause contraction and moisture loss.",
  "这是按食材类别触发的一般机制；不同蛋白质行为不同，不能据此判断熟度或食品安全。":
    "This general mechanism is suggested by ingredient category. Proteins behave differently; it does not establish doneness or food safety.",
  美拉德反应与表面褐变: "Maillard reaction and surface browning",
  "还原糖与氨基化合物参与一系列反应，可能产生褐色物质和烘烤香气。":
    "Reducing sugars and amino compounds participate in reactions that may produce brown pigments and roasted aromas.",
  "没有测量表面温度、含水量或反应底物，因此这里只解释可能的机制，不预测香气或反应速率。":
    "Surface temperature, moisture and reactants have not been measured. This explains a possible mechanism without predicting aromas or reaction rates.",
  淀粉糊化与吸水: "Starch gelatinization and water absorption",
  "淀粉在有足够水分并加热时，颗粒吸水膨胀、结构改变，影响软化和增稠。":
    "With enough water and heat, starch granules absorb water and swell, changing structure, softness and thickening behavior.",
  "规划水量和加热顺序时，需要考虑食材是否需要吸水，以及它此前是否已经煮熟。":
    "Plan water and heating order around whether the ingredient needs to absorb water and whether it has already been cooked.",
  "米饭、面包等可能已糊化；这里只提示相关机制，不计算吸水量或宣称这一步一定再次发生糊化。":
    "Rice or bread may already contain gelatinized starch. This note does not calculate absorption or claim that gelatinization will necessarily happen again.",
  风味是配比与过程的共同结果: "Flavor emerges from proportions and process",
  "食材名称和共存关系能提供搭配线索，但风味还受用量、气味阈值、温度、质地和个人经验影响。":
    "Ingredient names and co-occurrence offer pairing clues, but quantity, aroma thresholds, temperature, texture and personal experience also shape flavor.",
  "这份方案缺少足够的加热与组成信息，目前不对具体化学反应作判断。":
    "This recipe lacks sufficient heating and composition information to infer a specific reaction.",
  "未接入分子组成或浓度数据，不能计算化学相似度。":
    "Molecular composition and concentration data are not available, so chemical similarity cannot be calculated.",
};

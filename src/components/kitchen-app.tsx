"use client";

import { useI18n } from "@/components/i18n-provider";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookHeart,
  Camera,
  Check,
  ChefHat,
  ChevronDown,
  CircleHelp,
  Clock3,
  CookingPot,
  Heart,
  KeyRound,
  Leaf,
  LoaderCircle,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Timer,
  Trash2,
  Upload,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { z } from "zod";
import {
  categories,
  ingredientEmoji,
  matchesIngredient,
  pantry,
} from "@/lib/catalog";
import { providers, providerSchema } from "@/lib/providers";
import {
  applyRevision,
  demoFeedback,
  makeDemoRecipes,
  validateRecipe,
} from "@/lib/cooking";
import {
  defaultProfile,
  feedbackResponseSchema,
  memorySchema,
  profileSchema,
  recipeSchema,
  sessionSchema,
  type CookingSession,
  type Credentials,
  type HistoryEntry,
  type KitchenProfile,
  type Memory,
  type Recipe,
  type Trace,
} from "@/lib/types";
import { Dialog } from "./dialog";
import { CustomSelect } from "./custom-select";
import { FoodArt, PotMascot } from "./food-art";
import { RecipeScience, SciencePrimer } from "./pairing-science";
import { analyzeRecipe, rankRecipes, type PairingContext } from "@/lib/pairing";

type View = "home" | "library" | "settings" | "cooking";
const STORAGE_KEY = "vibecooker.kitchen.v1";
const savedSchema = z.object({
  selected: z.array(z.string().min(1).max(40)).max(40),
  profile: profileSchema,
  memories: z.array(memorySchema).max(50),
  history: z
    .array(
      z.object({
        id: z.string(),
        recipe: recipeSchema,
        rating: z.number().min(1).max(5),
        note: z.string(),
        salt: z.string(),
        at: z.string(),
        source: z.enum(["demo", "ai"]),
      }),
    )
    .max(100),
  session: sessionSchema.nullable(),
  recipes: z.array(recipeSchema).max(9),
  pairingContext: z
    .object({ ingredients: z.array(z.string()), profile: profileSchema })
    .optional(),
  recipeSource: z.enum(["demo", "ai"]),
  // Accept old provider identifiers to migrate settings without losing cooking records.
  provider: z.enum(["openrouter", "deepseek", "openai", "anthropic", "google"]),
  model: z.string().max(180),
});
const photoSchema = z.object({
  ingredients: z.array(
    z.object({ name: z.string(), confidence: z.enum(["较确定", "需确认"]) }),
  ),
  note: z.string(),
});

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

async function preparePhoto(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error(
      "请选择 JPG、PNG 或 WebP 照片。iPhone 可直接使用相机拍摄。",
    );
  if (file.size > 15 * 1024 * 1024) throw new Error("照片请小于 15 MB。");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1500 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("当前浏览器无法处理照片，请手动选择食材。");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    bitmap.close();
  }
}

export function KitchenApp() {
  const { locale, setLocale, t: tr } = useI18n();
  const [view, setView] = useState<View>("home");
  const [selected, setSelected] = useState<string[]>(["番茄", "鸡蛋", "面条"]);
  const [profile, setProfile] = useState<KitchenProfile>(defaultProfile);
  const [category, setCategory] = useState("全部");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);
  const [custom, setCustom] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pairingContext, setPairingContext] = useState<PairingContext>({
    ingredients: ["番茄", "鸡蛋", "面条"],
    profile: defaultProfile,
  });
  const [scienceOpen, setScienceOpen] = useState(false);
  const [recipeSource, setRecipeSource] = useState<"demo" | "ai">("demo");
  const [trace, setTrace] = useState<Trace[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [session, setSession] = useState<CookingSession | null>(null);
  const [credentials, setCredentials] = useState<Credentials>({
    provider: "openrouter",
    model: "",
    apiKey: "",
  });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<
    "plan" | "photo" | "feedback" | "test" | null
  >(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [detail, setDetail] = useState<Recipe | null>(null);
  const [detailSource, setDetailSource] = useState<"demo" | "ai">("demo");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photo, setPhoto] = useState("");
  const [detected, setDetected] = useState<z.infer<typeof photoSchema> | null>(
    null,
  );
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(4);
  const [salt, setSalt] = useState("刚刚好");
  const [note, setNote] = useState("");
  const [remember, setRemember] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [tested, setTested] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{
    kind: "pending" | "success" | "error" | "cancelled";
    message: string;
  } | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasKey = Boolean(credentials.apiKey.trim() && credentials.model.trim());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const result = savedSchema.safeParse(JSON.parse(raw));
        if (result.success) {
          const s = result.data;
          setSelected(s.selected);
          setProfile(s.profile);
          setMemories(s.memories);
          setHistory(s.history);
          setSession(s.session);
          setRecipes(s.recipes);
          setPairingContext(
            s.pairingContext ?? { ingredients: s.selected, profile: s.profile },
          );
          setRecipeSource(s.recipeSource);
          const provider = providerSchema.safeParse(s.provider);
          setCredentials({
            provider: provider.success ? provider.data : "openrouter",
            model: provider.success ? s.model : "",
            apiKey: "",
          });
        } else setStorageError("旧的厨房记录格式无法读取，已恢复默认设置。");
      }
    } catch {
      setStorageError(
        "浏览器无法读取厨房记录。当前仍可使用，刷新后可能无法恢复。",
      );
    }
    setReady(true);
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selected,
          profile,
          memories,
          history,
          session,
          recipes,
          pairingContext,
          recipeSource,
          provider: credentials.provider,
          model: credentials.model,
        }),
      );
    } catch {
      setStorageError(
        "本机存储空间不足或已禁用。当前操作仍有效，但刷新后可能丢失进度。",
      );
    }
  }, [
    selected,
    profile,
    memories,
    history,
    session,
    recipes,
    pairingContext,
    recipeSource,
    credentials.provider,
    credentials.model,
    ready,
  ]);

  useEffect(() => {
    if (!session?.timerEnd) return;
    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [session?.timerEnd]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);

  function navigate(next: View) {
    setView(next);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function updateProfile(patch: Partial<KitchenProfile>) {
    setProfile((p) => ({ ...p, ...patch }));
  }
  function toggleIngredient(name: string) {
    setSelected((previous) =>
      previous.includes(name)
        ? previous.filter((n) => n !== name)
        : previous.length < 40
          ? [...previous, name]
          : previous,
    );
  }
  function addCustom() {
    const names = custom
      .split(/[，,、\n]/)
      .map((s) => s.trim().slice(0, 40))
      .filter(Boolean);
    if (!names.length) return;
    setSelected((s) => [...new Set([...s, ...names])].slice(0, 40));
    setCustom("");
  }
  async function requestAgent(action: string, data?: unknown) {
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeout =
      action === "test"
        ? window.setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, 20_000)
        : null;
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credentials.apiKey.trim()}`,
          "x-ai-provider": credentials.provider,
          "x-ai-model": credentials.model.trim(),
          "x-ui-locale": locale,
        },
        body: JSON.stringify({ action, data }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "请求没有完成，请再试一次。");
      return result;
    } catch (e) {
      if (timedOut)
        throw new Error(
          "连接测试超时（20 秒）。请检查网络或稍后重试，也可以切换模型或提供商。",
        );
      if (e instanceof SyntaxError)
        throw new Error("服务返回了无法读取的响应，请稍后重试。");
      if (e instanceof TypeError)
        throw new Error("无法连接本站服务，请检查网络和本地服务是否正常运行。");
      throw e;
    } finally {
      if (timeout !== null) window.clearTimeout(timeout);
    }
  }
  async function runConnectionTest() {
    if (busy) return;
    if (!hasKey) {
      setTestFeedback({
        kind: "error",
        message: "请先填写模型 ID 和 API Key，再测试连接。",
      });
      return;
    }
    setBusy("test");
    setTested(false);
    setError("");
    setTestFeedback({
      kind: "pending",
      message: `正在连接 ${providers[credentials.provider].name}，测试模型 ${credentials.model.trim()}。最长约 20 秒，可随时取消。`,
    });
    try {
      const result = await requestAgent("test");
      if (result.ok !== true)
        throw new Error("没有收到有效的连接确认，请重试。");
      setTested(true);
      setTestFeedback({
        kind: "success",
        message:
          "文本连接成功，可以回到厨房开始了。工具调用和图片能力会在使用对应功能时检查。",
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setTestFeedback({
          kind: "cancelled",
          message: "已取消连接测试，可以修改配置后重新测试。",
        });
      } else {
        setTestFeedback({
          kind: "error",
          message: e instanceof Error ? e.message : "连接测试失败，请重试。",
        });
      }
    } finally {
      setBusy(null);
    }
  }
  function showRequestError(e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      setNotice("已取消，原有进度保留。");
      return;
    }
    setError(e instanceof Error ? e.message : "请求没有完成，请稍后再试。");
  }
  async function generate() {
    if (!selected.length) {
      setError("先选几样家里有的食材吧。");
      return;
    }
    if (credentials.apiKey && !credentials.model.trim()) {
      setError("还需要在「我的厨房」填写模型 ID。");
      return;
    }
    setError("");
    setBusy("plan");
    setTrace([]);
    try {
      if (hasKey) {
        const result = await requestAgent("plan", {
          ingredients: selected,
          profile,
          memories,
        });
        setRecipes(z.array(recipeSchema).min(6).max(9).parse(result.recipes));
        setTrace(result.trace);
        setRecipeSource("ai");
      } else {
        const demo = makeDemoRecipes(selected, profile);
        if (!demo.length)
          throw new Error("所选食材与忌口冲突，请修改食材或检查忌口设置。");
        setRecipes(rankRecipes(demo, { ingredients: selected, profile }));
        setRecipeSource("demo");
        setTrace([
          {
            label: "演示模式",
            detail:
              "使用本地固定模板，无模型调用。连接自己的模型可生成真实专属料理。",
          },
        ]);
      }
      setPairingContext({
        ingredients: [...selected],
        profile: { ...profile },
      });
      setTimeout(
        () =>
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        80,
      );
    } catch (e) {
      showRequestError(e);
    } finally {
      setBusy(null);
    }
  }
  function startCooking(recipe: Recipe, source: "demo" | "ai") {
    if (session) {
      setDetail(null);
      navigate("cooking");
      setNotice("已返回进行中的料理。完成或结束这次记录后，可以开启下一餐。");
      return;
    }
    const validation = validateRecipe(recipe, {
      ...profile,
      minutes: Math.max(profile.minutes, recipe.minutes),
    });
    if (!validation.valid) {
      setError(
        `这份料理与当前厨房设置不符：${validation.issues.join("、")}。请重新生成。`,
      );
      setDetail(null);
      return;
    }
    setSession({
      recipe,
      currentStep: 0,
      completedIds: [],
      observations: [],
      timerEnd: null,
      version: 1,
      source,
      constraints: { ...profile },
    });
    setDetail(null);
    navigate("cooking");
  }
  async function loadPhoto(file?: File) {
    if (!file) return;
    setError("");
    setDetected(null);
    setConfirmed([]);
    try {
      setPhoto(await preparePhoto(file));
      setPhotoOpen(true);
    } catch (e) {
      showRequestError(e);
    }
  }
  async function identifyPhoto() {
    if (!hasKey) {
      setPhotoOpen(false);
      navigate("settings");
      setNotice("连接支持视觉识别的模型后，再回到拍照入口识别这张照片。");
      return;
    }
    setBusy("photo");
    setError("");
    try {
      const result = photoSchema.parse(
        await requestAgent("photo", { image: photo }),
      );
      setDetected(result);
      setConfirmed(
        result.ingredients
          .filter((i) => i.confidence === "较确定")
          .map((i) => i.name),
      );
    } catch (e) {
      showRequestError(e);
    } finally {
      setBusy(null);
    }
  }
  function confirmPhoto() {
    setSelected((s) => [...new Set([...s, ...confirmed])].slice(0, 40));
    setPhotoOpen(false);
    setNotice(`已把 ${confirmed.length} 种确认过的食材放进冰箱。`);
    setPhoto("");
    setDetected(null);
  }
  async function sendFeedback(text = feedbackText) {
    if (!session || !text.trim() || busy) return;
    if (session.source === "ai" && !hasKey) {
      setNotice("进度已保留。请重新填入 API Key 后继续调整。");
      navigate("settings");
      return;
    }
    setBusy("feedback");
    setError("");
    try {
      const response =
        session.source === "demo"
          ? demoFeedback(text)
          : feedbackResponseSchema.parse(
              (await requestAgent("feedback", { session, text })).feedback,
            );
      const adjusted = applyRevision(session, response);
      setSession({
        ...adjusted,
        observations: [
          ...session.observations,
          { text, reply: response.reply, at: new Date().toISOString() },
        ].slice(-60),
      });
      setFeedbackText("");
    } catch (e) {
      showRequestError(e);
    } finally {
      setBusy(null);
    }
  }
  function completeStep() {
    if (!session || busy) return;
    const step = session.recipe.steps[session.currentStep];
    if (!step) return;
    const completedIds = [...new Set([...session.completedIds, step.id])];
    setSession({
      ...session,
      completedIds,
      currentStep: session.currentStep + 1,
      timerEnd: null,
    });
    if (session.currentStep + 1 === session.recipe.steps.length) {
      setRatingOpen(true);
      setRating(4);
      setSalt("刚刚好");
      setNote("");
      setRemember(false);
    }
  }
  function saveRating() {
    if (!session) return;
    const at = new Date().toISOString();
    setHistory((h) =>
      [
        {
          id: crypto.randomUUID(),
          recipe: session.recipe,
          rating,
          note,
          salt,
          at,
          source: session.source,
        },
        ...h,
      ].slice(0, 100),
    );
    if (remember && note.trim())
      setMemories((m) =>
        [
          ...m,
          { id: crypto.randomUUID(), text: note.trim(), createdAt: at },
        ].slice(-50),
      );
    setSession(null);
    setRatingOpen(false);
    navigate("library");
    setNotice("这一餐，已经好好收进料理本了。♡");
  }
  const filteredPantry = pantry.filter(
    (p) =>
      (category === "全部" || p.category === category) &&
      matchesIngredient(p, search),
  );
  const currentStep = session?.recipe.steps[session.currentStep];
  const customIngredients = selected.filter(
    (s) => !pantry.some((p) => p.name === s),
  );

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label={tr("VibeCooker 首页")}
        >
          <span className="brand-icon">
            <CookingPot size={25} strokeWidth={1.7} />
          </span>
          <span>
            Vibe<span className="brand-light">Cooker</span>
            <small>{tr("把日子，煮成喜欢的样子")}</small>
          </span>
        </button>
        <nav className="main-nav" aria-label={tr("主导航")}>
          <button
            className={view === "home" ? "active" : ""}
            onClick={() => navigate("home")}
          >
            <CookingPot size={16} />
            {tr("今晚吃什么")}
          </button>
          <button
            className={view === "library" ? "active" : ""}
            onClick={() => navigate("library")}
          >
            <BookHeart size={16} />
            {tr("我的料理本")}
            {history.length > 0 && (
              <span className="nav-count">{history.length}</span>
            )}
          </button>
          <button
            className={view === "settings" ? "active" : ""}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={16} />
            {tr("我的厨房")}
          </button>
        </nav>
        <div className="language-switch">
          <CustomSelect
            label="Language / 语言"
            value={locale}
            onChange={setLocale}
            options={[
              { value: "zh-CN", label: "简体中文" },
              { value: "en", label: "English" },
            ]}
          />
        </div>
        <button
          className={`connection-pill ${hasKey ? "connected" : ""}`}
          aria-label={tr(hasKey ? "自带模型已配置" : "连接我的 AI")}
          title={tr(hasKey ? "自带模型已配置" : "连接我的 AI")}
          onClick={() => navigate("settings")}
        >
          <span className="status-dot" />
          <span className="connection-label">
            {tr(hasKey ? "自带模型已配置" : "连接我的 AI")}
          </span>
          <Settings className="connection-gear" size={17} aria-hidden="true" />
        </button>
      </header>

      {storageError && (
        <div className="global-alert" role="alert">
          {tr(storageError)}
          <button
            onClick={() => setStorageError("")}
            aria-label={tr("关闭存储提示")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {tr(notice)}
          <button onClick={() => setNotice("")} aria-label={tr("关闭提示")}>
            <X size={14} />
          </button>
        </div>
      )}
      {error && !photoOpen && (
        <div className="global-alert error" role="alert">
          {tr(error)}
          <button onClick={() => setError("")} aria-label={tr("关闭错误提示")}>
            <X size={16} />
          </button>
        </div>
      )}

      <main>
        {view === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span /> LITTLE INGREDIENTS, LOVELY POSSIBILITIES
                </div>
                <h1>
                  {tr("冰箱里的小日常，")}
                  <br />
                  {tr("也能有")}
                  <span className="hand-underline">
                    {tr("好滋味")}
                    <svg viewBox="0 0 210 14" aria-hidden="true">
                      <path d="M4 8Q99-1 203 6M19 12Q114 5 189 10" />
                    </svg>
                  </span>
                  {tr("。")}
                </h1>
                <p>
                  {tr("选几样现有食材，说说今天的心情。")}
                  <br />
                  {tr("你的 AI 料理搭子，陪你把这一餐做好。")}
                </p>
                <div className="hero-tags">
                  <span>
                    <Sprout size={14} />
                    {tr("从现有食材出发")}
                  </span>
                  <span>
                    <WandSparkles size={14} />
                    {tr("也可以发明新菜")}
                  </span>
                  <span>
                    <Heart size={14} />
                    {tr("越做，越懂你")}
                  </span>
                </div>
              </div>
              <div className="hero-illustration">
                <span className="art-handwriting">
                  a little love, a little flavor{" "}
                  <svg viewBox="0 0 70 50" aria-hidden="true">
                    <path d="M2 3q52-5 47 32m-9-6 9 9 9-11" />
                  </svg>
                </span>
                <FoodArt hero />
                <span className="art-sticker">
                  <Sparkles size={14} />
                  {tr("好好吃饭，就是小幸福")}
                </span>
                <span className="art-caption">
                  {tr("给平凡食材的一点点魔法 ✧")}
                </span>
              </div>
            </section>

            {session && (
              <button
                className="resume-banner"
                onClick={() => navigate("cooking")}
              >
                <CookingPot size={20} />
                <span>
                  {tr("你的「")}
                  {tr(session.recipe.title)}
                  {tr("」还在等你")}
                  <span>
                    {tr("已完成")}
                    {session.completedIds.length}/{session.recipe.steps.length}
                    {tr("步 · 进度保存在本机")}
                  </span>
                </span>
                <span>
                  {tr("继续做饭")}
                  <ArrowRight size={16} />
                </span>
              </button>
            )}

            <div className="kitchen-layout">
              <div className="planner-panel">
                <section className="ingredients-section">
                  <div className="section-heading">
                    <div className="heading-with-number">
                      <span className="step-number">01</span>
                      <div>
                        <h2>{tr("看看，家里有什么？")}</h2>
                        <p>{tr("不用特意买菜，手边的食材就很好。")}</p>
                      </div>
                    </div>
                    <button
                      className="text-button camera-link"
                      onClick={() => {
                        setPhotoOpen(true);
                        setError("");
                      }}
                    >
                      <Camera size={17} />
                      {tr("拍照识别")}
                      <small>{tr("更轻松")}</small>
                    </button>
                  </div>
                  <div className="pantry-toolbar">
                    <div
                      className="category-tabs"
                      role="group"
                      aria-label={tr("食材分类")}
                    >
                      {categories.map((c) => (
                        <button
                          key={c}
                          className={category === c ? "active" : ""}
                          aria-pressed={category === c}
                          onClick={() => {
                            setCategory(c);
                            setSearch("");
                            setVisibleCount(24);
                          }}
                        >
                          {tr(c)}
                        </button>
                      ))}
                    </div>
                    <label className="ingredient-search">
                      <Search size={15} />
                      <input
                        aria-label={tr("搜索食材")}
                        placeholder={tr(
                          "搜索全部食材，如：排骨、金针菇、西红柿…",
                        )}
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setCategory("全部");
                          setVisibleCount(24);
                        }}
                      />
                    </label>
                  </div>
                  <div className="ingredient-grid">
                    {filteredPantry.slice(0, visibleCount).map((item) => (
                      <button
                        key={item.name}
                        className={`ingredient-tile ${item.color} ${selected.includes(item.name) ? "selected" : ""}`}
                        aria-pressed={selected.includes(item.name)}
                        disabled={
                          selected.length >= 40 && !selected.includes(item.name)
                        }
                        onClick={() => toggleIngredient(item.name)}
                      >
                        <span className="ingredient-check">
                          {selected.includes(item.name) ? (
                            <Check size={11} />
                          ) : (
                            <Plus size={11} />
                          )}
                        </span>
                        <span className="ingredient-emoji" aria-hidden="true">
                          {item.emoji}
                        </span>
                        <span>{tr(item.name)}</span>
                      </button>
                    ))}
                    {filteredPantry.length === 0 && (
                      <p className="no-results">
                        {tr("还没找到「")}
                        {search}
                        {tr("」，可以在下面手动添加。")}
                      </p>
                    )}
                  </div>
                  <div className="pantry-browse-controls">
                    <span aria-live="polite">
                      {tr(
                        search.trim()
                          ? `找到 ${filteredPantry.length} 种食材`
                          : category === "全部"
                            ? `共 ${pantry.length} 种家常食材`
                            : `${category} · ${filteredPantry.length} 种`,
                      )}
                      <small>{tr("每次最多选 40 种")}</small>
                    </span>
                    <div>
                      {visibleCount < filteredPantry.length && (
                        <button
                          className="text-button"
                          onClick={() => setVisibleCount((n) => n + 24)}
                        >
                          {tr("展开更多（还有")}
                          {filteredPantry.length - visibleCount} {tr("种）")}
                          <ChevronDown size={13} />
                        </button>
                      )}
                      {visibleCount > 24 && (
                        <button
                          className="text-button"
                          onClick={() => setVisibleCount(24)}
                        >
                          {tr("收起食材")}
                        </button>
                      )}
                    </div>
                  </div>
                  <form
                    className="custom-ingredient"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addCustom();
                    }}
                  >
                    <Plus size={17} />
                    <input
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      maxLength={300}
                      placeholder={tr("还有别的？输入食材，用逗号分隔…")}
                      aria-label={tr("自定义食材")}
                    />
                    <button type="submit" disabled={!custom.trim()}>
                      {tr("添加")}
                    </button>
                  </form>
                  <div className="selected-tray">
                    <span>
                      {tr("我的小冰箱")}
                      <b>{selected.length}</b>
                    </span>
                    <div className="selected-chips">
                      {selected.map((name) => (
                        <button
                          key={name}
                          onClick={() => toggleIngredient(name)}
                          aria-label={tr(`移除${name}`)}
                        >
                          {ingredientEmoji(name)} {tr(name)}
                          <X size={11} />
                        </button>
                      ))}
                      {!selected.length && (
                        <span className="muted">
                          {tr("点一点上面的食材，把冰箱装起来。")}
                        </span>
                      )}
                    </div>
                    {selected.length > 0 && (
                      <button
                        className="clear-link"
                        onClick={() => setSelected([])}
                      >
                        {tr("清空")}
                      </button>
                    )}
                  </div>
                  {customIngredients.length > 0 && (
                    <p className="field-hint">
                      {tr("手动添加和照片确认的食材已一起放入小冰箱。")}
                    </p>
                  )}
                </section>

                <section className="preferences-section">
                  <div className="section-heading">
                    <div className="heading-with-number">
                      <span className="step-number">02</span>
                      <div>
                        <h2>{tr("今天，想怎么吃？")}</h2>
                        <p>{tr("一点小偏好，让这一餐更像你。")}</p>
                      </div>
                    </div>
                    <Leaf className="section-leaf" size={25} />
                  </div>
                  <div className="preference-top">
                    <div className="preference-group">
                      <label>
                        <Users size={15} />
                        {tr("几个人吃")}
                      </label>
                      <div className="stepper">
                        <button
                          aria-label={tr("减少人数")}
                          disabled={profile.people <= 1}
                          onClick={() =>
                            updateProfile({ people: profile.people - 1 })
                          }
                        >
                          <Minus size={14} />
                        </button>
                        <span>
                          {profile.people}
                          <small>
                            {locale === "en"
                              ? profile.people === 1
                                ? " serving"
                                : " servings"
                              : tr("人份")}
                          </small>
                        </span>
                        <button
                          aria-label={tr("增加人数")}
                          disabled={profile.people >= 8}
                          onClick={() =>
                            updateProfile({ people: profile.people + 1 })
                          }
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="preference-group time-group">
                      <label htmlFor="cooking-time">
                        <Clock3 size={15} />
                        {tr("可以花多久")}
                      </label>
                      <div className="time-controls">
                        <input
                          id="cooking-time"
                          type="range"
                          min={10}
                          max={120}
                          step={5}
                          value={profile.minutes}
                          onChange={(e) =>
                            updateProfile({ minutes: +e.target.value })
                          }
                        />
                        <span>
                          {profile.minutes}
                          <small>{tr("分钟")}</small>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="preference-group taste-group">
                    <label>
                      <Heart size={15} />
                      {tr("想要的味道")}
                    </label>
                    <div className="choice-chips">
                      {[
                        "清淡鲜香",
                        "浓郁下饭",
                        "微微辣",
                        "酸甜开胃",
                        "温暖治愈",
                      ].map((t) => (
                        <button
                          key={t}
                          className={profile.taste === t ? "chosen" : ""}
                          aria-pressed={profile.taste === t}
                          onClick={() => updateProfile({ taste: t })}
                        >
                          {tr(
                            t === "清淡鲜香"
                              ? "🌿"
                              : t === "浓郁下饭"
                                ? "🍚"
                                : t === "微微辣"
                                  ? "🌶️"
                                  : t === "酸甜开胃"
                                    ? "🍋"
                                    : "☀️",
                          )}{" "}
                          {tr(t)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="preference-group equipment-group">
                    <label>
                      <CookingPot size={15} />
                      {tr("手边的厨具")}
                    </label>
                    <div className="choice-chips equipment">
                      {[
                        "炒锅",
                        "煮锅",
                        "平底锅",
                        "烤箱",
                        "空气炸锅",
                        "微波炉",
                      ].map((t) => (
                        <button
                          key={t}
                          className={
                            profile.equipment.includes(t) ? "chosen" : ""
                          }
                          aria-pressed={profile.equipment.includes(t)}
                          onClick={() => {
                            const eq = profile.equipment.includes(t)
                              ? profile.equipment.filter((e) => e !== t)
                              : [...profile.equipment, t];
                            if (eq.length) updateProfile({ equipment: eq });
                          }}
                        >
                          {profile.equipment.includes(t) && <Check size={12} />}{" "}
                          {tr(t)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="restriction-input">
                    <ShieldCheck size={16} />
                    <input
                      value={profile.restrictions}
                      onChange={(e) =>
                        updateProfile({ restrictions: e.target.value })
                      }
                      placeholder={tr(
                        "忌口或过敏食材？请在这里告诉我，如：花生、虾",
                      )}
                      maxLength={300}
                      aria-label={tr("忌口或过敏食材")}
                    />
                  </label>
                  <div className="option-count-control">
                    <div>
                      <strong>{tr("想看几份料理灵感？")}</strong>
                      <small>{tr("每份只选合适的食材，不用全部用完。")}</small>
                    </div>
                    <div
                      className="choice-chips"
                      role="group"
                      aria-label={tr("候选方案数量")}
                    >
                      {([6, 9] as const).map((count) => (
                        <button
                          key={count}
                          aria-label={
                            locale === "en" ? `${count} options` : `${count} 份`
                          }
                          className={
                            profile.optionCount === count ? "chosen" : ""
                          }
                          aria-pressed={profile.optionCount === count}
                          onClick={() => updateProfile({ optionCount: count })}
                        >
                          {count}
                          {tr("份")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="creativity-switch">
                    <div>
                      <span className="mini-sparkle">
                        <WandSparkles size={19} />
                      </span>
                      <span>
                        <strong>{tr("给这一餐一点新意")}</strong>
                        <small>{tr("允许原创搭配，一起发明一道新菜")}</small>
                      </span>
                    </div>
                    <button
                      className={`switch ${profile.creativity === "creative" ? "on" : ""}`}
                      role="switch"
                      aria-checked={profile.creativity === "creative"}
                      aria-label={tr("允许原创料理")}
                      onClick={() =>
                        updateProfile({
                          creativity:
                            profile.creativity === "creative"
                              ? "balanced"
                              : "creative",
                        })
                      }
                    >
                      <span />
                    </button>
                  </div>
                  <button
                    className="primary-button generate-button"
                    onClick={generate}
                    disabled={Boolean(busy) || !ready}
                  >
                    {busy === "plan" ? (
                      <LoaderCircle className="spin" size={19} />
                    ) : (
                      <Sparkles size={19} />
                    )}{" "}
                    {tr(
                      busy === "plan"
                        ? "正在把食材变成灵感…"
                        : "帮我想想，今天吃什么",
                    )}
                    {!busy && <ArrowRight size={18} />}
                  </button>
                  <p className="under-button">
                    <KeyRound size={12} />
                    {tr(
                      hasKey
                        ? "使用你自己的模型 · Key 仅在本次会话使用"
                        : "当前为演示模式 · 连接自己的模型，开启专属料理",
                    )}
                    <button onClick={() => navigate("settings")}>
                      {tr("设置")}
                      <ArrowRight size={11} />
                    </button>
                  </p>
                  {busy === "plan" && (
                    <button
                      className="cancel-link"
                      onClick={() => abortRef.current?.abort()}
                    >
                      {tr("取消这次生成")}
                    </button>
                  )}
                </section>
              </div>

              <aside className="inspiration-sidebar">
                <div className="note-card">
                  <div className="note-kicker">
                    <span /> A LITTLE KITCHEN NOTE
                  </div>
                  <h3>
                    {tr("好吃的灵感，")}
                    <br />
                    {tr("常常就在手边。")}
                  </h3>
                  <p>
                    {tr("不必拥有一整个超市。")}
                    <br />
                    {tr("几样熟悉的食材，也能煮出")}
                    <br />
                    {tr("只属于你的新味道。")}
                  </p>
                  <div className="mascot-note">
                    <PotMascot />
                    <span>
                      {tr("你来掌勺，")}
                      <br />
                      {tr("我来出点子 ♡")}
                    </span>
                  </div>
                  <div className="note-bottom">
                    YOUR EVERYDAY COOKING COMPANION
                  </div>
                </div>
                <div className="how-it-works">
                  <span className="small-eyebrow">{tr("一顿饭的小旅程")}</span>
                  <div>
                    <span className="journey-icon">
                      <Sprout size={17} />
                    </span>
                    <p>
                      {tr("从冰箱出发")}
                      <small>{tr("选食材，或拍一张照片")}</small>
                    </p>
                  </div>
                  <span className="journey-line" />
                  <div>
                    <span className="journey-icon">
                      <WandSparkles size={17} />
                    </span>
                    <p>
                      {tr("找到你的那道菜")}
                      <small>{tr("家常做法，也可以是新发明")}</small>
                    </p>
                  </div>
                  <span className="journey-line" />
                  <div>
                    <span className="journey-icon">
                      <Heart size={17} />
                    </span>
                    <p>
                      {tr("边做，边聊，边调整")}
                      <small>{tr("把你的反馈变成下次的默契")}</small>
                    </p>
                  </div>
                </div>
                <div className="memory-note">
                  <BookHeart size={19} />
                  <p>
                    {tr(
                      memories.length
                        ? `已经记住你的 ${memories.length} 个小偏好`
                        : "每一次反馈，都是一点默契。",
                    )}
                    <small>
                      {tr(
                        memories.length
                          ? memories[memories.length - 1].text
                          : "做完后告诉我喜欢什么，下次就更懂你。",
                      )}
                    </small>
                  </p>
                </div>
              </aside>
            </div>

            <section
              className="recipe-results"
              ref={resultsRef}
              aria-live="polite"
            >
              <div className="results-heading">
                <div>
                  <span className="small-eyebrow">
                    MADE FOR YOUR LITTLE KITCHEN
                  </span>
                  <h2>
                    {tr(
                      recipes.length
                        ? "给今天的你，这几份灵感"
                        : "下一道拿手菜，就从这里开始",
                    )}
                  </h2>
                </div>
                {recipes.length > 0 && (
                  <span className="source-tag">
                    {tr(
                      recipeSource === "ai"
                        ? "由你的 AI 生成"
                        : "固定模板 · 流程演示",
                    )}
                  </span>
                )}
              </div>
              <div className="pairing-intro">
                <p>
                  {tr("每道菜都是一条备选路线，没用到的食材可以留给下一餐。")}
                  <small>
                    {tr("按食材齐备率、时间与简洁度计算，再分散相似组合。")}
                  </small>
                </p>
                <button
                  className="secondary-button"
                  onClick={() => setScienceOpen(true)}
                >
                  <Sparkles size={14} />
                  {tr("科学原理与计算模型")}
                </button>
              </div>
              {recipes.length ? (
                <>
                  <div className="recipe-grid">
                    {recipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        source={recipeSource}
                        analysis={analyzeRecipe(recipe, pairingContext)}
                        onClick={() => {
                          setDetail(recipe);
                          setDetailSource(recipeSource);
                        }}
                      />
                    ))}
                  </div>
                  <div className="agent-trace">
                    {trace.map((t, i) => (
                      <span key={i}>
                        <Check size={13} />
                        <strong>{tr(t.label)}</strong>
                        <span>{tr(t.detail)}</span>
                      </span>
                    ))}
                  </div>
                  {recipeSource === "ai" && (
                    <p className="field-hint">
                      {tr(
                        "AI 方案尚未实测。烹饪前请确认食材、调味料与过敏原；模型检查不能替代食品安全判断。",
                      )}
                    </p>
                  )}
                </>
              ) : (
                <div className="empty-inspiration">
                  <span className="empty-doodle">✧</span>
                  <p>
                    {tr("先装满你的小冰箱，剩下的交给灵感。")}
                    <small>
                      {tr("不需要已有菜谱，也能创造属于你的味道。")}
                    </small>
                  </p>
                  <ArrowDown size={20} className="empty-arrow" />
                </div>
              )}
            </section>
          </>
        )}

        {view === "settings" && (
          <section className="inner-page">
            <PageIntro
              eyebrow="YOUR KITCHEN, YOUR RULES"
              title={tr("我的厨房")}
              description={tr("带上自己的 AI，也带上你的小偏好。")}
            />
            <div className="settings-layout">
              <div className="settings-card">
                <div className="card-title">
                  <span className="setting-icon">
                    <KeyRound size={21} />
                  </span>
                  <div>
                    <h2>{tr("连接你的 AI 料理搭子")}</h2>
                    <p>{tr("BYOK · 使用你自己的模型和额度")}</p>
                  </div>
                </div>
                <div className="privacy-note">
                  <ShieldCheck size={17} />
                  <p>
                    {tr(
                      "Key 只保存在当前网页内存，刷新后需重新输入。请求会经本站服务端转发给所选模型提供商；Key 不写入数据库、日志或料理记录。照片也会发送给该提供商。",
                    )}
                  </p>
                </div>
                <div className="form-label">
                  {tr("模型提供商")}
                  <CustomSelect
                    label={tr("模型提供商")}
                    value={credentials.provider}
                    disabled={busy === "test"}
                    options={[
                      { value: "openrouter", label: "OpenRouter" },
                      { value: "deepseek", label: "DeepSeek" },
                    ]}
                    onChange={(provider) => {
                      setCredentials((c) => ({
                        ...c,
                        provider,
                        model: providers[provider].defaultModel,
                        apiKey: "",
                      }));
                      setTested(false);
                      setTestFeedback(null);
                    }}
                  />
                </div>
                <label className="form-label">
                  {tr("模型 ID")}
                  <input
                    aria-label={tr("模型 ID")}
                    disabled={busy === "test"}
                    value={credentials.model}
                    onChange={(e) => {
                      setCredentials((c) => ({ ...c, model: e.target.value }));
                      setTested(false);
                      setTestFeedback(null);
                    }}
                    placeholder={tr(
                      providers[credentials.provider].placeholder,
                    )}
                    maxLength={180}
                  />
                  <small>{tr(providers[credentials.provider].help)}</small>
                </label>
                <label className="form-label">
                  API Key
                  <input
                    aria-label="API Key"
                    disabled={busy === "test"}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={credentials.apiKey}
                    onChange={(e) => {
                      setCredentials((c) => ({ ...c, apiKey: e.target.value }));
                      setTested(false);
                      setTestFeedback(null);
                    }}
                    placeholder={tr("只在本次会话使用")}
                    maxLength={1024}
                  />
                </label>
                <div className="settings-actions">
                  <button
                    className="secondary-button"
                    disabled={Boolean(busy)}
                    onClick={runConnectionTest}
                  >
                    {busy === "test" ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : tested ? (
                      <Check size={16} />
                    ) : (
                      <RefreshCw size={16} />
                    )}{" "}
                    {tr(
                      busy === "test"
                        ? "正在测试连接…"
                        : tested
                          ? "文本连接成功"
                          : "测试连接",
                    )}
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      if (credentials.apiKey && !credentials.model.trim()) {
                        setError("请填写模型 ID。");
                        return;
                      }
                      navigate("home");
                    }}
                  >
                    {tr("回到小厨房")}
                    <ArrowRight size={16} />
                  </button>
                </div>
                {testFeedback && (
                  <div
                    className={`connection-feedback ${testFeedback.kind}`}
                    role={testFeedback.kind === "error" ? "alert" : "status"}
                    aria-live="polite"
                  >
                    <p>{tr(testFeedback.message)}</p>
                    {testFeedback.kind === "pending" && (
                      <button
                        className="text-button"
                        onClick={() => abortRef.current?.abort()}
                      >
                        {tr("取消测试")}
                      </button>
                    )}
                  </div>
                )}
                <button
                  className="clear-key"
                  disabled={!credentials.apiKey || busy === "test"}
                  onClick={() => {
                    setCredentials((c) => ({ ...c, apiKey: "" }));
                    setTested(false);
                    setTestFeedback(null);
                    setNotice("已从本次会话中移除 Key。");
                  }}
                >
                  {tr("移除本次 Key，使用演示模式")}
                </button>
              </div>
              <div className="settings-card memory-settings">
                <div className="card-title">
                  <span className="setting-icon">
                    <BookHeart size={21} />
                  </span>
                  <div>
                    <h2>{tr("我们的口味默契")}</h2>
                    <p>{tr("只有你明确选择记住，才会写进来。")}</p>
                  </div>
                </div>
                {memories.length ? (
                  <ul className="memory-list">
                    {memories.map((m) => (
                      <li key={m.id}>
                        <span>🌿</span>
                        <p>
                          {m.text}
                          <small>
                            {new Date(m.createdAt).toLocaleDateString(locale)}
                          </small>
                        </p>
                        <button
                          className="icon-button"
                          aria-label={tr(`删除偏好：${m.text}`)}
                          onClick={() =>
                            setMemories((s) => s.filter((i) => i.id !== m.id))
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="memory-empty">
                    <PotMascot />
                    <p>
                      {tr("还没有记录口味偏好。")}
                      <small>
                        {tr("完成一顿料理，告诉我你希望下次记住什么。")}
                      </small>
                    </p>
                  </div>
                )}
                <div className="local-note">
                  <CircleHelp size={15} />
                  <span>
                    {tr(
                      "食材、进度和料理本保存在本机浏览器。当前版本不支持跨设备同步。",
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {view === "library" && (
          <section className="inner-page">
            <PageIntro
              eyebrow="A LITTLE BOOK OF GOOD MEALS"
              title={tr("我的料理本")}
              description={tr("每一顿好好做的饭，都值得被记住。")}
            />
            {history.length ? (
              <div className="recipe-grid library-grid">
                {history.map((entry) => (
                  <div key={entry.id} className="history-card">
                    <RecipeCard
                      recipe={entry.recipe}
                      source={entry.source}
                      onClick={() => {
                        setDetail(entry.recipe);
                        setDetailSource(entry.source);
                      }}
                    />
                    <div className="history-note">
                      <div className="history-rating">
                        <span>
                          {"★".repeat(entry.rating)}
                          {"☆".repeat(5 - entry.rating)}
                        </span>
                        <time>
                          {new Date(entry.at).toLocaleDateString(locale)}
                        </time>
                      </div>
                      <p>{entry.note || tr("今天也好好吃饭了。")}</p>
                      <div className="history-note-bottom">
                        <small>
                          {tr("盐度：")}
                          {tr(entry.salt)}
                        </small>
                        <button
                          className="icon-button"
                          aria-label={tr(`删除${entry.recipe.title}的记录`)}
                          onClick={() =>
                            setHistory((h) =>
                              h.filter((e) => e.id !== entry.id),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="library-empty">
                <BookHeart size={38} strokeWidth={1.2} />
                <h2>{tr("第一道拿手菜，正在路上。")}</h2>
                <p>
                  {tr("做完一顿料理，给它一个评价，")}
                  <br />
                  {tr("它就会成为料理本里的第一份回忆。")}
                </p>
                <button
                  className="primary-button"
                  onClick={() => navigate("home")}
                >
                  {tr("去看看冰箱里有什么")}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
        )}

        {view === "cooking" && session && (
          <section className="inner-page cooking-page">
            <button className="back-link" onClick={() => navigate("home")}>
              <ArrowLeft size={15} />
              {tr("回到小厨房")}
            </button>
            <div className="cooking-heading">
              <div>
                <span className="small-eyebrow">
                  LET’S MAKE SOMETHING LOVELY
                </span>
                <h1>{tr(session.recipe.title)}</h1>
                <p>
                  {session.recipe.servings}
                  {tr("人份 · 约")}
                  {session.recipe.minutes} {tr("分钟 · 计划 v")}
                  {session.version}
                  <span className="source-tag">
                    {tr(
                      session.source === "demo"
                        ? "演示流程"
                        : "AI 料理方案 · 未经实测",
                    )}
                  </span>
                </p>
              </div>
              <PotMascot small />
            </div>
            {session.source === "demo" && (
              <div className="demo-notice">
                <CircleHelp size={17} />
                <span>
                  {tr(
                    "这是固定模板演示，不作为实际烹饪指导。连接模型后可生成针对食材的具体方案。",
                  )}
                </span>
              </div>
            )}
            <div className="cooking-layout">
              <div className="cooking-main">
                <div className="progress-label">
                  <span>{tr("这一餐的小进度")}</span>
                  <strong>
                    {session.completedIds.length} /{" "}
                    {session.recipe.steps.length}
                    {tr("步")}
                  </strong>
                </div>
                <div className="progress-track">
                  <div
                    style={{
                      width: `${(session.completedIds.length / session.recipe.steps.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="step-list">
                  {session.recipe.steps.map((step, i) => (
                    <div
                      key={step.id}
                      className={`step-list-item ${session.completedIds.includes(step.id) ? "done" : ""} ${i === session.currentStep ? "current" : ""}`}
                    >
                      <span>
                        {session.completedIds.includes(step.id) ? (
                          <Check size={14} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <p>{tr(step.title)}</p>
                      {i === session.currentStep && (
                        <small>{tr("正在做")}</small>
                      )}
                    </div>
                  ))}
                </div>
                {currentStep ? (
                  <article className="active-step">
                    <span className="small-eyebrow">
                      STEP {String(session.currentStep + 1).padStart(2, "0")}
                    </span>
                    <h2>{tr(currentStep.title)}</h2>
                    <p className="step-instruction">
                      {tr(currentStep.instruction)}
                    </p>
                    <div className="observation-cue">
                      <Leaf size={18} />
                      <div>
                        <strong>{tr("留意这个小信号")}</strong>
                        <p>{tr(currentStep.cue)}</p>
                      </div>
                    </div>
                    {currentStep.minutes > 0 && (
                      <div className="timer-panel">
                        <Timer size={21} />
                        <div>
                          <strong>
                            {session.timerEnd
                              ? formatTime(session.timerEnd - now)
                              : `${currentStep.minutes}:00`}
                          </strong>
                          <small role="status">
                            {tr(
                              session.timerEnd
                                ? session.timerEnd <= now
                                  ? "时间到了，请检查实际状态"
                                  : "计时中 · 时间不代表食材已熟"
                                : "参考计时 · 根据实际状态判断",
                            )}
                          </small>
                        </div>
                        <button
                          className="secondary-button"
                          onClick={() => {
                            setNow(Date.now());
                            setSession({
                              ...session,
                              timerEnd: session.timerEnd
                                ? null
                                : Date.now() + currentStep.minutes * 60_000,
                            });
                          }}
                        >
                          {tr(session.timerEnd ? "停止计时" : "开始计时")}
                        </button>
                      </div>
                    )}
                    <button
                      className="primary-button"
                      disabled={Boolean(busy)}
                      onClick={completeStep}
                    >
                      {tr("这一步完成了")}
                      <Check size={17} />
                    </button>
                  </article>
                ) : (
                  <article className="active-step cooking-finished">
                    <span>🎉</span>
                    <h2>{tr("这一餐，辛苦啦。")}</h2>
                    <p>{tr("花一点时间记下口味，下次就更合心意。")}</p>
                    <button
                      className="primary-button"
                      onClick={() => setRatingOpen(true)}
                    >
                      {tr("记录这次料理")}
                      <BookHeart size={17} />
                    </button>
                  </article>
                )}
                <details className="session-ingredients">
                  <summary>
                    {tr("这次的食材清单")}
                    <ChevronDown size={15} />
                  </summary>
                  <ul>
                    {session.recipe.ingredients.map((i, index) => (
                      <li key={index}>
                        <span>
                          {ingredientEmoji(i.name)} {tr(i.name)}
                        </span>
                        <span>{tr(i.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
                <button
                  className="end-session"
                  onClick={() => {
                    setRatingOpen(true);
                    setNote(tr("本次提前结束。"));
                    setRemember(false);
                  }}
                >
                  {tr("提前结束并记录本次料理")}
                </button>
              </div>
              <aside className="feedback-panel">
                <div className="feedback-title">
                  <span className="brand-icon">
                    <CookingPot size={21} />
                  </span>
                  <div>
                    <h2>{tr("我在旁边，随时都在")}</h2>
                    <p>{tr("告诉我锅里的变化，一起调整。")}</p>
                  </div>
                  <span className="status-dot" />
                </div>
                <div className="feedback-messages" aria-live="polite">
                  <div className="agent-message">
                    {tr(
                      "准备好啦。你可以说说当前的状态，或告诉我哪一步需要讲得更清楚。",
                    )}
                    {session.source === "demo" && (
                      <small>{tr("当前为演示模式，只记录反馈。")}</small>
                    )}
                  </div>
                  {session.observations.map((o, i) => (
                    <div className="message-pair" key={`${o.at}-${i}`}>
                      <div className="user-message">{o.text}</div>
                      <div className="agent-message">{tr(o.reply)}</div>
                    </div>
                  ))}
                  {busy === "feedback" && (
                    <div className="agent-message">
                      <LoaderCircle size={15} className="spin" />{" "}
                      {tr("正在读取现场，检查剩余步骤…")}
                    </div>
                  )}
                </div>
                <div className="feedback-quick-actions">
                  {["锅里有点干", "味道有点咸", "这一步没看懂"].map((t) => (
                    <button
                      key={t}
                      disabled={Boolean(busy) || !currentStep}
                      onClick={() => sendFeedback(tr(t))}
                    >
                      {tr(t)}
                    </button>
                  ))}
                </div>
                <form
                  className="feedback-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendFeedback();
                  }}
                >
                  <input
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={tr("说说现在的情况…")}
                    aria-label={tr("烹饪现场反馈")}
                    maxLength={1000}
                    disabled={!currentStep || Boolean(busy)}
                  />
                  <button
                    aria-label={tr("发送反馈")}
                    disabled={
                      !feedbackText.trim() || Boolean(busy) || !currentStep
                    }
                  >
                    <Send size={17} />
                  </button>
                </form>
                <p className="feedback-footnote">
                  <ShieldCheck size={12} />
                  {tr("已完成的步骤不会被重写")}
                </p>
                {busy === "feedback" && (
                  <button
                    className="cancel-link"
                    onClick={() => abortRef.current?.abort()}
                  >
                    {tr("取消本次调整")}
                  </button>
                )}
              </aside>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span className="footer-brand">
          <CookingPot size={16} /> VibeCooker
        </span>
        <p>
          {tr("好好做饭，好好生活。")}
          <Heart size={12} />
        </p>
        <span>MADE WITH A LITTLE LOVE</span>
      </footer>

      {detail && (
        <Dialog
          title={tr("这道料理的小档案")}
          wide
          onClose={() => setDetail(null)}
        >
          <div className="recipe-detail">
            <div className={`detail-art art-${detail.mood}`}>
              <FoodArt mood={detail.mood} />
            </div>
            <div className="detail-main">
              <div className="recipe-tags">
                <span>
                  {tr(
                    detailSource === "demo"
                      ? "流程演示"
                      : detail.origin === "creative"
                        ? "AI 原创 · 未经实测"
                        : "AI 家常灵感 · 未经实测",
                  )}
                </span>
                <span>
                  <Clock3 size={13} />
                  {detail.minutes}
                  {tr("分钟")}
                </span>
                <span>
                  <Users size={13} />
                  {detail.servings}
                  {locale === "en"
                    ? detail.servings === 1
                      ? " serving"
                      : " servings"
                    : tr("人份")}
                </span>
              </div>
              <h2>{tr(detail.title)}</h2>
              <p>{tr(detail.story)}</p>
              <RecipeScience
                recipe={detail}
                context={
                  recipes.some((r) => r.id === detail.id)
                    ? pairingContext
                    : { ingredients: selected, profile }
                }
                demo={detailSource === "demo"}
              />
              <h3>{tr("准备这些食材")}</h3>
              <ul className="detail-ingredient-list">
                {detail.ingredients.map((i, index) => (
                  <li key={index}>
                    <span>
                      {ingredientEmoji(i.name)} {tr(i.name)}
                    </span>
                    <span>{tr(i.amount)}</span>
                  </li>
                ))}
              </ul>
              {detail.missing.length > 0 && (
                <div className="missing-note">
                  {tr("还需确认或补充：")}
                  {detail.missing.map(tr).join(locale === "en" ? ", " : "、")}
                </div>
              )}
              <h3>{tr("怎么做，一目了然")}</h3>
              <ol className="detail-steps">
                {detail.steps.map((step) => (
                  <li key={step.id}>
                    <strong>{tr(step.title)}</strong>
                    <p>{tr(step.instruction)}</p>
                    <small>{tr(step.cue)}</small>
                  </li>
                ))}
              </ol>
              {detail.tips.length > 0 && (
                <div className="detail-tips">
                  {detail.tips.map((tip, i) => (
                    <p key={i}>
                      <Leaf size={14} />
                      {tr(tip)}
                    </p>
                  ))}
                </div>
              )}
              <button
                className="primary-button"
                onClick={() => startCooking(detail, detailSource)}
              >
                <ChefHat size={18} />
                {tr("就做这道，开始吧")}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {scienceOpen && (
        <Dialog
          title={tr("搭配背后的科学与计算")}
          wide
          onClose={() => setScienceOpen(false)}
        >
          <SciencePrimer context={{ ingredients: selected, profile }} />
        </Dialog>
      )}
      {photoOpen && (
        <Dialog
          title={tr("拍一拍，看看有什么食材")}
          onClose={() => {
            if (busy === "photo") abortRef.current?.abort();
            setPhotoOpen(false);
            setError("");
          }}
        >
          <div className="photo-dialog">
            <p className="dialog-description">
              {tr("拍下冰箱或桌上的食材，识别后由你确认。")}
              <br />
              {tr("照片不会保存在料理记录中。")}
            </p>
            {photo ? (
              <img
                className="photo-preview"
                src={photo}
                alt={tr("待识别的食材照片")}
              />
            ) : (
              <div className="photo-dropzone">
                <Camera size={38} strokeWidth={1.3} />
                <strong>{tr("把今天的食材放进镜头")}</strong>
                <span>{tr("支持 JPG、PNG、WebP · 最大 15 MB")}</span>
              </div>
            )}
            <div className="photo-actions">
              <button
                className="secondary-button"
                disabled={Boolean(busy)}
                onClick={() => cameraRef.current?.click()}
              >
                <Camera size={16} />
                {tr("拍一张")}
              </button>
              <button
                className="secondary-button"
                disabled={Boolean(busy)}
                onClick={() => uploadRef.current?.click()}
              >
                <Upload size={16} /> {tr(photo ? "换张照片" : "选择照片")}
              </button>
            </div>
            <input
              hidden
              ref={uploadRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                void loadPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              hidden
              ref={cameraRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(e) => {
                void loadPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {error && (
              <p className="inline-error" role="alert">
                {tr(error)}
              </p>
            )}
            {detected ? (
              <div className="detected-results">
                <h3>{tr("我看到了这些，请你确认")}</h3>
                <p>{tr(detected.note)}</p>
                <div className="detected-chips">
                  {detected.ingredients.map((i, index) => (
                    <button
                      className={confirmed.includes(i.name) ? "chosen" : ""}
                      key={`${i.name}-${index}`}
                      aria-pressed={confirmed.includes(i.name)}
                      onClick={() =>
                        setConfirmed((s) =>
                          s.includes(i.name)
                            ? s.filter((n) => n !== i.name)
                            : [...s, i.name],
                        )
                      }
                    >
                      {confirmed.includes(i.name) && <Check size={13} />}{" "}
                      {tr(i.name)}
                      <small>{tr(i.confidence)}</small>
                    </button>
                  ))}
                </div>
                {!detected.ingredients.length && (
                  <p>{tr("可以换张清晰的照片，或关闭后手动添加食材。")}</p>
                )}
                <button
                  className="primary-button"
                  disabled={!confirmed.length}
                  onClick={confirmPhoto}
                >
                  {tr("确认并加入冰箱（")}
                  {confirmed.length}
                  {locale === "en" ? ")" : "）"}
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <button
                className="primary-button"
                disabled={!photo || Boolean(busy)}
                onClick={identifyPhoto}
              >
                {busy === "photo" ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Sparkles size={17} />
                )}{" "}
                {tr(
                  busy === "photo"
                    ? "正在仔细看看…"
                    : hasKey
                      ? "识别照片里的食材"
                      : "连接模型后识别",
                )}
              </button>
            )}
            <p className="field-hint">
              {tr("识别可能出错，不判断新鲜度、份量或食用安全。请逐项确认。")}
            </p>
          </div>
        </Dialog>
      )}

      {ratingOpen && session && (
        <Dialog
          title={tr("这一餐，吃得开心吗？")}
          onClose={() => setRatingOpen(false)}
        >
          <div className="rating-dialog">
            <PotMascot small />
            <p>{tr("留下一点反馈，下次做得更合心意。")}</p>
            <div
              className="rating-stars"
              role="group"
              aria-label={tr("料理评分")}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  aria-label={tr(`${s} 星`)}
                  aria-pressed={rating === s}
                  onClick={() => setRating(s)}
                >
                  <Star
                    size={31}
                    fill={s <= rating ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>
            <label className="form-label">
              {tr("这次的盐度")}
              <div className="choice-chips">
                {["有点淡", "刚刚好", "有点咸"].map((t) => (
                  <button
                    key={t}
                    className={salt === t ? "chosen" : ""}
                    aria-pressed={salt === t}
                    onClick={() => setSalt(t)}
                  >
                    {tr(t)}
                  </button>
                ))}
              </div>
            </label>
            <label className="form-label">
              {tr("想记下的小感受")}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={tr("这次哪里喜欢？下次想怎样改进？")}
                maxLength={300}
              />
            </label>
            <label className="remember-checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>
                {tr("把这段话作为长期口味偏好记住")}
                <small>{tr("仅在勾选时保存到口味档案，随时可以删除。")}</small>
              </span>
            </label>
            <button className="primary-button" onClick={saveRating}>
              <BookHeart size={17} />
              {tr("收进我的料理本")}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  const { locale, t: tr } = useI18n();
  return (
    <div className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>
        {tr(title)}
        <span> .</span>
      </h1>
      <p>{tr(description)}</p>
    </div>
  );
}

function RecipeCard({
  recipe,
  source,
  onClick,
  analysis,
}: {
  recipe: Recipe;
  source: "demo" | "ai";
  onClick: () => void;
  analysis?: ReturnType<typeof analyzeRecipe>;
}) {
  const { locale, t: tr } = useI18n();
  return (
    <button className="recipe-card" onClick={onClick}>
      <div className={`recipe-art art-${recipe.mood}`}>
        <FoodArt mood={recipe.mood} />
        <span className="recipe-origin">
          {tr(
            source === "demo"
              ? "演示灵感"
              : recipe.origin === "creative"
                ? "✧ AI 原创"
                : "家常灵感",
          )}
        </span>
        <span className="art-disclaimer">{tr("料理插画")}</span>
      </div>
      <div className="recipe-card-copy">
        <h3>{tr(recipe.title)}</h3>
        <p>{tr(recipe.subtitle)}</p>
        {analysis && (
          <div className="pairing-preview">
            <span>
              {tr("用到")}
              {analysis.core.length}
              {tr("种主食材 ·")}
              {tr(recipe.technique)}
            </span>
            <strong>
              {tr("实用评分")}
              {analysis.score}
            </strong>
          </div>
        )}
        <div className="recipe-card-meta">
          <span>
            <Clock3 size={13} />
            {recipe.minutes}
            {tr("分钟")}
          </span>
          <span>
            <Users size={13} />
            {recipe.servings}
            {locale === "en"
              ? recipe.servings === 1
                ? " serving"
                : " servings"
              : tr("人份")}
          </span>
          <span>{tr(recipe.difficulty)}</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </button>
  );
}

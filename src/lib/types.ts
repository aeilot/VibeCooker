import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string().min(1).max(40),
  amount: z.string().max(60),
});
export const stepSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(100),
  instruction: z.string().min(1).max(1200),
  cue: z.string().min(1).max(400),
  minutes: z.number().int().min(0).max(180),
});
export const recipeSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(180),
  story: z.string().min(1).max(500),
  minutes: z.number().int().min(1).max(240),
  servings: z.number().int().min(1).max(8),
  difficulty: z.enum(["轻松上手", "有点挑战"]),
  origin: z.enum(["classic", "creative"]),
  mood: z.enum(["tomato", "green", "golden"]),
  ingredients: z.array(ingredientSchema).min(1).max(24),
  missing: z.array(z.string().min(1).max(80)).max(12),
  steps: z.array(stepSchema).min(2).max(16),
  tips: z.array(z.string().min(1).max(400)).max(5),
  technique: z
    .enum(["炒", "煎", "煮", "蒸", "烤", "拌", "其他"])
    .default("其他"),
});
export const profileSchema = z.object({
  people: z.number().int().min(1).max(8),
  minutes: z.number().int().min(10).max(120),
  taste: z.string().max(80),
  equipment: z.array(z.string().max(40)).min(1).max(12),
  restrictions: z.string().max(300),
  creativity: z.enum(["balanced", "creative"]),
  optionCount: z.union([z.literal(6), z.literal(9)]).default(6),
});
export const memorySchema = z.object({
  id: z.string(),
  text: z.string().max(300),
  createdAt: z.string(),
});
export const planRequestSchema = z.object({
  locale: z.enum(["zh-CN", "en"]).optional(),
  ingredients: z.array(z.string().min(1).max(40)).min(1).max(40),
  profile: profileSchema,
  memories: z.array(memorySchema).max(50),
});
export const sessionSchema = z.object({
  recipe: recipeSchema,
  currentStep: z.number().int().min(0).max(16),
  completedIds: z.array(z.string()).max(16),
  observations: z
    .array(
      z.object({
        text: z.string().max(1000),
        reply: z.string().max(2000),
        at: z.string(),
      }),
    )
    .max(60),
  timerEnd: z.number().nullable(),
  version: z.number().int().min(1),
  source: z.enum(["demo", "ai"]),
  constraints: profileSchema,
});
export const feedbackResponseSchema = z.object({
  reply: z.string().min(1).max(1800),
  needsClarification: z.boolean(),
  remainingSteps: z.array(stepSchema).max(16),
});
export type Recipe = z.infer<typeof recipeSchema>;
export type KitchenProfile = z.infer<typeof profileSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type CookingSession = z.infer<typeof sessionSchema>;
export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>;
export type Provider = "openrouter" | "deepseek";
export type Credentials = { provider: Provider; model: string; apiKey: string };
export type Trace = { label: string; detail: string };
export type HistoryEntry = {
  id: string;
  recipe: Recipe;
  rating: number;
  note: string;
  salt: string;
  at: string;
  source: "demo" | "ai";
};

export const defaultProfile: KitchenProfile = {
  people: 2,
  minutes: 30,
  taste: "清淡鲜香",
  equipment: ["炒锅"],
  restrictions: "",
  creativity: "balanced",
  optionCount: 6,
};

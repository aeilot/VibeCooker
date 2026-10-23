import { z } from "zod";

export const providerSchema = z.enum(["openrouter", "deepseek"]);
export const providers = {
  openrouter: {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "",
    placeholder: "提供商/模型名称，填写 OpenRouter 模型 ID",
    help: "填写 OpenRouter 的完整模型 ID（提供商/模型名称）。生成需要工具调用；拍照需选择同时支持图片输入和结构化输出的模型。",
  },
  deepseek: {
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    defaultModel: "deepseek-flash",
    placeholder: "例如 deepseek-flash",
    help: "默认使用 deepseek-flash，可用于工具调用和图片理解。其他模型的视觉能力可能不同；料理 Agent 使用非思考模式。",
  },
} as const;

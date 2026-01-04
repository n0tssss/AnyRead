/**
 * AI 提供商工厂
 */

import type { AIConfig, AIProvider as AIProviderType } from "../types.js";
import { AIProvider as BaseProvider } from "./base.js";
import { OpenAIProvider } from "./openai.js";
import { GeminiProvider } from "./gemini.js";
import { AnthropicProvider } from "./anthropic.js";

export { AIProvider } from "./base.js";
export type { VisionRequest, VisionResponse } from "./base.js";
export { OpenAIProvider } from "./openai.js";
export { GeminiProvider } from "./gemini.js";
export { AnthropicProvider } from "./anthropic.js";

/**
 * 创建 AI 提供商实例
 */
export function createAIProvider(config: AIConfig): BaseProvider {
    switch (config.provider) {
        case "openai":
            return new OpenAIProvider(config);
        case "gemini":
            return new GeminiProvider(config);
        case "anthropic":
            return new AnthropicProvider(config);
        case "custom":
            // 自定义提供商默认使用 OpenAI 兼容格式
            return new OpenAIProvider(config);
        default:
            throw new Error(`不支持的 AI 提供商: ${config.provider}`);
    }
}

export default createAIProvider;


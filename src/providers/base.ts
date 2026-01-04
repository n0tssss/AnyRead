/**
 * AI 提供商基类
 */

import type { AIConfig } from "../types.js";

export interface VisionRequest {
    imageUrl: string;
    prompt?: string;
    maxTokens?: number;
}

export interface VisionResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * AI 提供商抽象基类
 */
export abstract class AIProvider {
    protected config: AIConfig;

    constructor(config: AIConfig) {
        this.config = config;
    }

    /**
     * 图片识别
     */
    abstract analyzeImage(request: VisionRequest): Promise<VisionResponse>;

    /**
     * 获取默认模型
     */
    abstract getDefaultModel(): string;

    /**
     * 获取默认视觉模型
     */
    abstract getDefaultVisionModel(): string;

    /**
     * 获取当前使用的模型
     */
    protected getModel(): string {
        return this.config.model || this.getDefaultModel();
    }

    /**
     * 获取当前使用的视觉模型
     */
    protected getVisionModel(): string {
        return this.config.visionModel || this.config.model || this.getDefaultVisionModel();
    }
}

export default AIProvider;


/**
 * OpenAI 提供商（支持 OpenAI API 兼容格式）
 */

import axios, { type AxiosInstance } from "axios";
import { AIProvider, type VisionRequest, type VisionResponse } from "./base.js";
import type { AIConfig } from "../types.js";

const DEFAULT_PROMPT = `你是一个专业的图片分析助手。请详细分析用户上传的图片，包括：
1. 图片的主要内容描述
2. 如果是产品图片，识别产品型号、品牌、规格等信息
3. 如果是文档/表格截图，提取文字内容
4. 如果是电子元器件，识别型号和参数
5. 其他重要的细节信息

请用中文回复，尽可能详细和准确。`;

export class OpenAIProvider extends AIProvider {
    private client: AxiosInstance;

    constructor(config: AIConfig) {
        super(config);

        const baseURL = config.baseURL || "https://api.openai.com/v1";

        this.client = axios.create({
            baseURL,
            timeout: config.timeout || 60000,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.apiKey}`,
                ...config.headers
            }
        });
    }

    getDefaultModel(): string {
        return "gpt-4o";
    }

    getDefaultVisionModel(): string {
        return "gpt-4o";
    }

    async analyzeImage(request: VisionRequest): Promise<VisionResponse> {
        const model = this.getVisionModel();
        const prompt = request.prompt || DEFAULT_PROMPT;
        const maxRetries = this.config.maxRetries || 3;

        const body = {
            model,
            messages: [
                {
                    role: "system",
                    content: prompt
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: { url: encodeURI(request.imageUrl) }
                        },
                        {
                            type: "text",
                            text: "请分析这张图片的内容"
                        }
                    ]
                }
            ],
            max_tokens: request.maxTokens || 2000
        };

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.client.post("/chat/completions", body);

                if (response.data?.choices?.[0]?.message?.content) {
                    return {
                        content: response.data.choices[0].message.content,
                        usage: response.data.usage
                            ? {
                                  promptTokens: response.data.usage.prompt_tokens,
                                  completionTokens: response.data.usage.completion_tokens,
                                  totalTokens: response.data.usage.total_tokens
                              }
                            : undefined
                    };
                }

                throw new Error("AI 返回内容为空");
            } catch (error: any) {
                lastError = error;
                if (attempt < maxRetries) {
                    await this.sleep(500 * attempt); // 指数退避
                }
            }
        }

        throw new Error(`图片识别失败: ${lastError?.message || "未知错误"}`);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export default OpenAIProvider;


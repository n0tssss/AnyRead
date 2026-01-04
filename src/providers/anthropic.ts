/**
 * Anthropic Claude 提供商
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

export class AnthropicProvider extends AIProvider {
    private client: AxiosInstance;

    constructor(config: AIConfig) {
        super(config);

        const baseURL = config.baseURL || "https://api.anthropic.com";

        this.client = axios.create({
            baseURL,
            timeout: config.timeout || 60000,
            headers: {
                "Content-Type": "application/json",
                "x-api-key": config.apiKey,
                "anthropic-version": "2023-06-01",
                ...config.headers
            }
        });
    }

    getDefaultModel(): string {
        return "claude-3-5-sonnet-20241022";
    }

    getDefaultVisionModel(): string {
        return "claude-3-5-sonnet-20241022";
    }

    async analyzeImage(request: VisionRequest): Promise<VisionResponse> {
        const model = this.getVisionModel();
        const prompt = request.prompt || DEFAULT_PROMPT;
        const maxRetries = this.config.maxRetries || 3;

        // 下载图片并转为 base64
        const imageData = await this.fetchImageAsBase64(request.imageUrl);

        const body = {
            model,
            max_tokens: request.maxTokens || 2000,
            system: prompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: imageData.mimeType,
                                data: imageData.base64
                            }
                        },
                        {
                            type: "text",
                            text: "请分析这张图片的内容"
                        }
                    ]
                }
            ]
        };

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.client.post("/v1/messages", body);

                if (response.data?.content?.[0]?.text) {
                    return {
                        content: response.data.content[0].text,
                        usage: response.data.usage
                            ? {
                                  promptTokens: response.data.usage.input_tokens,
                                  completionTokens: response.data.usage.output_tokens,
                                  totalTokens:
                                      response.data.usage.input_tokens + response.data.usage.output_tokens
                              }
                            : undefined
                    };
                }

                throw new Error("AI 返回内容为空");
            } catch (error: any) {
                lastError = error;
                if (attempt < maxRetries) {
                    await this.sleep(500 * attempt);
                }
            }
        }

        throw new Error(`图片识别失败: ${lastError?.message || "未知错误"}`);
    }

    private async fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        });

        const buffer = Buffer.from(response.data);
        const base64 = buffer.toString("base64");

        let mimeType = response.headers["content-type"] || "image/jpeg";
        if (mimeType.includes(";")) {
            mimeType = mimeType.split(";")[0].trim();
        }

        return { base64, mimeType };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export default AnthropicProvider;


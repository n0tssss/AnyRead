/**
 * Google Gemini 提供商
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

export class GeminiProvider extends AIProvider {
    private client: AxiosInstance;
    private apiKey: string;

    constructor(config: AIConfig) {
        super(config);
        this.apiKey = config.apiKey;

        // 标准化 baseURL
        let baseURL = config.baseURL || "https://generativelanguage.googleapis.com";
        baseURL = baseURL.replace(/\/+$/, "");
        if (!baseURL.endsWith("/v1beta")) {
            baseURL += "/v1beta";
        }

        this.client = axios.create({
            baseURL,
            timeout: config.timeout || 60000,
            headers: {
                "Content-Type": "application/json",
                ...config.headers
            }
        });
    }

    getDefaultModel(): string {
        return "gemini-2.0-flash";
    }

    getDefaultVisionModel(): string {
        return "gemini-2.0-flash";
    }

    async analyzeImage(request: VisionRequest): Promise<VisionResponse> {
        const model = this.getVisionModel();
        const prompt = request.prompt || DEFAULT_PROMPT;
        const maxRetries = this.config.maxRetries || 3;

        // 下载图片并转为 base64
        const imageData = await this.fetchImageAsBase64(request.imageUrl);

        const body = {
            contents: [
                {
                    parts: [
                        { text: prompt + "\n\n请分析这张图片的内容" },
                        {
                            inline_data: {
                                mime_type: imageData.mimeType,
                                data: imageData.base64
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                maxOutputTokens: request.maxTokens || 2000
            }
        };

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.client.post(
                    `/models/${model}:generateContent?key=${this.apiKey}`,
                    body
                );

                const text = this.extractText(response.data);
                if (text) {
                    return {
                        content: text,
                        usage: response.data.usageMetadata
                            ? {
                                  promptTokens: response.data.usageMetadata.promptTokenCount || 0,
                                  completionTokens: response.data.usageMetadata.candidatesTokenCount || 0,
                                  totalTokens: response.data.usageMetadata.totalTokenCount || 0
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

        // 推断 MIME 类型
        let mimeType = response.headers["content-type"] || "image/jpeg";
        if (mimeType.includes(";")) {
            mimeType = mimeType.split(";")[0].trim();
        }

        return { base64, mimeType };
    }

    private extractText(data: any): string {
        if (data?.candidates?.[0]?.content?.parts) {
            const texts: string[] = [];
            for (const part of data.candidates[0].content.parts) {
                if (part.text) texts.push(part.text);
            }
            return texts.join("");
        }
        return "";
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export default GeminiProvider;


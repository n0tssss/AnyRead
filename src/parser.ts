/**
 * 核心文件解析器
 */

import axios from "axios";
import path from "path";
import type {
    FileType,
    ParsedFile,
    ParserConfig,
    BatchParseOptions,
    FormatOptions
} from "./types.js";
import { parseExcel } from "./parsers/excel.js";
import { parseCSV } from "./parsers/csv.js";
import { parseWord } from "./parsers/word.js";
import { parseText } from "./parsers/text.js";
import { createAIProvider, type AIProvider } from "./providers/index.js";

// 文件扩展名映射
const EXTENSION_MAP: Record<string, FileType> = {
    ".xlsx": "excel",
    ".xls": "excel",
    ".csv": "csv",
    ".docx": "word",
    ".doc": "word",
    ".txt": "text",
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image",
    ".gif": "image",
    ".webp": "image",
    ".bmp": "image",
    ".pdf": "pdf"
};

/**
 * 文件解析器类
 */
export class FileParser {
    private config: ParserConfig;
    private aiProvider: AIProvider | null = null;
    private logger: (level: string, message: string, ...args: any[]) => void;

    constructor(config: ParserConfig = {}) {
        this.config = config;

        // 初始化 AI 提供商
        if (config.ai) {
            this.aiProvider = createAIProvider(config.ai);
        }

        // 初始化日志
        const logging = config.logging ?? { enabled: true, level: "info" };
        if (logging.enabled === false) {
            this.logger = () => {};
        } else if (logging.logger) {
            this.logger = logging.logger;
        } else {
            const levels = ["debug", "info", "warn", "error"];
            const minLevel = levels.indexOf(logging.level || "info");
            this.logger = (level, message, ...args) => {
                if (levels.indexOf(level) >= minLevel) {
                    const prefix = {
                        debug: "🔍",
                        info: "📄",
                        warn: "⚠️",
                        error: "❌"
                    }[level] || "📄";
                    console.log(`${prefix} [FileParser] ${message}`, ...args);
                }
            };
        }
    }

    /**
     * 检测文件类型
     */
    detectFileType(filename: string): FileType {
        const ext = path.extname(filename).toLowerCase();
        return EXTENSION_MAP[ext] || "unknown";
    }

    /**
     * 从 URL 提取文件名
     */
    extractFileName(url: string): string {
        try {
            const decoded = decodeURIComponent(url);
            const filename = decoded.split("/").pop()?.split("?")[0] || "unknown";
            return filename;
        } catch {
            return "unknown";
        }
    }

    /**
     * 下载文件
     */
    async downloadFile(url: string): Promise<Buffer> {
        const downloadConfig = this.config.download ?? {};
        const timeout = downloadConfig.timeout ?? 60000;
        const maxSize = downloadConfig.maxSize ?? 50 * 1024 * 1024; // 50MB
        const userAgent =
            downloadConfig.userAgent ||
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        this.logger("debug", `下载文件: ${url}`);

        const response = await axios({
            method: "GET",
            url: url,
            responseType: "arraybuffer",
            timeout,
            maxContentLength: maxSize,
            headers: {
                "User-Agent": userAgent,
                ...downloadConfig.headers
            }
        });

        const buffer = Buffer.from(response.data);
        this.logger("debug", `下载完成: ${buffer.length} 字节`);

        return buffer;
    }

    /**
     * 解析单个文件
     */
    async parse(url: string): Promise<ParsedFile> {
        const fileName = this.extractFileName(url);
        const fileType = this.detectFileType(fileName);

        this.logger("info", `解析文件: ${fileName} (${fileType})`);

        try {
            // 图片：使用 AI 识别或返回链接
            if (fileType === "image") {
                return await this.parseImage(url, fileName);
            }

            // PDF：使用 AI 识别或返回链接
            if (fileType === "pdf") {
                return await this.parsePDF(url, fileName);
            }

            // 未知格式
            if (fileType === "unknown") {
                return {
                    fileName,
                    url,
                    type: "unknown",
                    content: `[未知格式] ${fileName}`,
                    success: false,
                    error: "不支持的文件格式"
                };
            }

            // 下载文件并本地解析
            const buffer = await this.downloadFile(url);

            let content = "";
            let metadata: ParsedFile["metadata"] = { size: buffer.length };

            switch (fileType) {
                case "excel": {
                    const result = parseExcel(buffer, fileName, this.config.excel);
                    content = result.content;
                    metadata = { ...metadata, ...result.metadata };
                    break;
                }
                case "csv": {
                    const result = parseCSV(buffer, fileName, this.config.csv);
                    content = result.content;
                    metadata = { ...metadata, ...result.metadata };
                    break;
                }
                case "word": {
                    const result = await parseWord(buffer, fileName);
                    content = result.content;
                    metadata = { ...metadata, ...result.metadata };
                    break;
                }
                case "text": {
                    const result = parseText(buffer, fileName);
                    content = result.content;
                    metadata = { ...metadata, ...result.metadata };
                    break;
                }
            }

            this.logger("info", `解析成功: ${fileName}, 内容长度: ${content.length}`);

            return {
                fileName,
                url,
                type: fileType,
                content,
                success: true,
                metadata
            };
        } catch (error: any) {
            this.logger("error", `解析失败: ${fileName}`, error.message);
            return {
                fileName,
                url,
                type: fileType,
                content: "",
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 解析图片
     */
    private async parseImage(url: string, fileName: string): Promise<ParsedFile> {
        const imageConfig = this.config.image ?? {};
        const enableAI = imageConfig.enableAI !== false;

        if (enableAI && this.aiProvider) {
            try {
                this.logger("info", `使用 AI 识别图片: ${fileName}`);
                const result = await this.aiProvider.analyzeImage({
                    imageUrl: url,
                    prompt: imageConfig.prompt,
                    maxTokens: imageConfig.maxTokens
                });

                return {
                    fileName,
                    url,
                    type: "image",
                    content: result.content,
                    success: true,
                    metadata: {
                        mimeType: this.guessMimeType(fileName)
                    }
                };
            } catch (error: any) {
                this.logger("warn", `AI 图片识别失败: ${error.message}`);
                // 降级：返回链接
            }
        }

        // 无 AI 或识别失败：返回链接
        return {
            fileName,
            url,
            type: "image",
            content: `[图片文件] ${fileName}\n图片链接: ${url}\n请根据图片内容进行分析。`,
            success: true,
            metadata: { mimeType: this.guessMimeType(fileName) }
        };
    }

    /**
     * 解析 PDF
     */
    private async parsePDF(url: string, fileName: string): Promise<ParsedFile> {
        const pdfConfig = this.config.pdf ?? {};
        const enableAI = pdfConfig.enableAI !== false;

        if (enableAI && this.aiProvider) {
            try {
                this.logger("info", `使用 AI 识别 PDF: ${fileName}`);
                const result = await this.aiProvider.analyzeImage({
                    imageUrl: url,
                    prompt: pdfConfig.prompt || "请分析这个 PDF 文档的内容，提取关键信息。",
                    maxTokens: 4000
                });

                return {
                    fileName,
                    url,
                    type: "pdf",
                    content: result.content,
                    success: true,
                    metadata: { mimeType: "application/pdf" }
                };
            } catch (error: any) {
                this.logger("warn", `AI PDF 识别失败: ${error.message}`);
            }
        }

        // 无 AI 或识别失败：返回链接
        return {
            fileName,
            url,
            type: "pdf",
            content: `[PDF文档] ${fileName}\n文档链接: ${url}\n请查看并分析文档内容。`,
            success: true,
            metadata: { mimeType: "application/pdf" }
        };
    }

    /**
     * 批量解析文件
     */
    async parseMany(urls: string[], options?: BatchParseOptions): Promise<ParsedFile[]> {
        const concurrency = options?.concurrency ?? 3;
        const continueOnError = options?.continueOnError ?? true;
        const onProgress = options?.onProgress;

        const results: ParsedFile[] = [];
        const total = urls.length;
        let completed = 0;

        // 分批并发处理
        for (let i = 0; i < urls.length; i += concurrency) {
            const batch = urls.slice(i, i + concurrency);

            const batchResults = await Promise.all(
                batch.map(async (url) => {
                    try {
                        return await this.parse(url);
                    } catch (error: any) {
                        if (!continueOnError) throw error;
                        return {
                            fileName: this.extractFileName(url),
                            url,
                            type: "unknown" as FileType,
                            content: "",
                            success: false,
                            error: error.message
                        };
                    }
                })
            );

            for (const result of batchResults) {
                results.push(result);
                completed++;
                onProgress?.(completed, total, result);
            }
        }

        return results;
    }

    /**
     * 格式化解析结果为文本
     */
    format(files: ParsedFile[], options?: FormatOptions): string {
        const includeTitle = options?.includeTitle ?? true;
        const includeUrl = options?.includeUrl ?? false;
        const separator = options?.separator ?? "---";
        const onError = options?.onError ?? "skip";

        const parts: string[] = [];

        for (const file of files) {
            if (!file.success) {
                if (onError === "skip") continue;
                if (onError === "error") {
                    throw new Error(`文件解析失败: ${file.fileName} - ${file.error}`);
                }
                // include: 包含错误信息
                parts.push(`【${file.fileName}】解析失败: ${file.error}`);
                continue;
            }

            let text = "";

            if (includeTitle) {
                const typeLabel = this.getTypeLabel(file.type);
                text += `【${typeLabel}】${file.fileName}\n`;
            }

            if (includeUrl) {
                text += `URL: ${file.url}\n`;
            }

            text += file.content;
            parts.push(text);
        }

        return parts.join(`\n${separator}\n`);
    }

    /**
     * 获取类型标签
     */
    private getTypeLabel(type: FileType): string {
        const labels: Record<FileType, string> = {
            excel: "表格",
            csv: "表格",
            word: "文档",
            text: "文本",
            image: "图片",
            pdf: "PDF",
            unknown: "文件"
        };
        return labels[type] || "文件";
    }

    /**
     * 猜测 MIME 类型
     */
    private guessMimeType(filename: string): string {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".bmp": "image/bmp",
            ".pdf": "application/pdf",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls": "application/vnd.ms-excel",
            ".csv": "text/csv",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc": "application/msword",
            ".txt": "text/plain"
        };
        return mimeTypes[ext] || "application/octet-stream";
    }
}

export default FileParser;


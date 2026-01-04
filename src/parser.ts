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
import { parsePDF } from "./parsers/pdf.js";
import { parseJSON } from "./parsers/json.js";
import { parseYAML } from "./parsers/yaml.js";
import { parseXML } from "./parsers/xml.js";
import { parseHTML } from "./parsers/html.js";
import { parseMarkdown } from "./parsers/markdown.js";
import { createAIProvider, type AIProvider } from "./providers/index.js";

// 文件扩展名映射
const EXTENSION_MAP: Record<string, FileType> = {
    // 表格
    ".xlsx": "excel",
    ".xls": "excel",
    ".csv": "csv",
    // 文档
    ".docx": "word",
    ".doc": "word",
    ".txt": "text",
    ".rtf": "text",
    // 数据格式
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".xml": "xml",
    // 网页/标记
    ".html": "html",
    ".htm": "html",
    ".md": "markdown",
    ".markdown": "markdown",
    // PDF
    ".pdf": "pdf",
    // 图片
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image",
    ".gif": "image",
    ".webp": "image",
    ".bmp": "image",
    ".svg": "image",
    ".ico": "image",
    ".tiff": "image",
    ".tif": "image",
    // 音频（需 AI）
    ".mp3": "audio",
    ".wav": "audio",
    ".ogg": "audio",
    ".m4a": "audio",
    ".flac": "audio",
    ".aac": "audio",
    // 视频（需 AI）
    ".mp4": "video",
    ".avi": "video",
    ".mov": "video",
    ".webm": "video",
    ".mkv": "video"
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
                    console.log(`${prefix} [AnyRead] ${message}`, ...args);
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
            // 需要 AI 处理的类型
            if (fileType === "image") {
                return await this.parseWithAI(url, fileName, "image");
            }
            if (fileType === "audio") {
                return await this.parseWithAI(url, fileName, "audio");
            }
            if (fileType === "video") {
                return await this.parseWithAI(url, fileName, "video");
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
                case "pdf": {
                    // PDF 优先本地解析，失败则用 AI
                    try {
                        const result = await parsePDF(buffer, fileName);
                        content = result.content;
                        metadata = { ...metadata, ...result.metadata };
                    } catch (e) {
                        this.logger("warn", `PDF 本地解析失败，尝试 AI: ${fileName}`);
                        return await this.parseWithAI(url, fileName, "pdf");
                    }
                    break;
                }
                case "json": {
                    const result = parseJSON(buffer, fileName);
                    content = result.content;
                    metadata = { ...metadata, ...result.metadata };
                    break;
                }
                case "yaml": {
                    const result = parseYAML(buffer, fileName);
                    content = result.content;
                    metadata = { ...metadata, ...result.metadata };
                    break;
                }
                case "xml": {
                    const result = await parseXML(buffer, fileName);
                    content = result.content;
                    metadata = { ...metadata, ...result.metadata };
                    break;
                }
                case "html": {
                    const result = parseHTML(buffer, fileName);
                    content = result.content;
                    metadata = { ...metadata, ...result.metadata };
                    break;
                }
                case "markdown": {
                    const result = parseMarkdown(buffer, fileName);
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
     * 使用 AI 解析文件（图片、音频、视频、PDF）
     */
    private async parseWithAI(
        url: string,
        fileName: string,
        type: "image" | "audio" | "video" | "pdf"
    ): Promise<ParsedFile> {
        const prompts: Record<string, string> = {
            image: "请详细分析这张图片的内容，包括产品信息、文字、型号等。",
            audio: "请转写并分析这段音频的内容。",
            video: "请分析这段视频的内容，描述关键信息。",
            pdf: "请分析这个 PDF 文档的内容，提取关键信息。"
        };

        if (this.aiProvider) {
            try {
                this.logger("info", `使用 AI 解析 ${type}: ${fileName}`);
                const result = await this.aiProvider.analyzeImage({
                    imageUrl: url,
                    prompt: prompts[type],
                    maxTokens: type === "pdf" ? 4000 : 2000
                });

                return {
                    fileName,
                    url,
                    type: type as FileType,
                    content: result.content,
                    success: true,
                    metadata: { mimeType: this.guessMimeType(fileName) }
                };
            } catch (error: any) {
                this.logger("warn", `AI 解析失败: ${error.message}`);
            }
        }

        // 无 AI 或失败：返回链接提示
        const labels: Record<string, string> = {
            image: "图片文件",
            audio: "音频文件",
            video: "视频文件",
            pdf: "PDF文档"
        };

        return {
            fileName,
            url,
            type: type as FileType,
            content: `[${labels[type]}] ${fileName}\n文件链接: ${url}\n（需要配置 AI 才能解析此类型文件）`,
            success: true,
            metadata: { mimeType: this.guessMimeType(fileName) }
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

        this.logger("info", `开始批量解析 ${total} 个文件，并发数: ${concurrency}`);

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

        const successCount = results.filter((r) => r.success).length;
        this.logger("info", `批量解析完成: ${successCount}/${total} 成功`);

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
            pdf: "PDF",
            json: "JSON",
            yaml: "YAML",
            xml: "XML",
            html: "网页",
            markdown: "Markdown",
            image: "图片",
            audio: "音频",
            video: "视频",
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
            // 图片
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".bmp": "image/bmp",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
            // 文档
            ".pdf": "application/pdf",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls": "application/vnd.ms-excel",
            ".csv": "text/csv",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc": "application/msword",
            ".txt": "text/plain",
            // 数据
            ".json": "application/json",
            ".yaml": "text/yaml",
            ".yml": "text/yaml",
            ".xml": "application/xml",
            ".html": "text/html",
            ".htm": "text/html",
            ".md": "text/markdown",
            // 音频
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".ogg": "audio/ogg",
            ".m4a": "audio/m4a",
            // 视频
            ".mp4": "video/mp4",
            ".avi": "video/x-msvideo",
            ".mov": "video/quicktime",
            ".webm": "video/webm"
        };
        return mimeTypes[ext] || "application/octet-stream";
    }

    /**
     * 获取支持的文件格式列表
     */
    static getSupportedFormats(): { extension: string; type: FileType; method: string }[] {
        return Object.entries(EXTENSION_MAP).map(([ext, type]) => {
            let method = "本地解析";
            if (["image", "audio", "video"].includes(type)) {
                method = "AI 识别";
            } else if (type === "pdf") {
                method = "本地解析 / AI 降级";
            }
            return { extension: ext, type, method };
        });
    }
}

export default FileParser;

/**
 * 文件类型枚举
 */
export type FileType =
    | "excel"      // .xlsx, .xls
    | "csv"        // .csv
    | "word"       // .docx, .doc
    | "text"       // .txt
    | "pdf"        // .pdf
    | "json"       // .json
    | "yaml"       // .yaml, .yml
    | "xml"        // .xml
    | "html"       // .html, .htm
    | "markdown"   // .md, .markdown
    | "image"      // .jpg, .jpeg, .png, .gif, .webp, .bmp, .svg
    | "audio"      // .mp3, .wav, .ogg, .m4a, .flac (需 AI 转写)
    | "video"      // .mp4, .avi, .mov, .webm (需 AI 识别)
    | "unknown";   // 其他格式

/**
 * Raw 格式 - 单个工作表数据
 */
export interface RawSheetData {
    /** 工作表名称 */
    name: string;
    /** 表头行（raw 格式下为空数组，由调用方自行从 rows 中提取） */
    headers: string[];
    /** 全部行数据（二维数组），raw 格式下包含所有行（含表头行） */
    rows: any[][];
    /** 总行数 */
    totalRows: number;
}

/**
 * Raw 格式输出 - 用于表格文件的结构化数据
 */
export interface RawOutput {
    /** 所有工作表数据 */
    sheets: RawSheetData[];
}

/**
 * 文件解析结果
 */
export interface ParsedFile {
    /** 文件名 */
    fileName: string;
    /** 原始 URL */
    url: string;
    /** 文件类型 */
    type: FileType;
    /** 解析后的内容 */
    content: string;
    /** 解析是否成功 */
    success: boolean;
    /** 错误信息（如果失败） */
    error?: string;
    /** raw 格式时的结构化数据（仅 excel/csv） */
    rawData?: RawOutput;
    /** 元数据 */
    metadata?: {
        /** 文件大小（字节） */
        size?: number;
        /** MIME 类型 */
        mimeType?: string;
        /** 工作表名称（Excel） */
        sheetNames?: string[];
        /** 行数 */
        rowCount?: number;
        /** 是否被截断 */
        truncated?: boolean;
    };
}

/**
 * AI 提供商类型
 */
export type AIProvider = "openai" | "gemini" | "anthropic" | "custom";

/**
 * AI 配置
 */
export interface AIConfig {
    /** AI 提供商 */
    provider: AIProvider;
    /** API Key */
    apiKey: string;
    /** API 基础 URL（可选，用于自定义代理） */
    baseURL?: string;
    /** 模型名称 */
    model?: string;
    /** 图片识别专用模型（可选） */
    visionModel?: string;
    /** 请求超时（毫秒） */
    timeout?: number;
    /** 最大重试次数 */
    maxRetries?: number;
    /** 自定义请求头 */
    headers?: Record<string, string>;
}

/**
 * OpenAI 特定配置
 */
export interface OpenAIConfig extends AIConfig {
    provider: "openai";
    /** 默认模型：gpt-4o */
    model?: string;
}

/**
 * Gemini 特定配置
 */
export interface GeminiConfig extends AIConfig {
    provider: "gemini";
    /** 默认模型：gemini-2.0-flash */
    model?: string;
}

/**
 * Anthropic 特定配置
 */
export interface AnthropicConfig extends AIConfig {
    provider: "anthropic";
    /** 默认模型：claude-3-5-sonnet */
    model?: string;
}

/**
 * 自定义 AI 配置（兼容 OpenAI API 格式）
 */
export interface CustomAIConfig extends AIConfig {
    provider: "custom";
    /** 必须指定 baseURL */
    baseURL: string;
    /** 必须指定模型 */
    model: string;
}

/**
 * 解析器配置
 */
export interface ParserConfig {
    /** AI 配置（用于图片/PDF 识别） */
    ai?: AIConfig;
    
    /** 下载配置 */
    download?: {
        /** 请求超时（毫秒），默认 60000 */
        timeout?: number;
        /** 最大文件大小（字节），默认 50MB */
        maxSize?: number;
        /** 自定义请求头 */
        headers?: Record<string, string>;
        /** User-Agent */
        userAgent?: string;
    };
    
    /** Excel 解析配置 */
    excel?: {
        /** 最大行数，默认 -1（不限制），设置正数则限制行数 */
        maxRows?: number;
        /** 是否解析所有工作表，默认 true */
        allSheets?: boolean;
        /** 输出格式：markdown | json | csv | raw */
        outputFormat?: "markdown" | "json" | "csv" | "raw";
    };
    
    /** CSV 解析配置 */
    csv?: {
        /** 分隔符，默认 "," */
        delimiter?: string;
        /** 最大行数，默认 -1（不限制），设置正数则限制行数 */
        maxRows?: number;
        /** 输出格式：markdown | json | csv | raw */
        outputFormat?: "markdown" | "json" | "csv" | "raw";
    };
    
    /** 图片解析配置 */
    image?: {
        /** 是否启用 AI 识别，默认 true（需要配置 ai） */
        enableAI?: boolean;
        /** 自定义识别提示词 */
        prompt?: string;
        /** 最大 tokens */
        maxTokens?: number;
    };
    
    /** PDF 解析配置 */
    pdf?: {
        /** 是否启用 AI 识别，默认 true（需要配置 ai） */
        enableAI?: boolean;
        /** 自定义识别提示词 */
        prompt?: string;
    };
    
    /** 日志配置 */
    logging?: {
        /** 是否启用日志，默认 true */
        enabled?: boolean;
        /** 日志级别：debug | info | warn | error */
        level?: "debug" | "info" | "warn" | "error";
        /** 自定义日志函数 */
        logger?: (level: string, message: string, ...args: any[]) => void;
    };
}

/**
 * 批量解析选项
 */
export interface BatchParseOptions {
    /** 并发数，默认 3 */
    concurrency?: number;
    /** 是否在出错时继续，默认 true */
    continueOnError?: boolean;
    /** 进度回调 */
    onProgress?: (completed: number, total: number, current?: ParsedFile) => void;
}

/**
 * 格式化选项
 */
export interface FormatOptions {
    /** 是否包含文件名标题，默认 true */
    includeTitle?: boolean;
    /** 是否包含文件 URL，默认 false */
    includeUrl?: boolean;
    /** 分隔符，默认 "---" */
    separator?: string;
    /** 失败文件的处理方式：skip | include | error */
    onError?: "skip" | "include" | "error";
}


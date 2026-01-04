/**
 * @aspect/file-parser
 * 通用文件解析库 - 支持 Excel、CSV、Word、图片、PDF 等多种格式
 */

// 导出类型
export type {
    FileType,
    ParsedFile,
    AIProvider as AIProviderType,
    AIConfig,
    OpenAIConfig,
    GeminiConfig,
    AnthropicConfig,
    CustomAIConfig,
    ParserConfig,
    BatchParseOptions,
    FormatOptions
} from "./types.js";

// 导出核心解析器
export { FileParser } from "./parser.js";
export { default as FileParser_Default } from "./parser.js";

// 导出 AI 提供商
export {
    createAIProvider,
    AIProvider,
    OpenAIProvider,
    GeminiProvider,
    AnthropicProvider
} from "./providers/index.js";
export type { VisionRequest, VisionResponse } from "./providers/index.js";

// 导出各格式解析器
export { parseExcel } from "./parsers/excel.js";
export { parseCSV } from "./parsers/csv.js";
export { parseWord } from "./parsers/word.js";
export { parseText } from "./parsers/text.js";

// ============ 便捷函数 ============

import { FileParser } from "./parser.js";
import type { ParserConfig, ParsedFile, BatchParseOptions, FormatOptions } from "./types.js";

// 默认实例（无 AI 功能）
let defaultParser: FileParser | null = null;

/**
 * 获取或创建默认解析器
 */
function getDefaultParser(): FileParser {
    if (!defaultParser) {
        defaultParser = new FileParser();
    }
    return defaultParser;
}

/**
 * 配置默认解析器
 */
export function configure(config: ParserConfig): FileParser {
    defaultParser = new FileParser(config);
    return defaultParser;
}

/**
 * 解析单个文件
 * @param url 文件 URL
 * @param config 可选配置
 */
export async function parse(url: string, config?: ParserConfig): Promise<ParsedFile> {
    const parser = config ? new FileParser(config) : getDefaultParser();
    return parser.parse(url);
}

/**
 * 批量解析文件
 * @param urls 文件 URL 数组
 * @param options 批量选项
 * @param config 可选配置
 */
export async function parseMany(
    urls: string[],
    options?: BatchParseOptions,
    config?: ParserConfig
): Promise<ParsedFile[]> {
    const parser = config ? new FileParser(config) : getDefaultParser();
    return parser.parseMany(urls, options);
}

/**
 * 解析并格式化为文本
 * @param urls 文件 URL 数组
 * @param formatOptions 格式化选项
 * @param config 可选配置
 */
export async function parseAndFormat(
    urls: string[],
    formatOptions?: FormatOptions,
    config?: ParserConfig
): Promise<string> {
    const parser = config ? new FileParser(config) : getDefaultParser();
    const files = await parser.parseMany(urls);
    return parser.format(files, formatOptions);
}

/**
 * 检测文件类型
 */
export function detectFileType(filename: string) {
    return getDefaultParser().detectFileType(filename);
}

/**
 * 从 URL 提取文件名
 */
export function extractFileName(url: string) {
    return getDefaultParser().extractFileName(url);
}

// 默认导出
export default FileParser;


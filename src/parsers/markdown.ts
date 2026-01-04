/**
 * Markdown 文件解析器
 * 直接读取，保持原格式
 */

export interface MarkdownParseResult {
    content: string;
    metadata: {
        headings: string[];
        hasCodeBlocks: boolean;
        hasTables: boolean;
    };
}

/**
 * 解析 Markdown 文件
 */
export function parseMarkdown(
    buffer: Buffer,
    fileName: string
): MarkdownParseResult {
    const content = buffer.toString("utf8");

    // 提取标题
    const headingMatches = content.match(/^#{1,6}\s+.+$/gm) || [];
    const headings = headingMatches.map((h) => h.replace(/^#+\s+/, "").trim());

    // 检测代码块
    const hasCodeBlocks = /```[\s\S]*?```/.test(content);

    // 检测表格
    const hasTables = /\|.+\|/.test(content) && /\|[-:]+\|/.test(content);

    return {
        content,
        metadata: { headings, hasCodeBlocks, hasTables }
    };
}

export default parseMarkdown;


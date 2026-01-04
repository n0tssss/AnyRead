/**
 * 纯文本解析器 (.txt)
 */

export interface TextParseResult {
    content: string;
    metadata: {
        encoding: string;
        lineCount: number;
    };
}

/**
 * 解析纯文本文件
 */
export function parseText(
    buffer: Buffer,
    fileName: string,
    maxLength?: number
): TextParseResult {
    // 尝试检测编码（简单实现，默认 UTF-8）
    let content = buffer.toString("utf8");
    let encoding = "utf8";

    // 检测 BOM
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
        content = buffer.toString("utf16le");
        encoding = "utf16le";
    } else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
        content = buffer.swap16().toString("utf16le");
        encoding = "utf16be";
    }

    // 限制长度
    const limit = maxLength ?? 100000; // 默认 100KB 文本
    let truncated = false;
    if (content.length > limit) {
        content = content.slice(0, limit) + "\n\n... [内容已截断]";
        truncated = true;
    }

    const lineCount = content.split(/\r?\n/).length;

    return {
        content,
        metadata: {
            encoding,
            lineCount
        }
    };
}

export default parseText;


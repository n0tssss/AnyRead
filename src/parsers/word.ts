/**
 * Word 文档解析器 (.docx)
 */

import mammoth from "mammoth";

export interface WordParseResult {
    content: string;
    metadata: {
        messages?: string[];
    };
}

/**
 * 解析 Word 文档
 */
export async function parseWord(
    buffer: Buffer,
    fileName: string
): Promise<WordParseResult> {
    try {
        const result = await mammoth.extractRawText({ buffer });

        return {
            content: result.value || "文档内容为空",
            metadata: {
                messages: result.messages.map((m) => m.message)
            }
        };
    } catch (error: any) {
        // 如果是 .doc 格式（旧版 Word），mammoth 不支持
        if (fileName.endsWith(".doc")) {
            throw new Error("不支持旧版 .doc 格式，请转换为 .docx");
        }
        throw error;
    }
}

export default parseWord;


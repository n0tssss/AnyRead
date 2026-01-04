/**
 * PDF 文件解析器
 * 使用 pdf-parse 库本地提取文本
 */

import { createRequire } from "module";

export interface PDFParseResult {
    content: string;
    metadata: {
        pages: number;
        info?: Record<string, any>;
    };
}

/**
 * 解析 PDF 文件
 */
export async function parsePDF(
    buffer: Buffer,
    fileName: string
): Promise<PDFParseResult> {
    try {
        // 使用 createRequire 加载 CommonJS 模块
        const require = createRequire(import.meta.url);
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);

        return {
            content: data.text || "PDF 内容为空",
            metadata: {
                pages: data.numpages || 0,
                info: data.info
            }
        };
    } catch (error: any) {
        throw new Error(`PDF 解析失败: ${error.message}`);
    }
}

export default parsePDF;


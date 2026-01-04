/**
 * HTML 文件解析器
 * 使用 cheerio 库提取文本
 */

import * as cheerio from "cheerio";

export interface HTMLParseResult {
    content: string;
    metadata: {
        title?: string;
        description?: string;
        links: number;
        images: number;
    };
}

/**
 * 解析 HTML 文件，提取纯文本
 */
export function parseHTML(
    buffer: Buffer,
    fileName: string
): HTMLParseResult {
    const html = buffer.toString("utf8");
    const $ = cheerio.load(html);

    // 移除不需要的元素
    $("script, style, noscript, iframe, svg").remove();

    // 提取元数据
    const title = $("title").text().trim() || undefined;
    const description = $('meta[name="description"]').attr("content") || undefined;
    const links = $("a").length;
    const images = $("img").length;

    // 提取正文文本
    const body = $("body");
    let content = "";

    if (body.length) {
        // 获取文本并清理空白
        content = body.text()
            .replace(/\s+/g, " ")
            .replace(/\n\s*\n/g, "\n")
            .trim();
    } else {
        content = $.text().replace(/\s+/g, " ").trim();
    }

    // 如果有标题，添加到开头
    if (title) {
        content = `# ${title}\n\n${content}`;
    }

    return {
        content,
        metadata: { title, description, links, images }
    };
}

export default parseHTML;


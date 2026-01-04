/**
 * YAML 文件解析器
 * 使用 js-yaml 库
 */

import yaml from "js-yaml";

export interface YAMLParseResult {
    content: string;
    data: any;
    metadata: {
        type: "object" | "array" | "primitive";
    };
}

/**
 * 解析 YAML 文件
 */
export function parseYAML(
    buffer: Buffer,
    fileName: string
): YAMLParseResult {
    const text = buffer.toString("utf8");

    try {
        const data = yaml.load(text);

        let type: "object" | "array" | "primitive" = "primitive";
        if (Array.isArray(data)) {
            type = "array";
        } else if (data && typeof data === "object") {
            type = "object";
        }

        // 输出格式化的 JSON（更易读）
        const content = typeof data === "object"
            ? JSON.stringify(data, null, 2)
            : String(data);

        return {
            content,
            data,
            metadata: { type }
        };
    } catch (error: any) {
        throw new Error(`YAML 解析失败: ${error.message}`);
    }
}

export default parseYAML;


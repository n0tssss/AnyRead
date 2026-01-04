/**
 * JSON 文件解析器
 */

export interface JSONParseResult {
    content: string;
    data: any;
    metadata: {
        type: "object" | "array" | "primitive";
        keys?: string[];
        length?: number;
    };
}

/**
 * 解析 JSON 文件
 */
export function parseJSON(
    buffer: Buffer,
    fileName: string,
    prettify: boolean = true
): JSONParseResult {
    const text = buffer.toString("utf8");

    try {
        const data = JSON.parse(text);

        let type: "object" | "array" | "primitive" = "primitive";
        let keys: string[] | undefined;
        let length: number | undefined;

        if (Array.isArray(data)) {
            type = "array";
            length = data.length;
        } else if (data && typeof data === "object") {
            type = "object";
            keys = Object.keys(data);
        }

        return {
            content: prettify ? JSON.stringify(data, null, 2) : text,
            data,
            metadata: { type, keys, length }
        };
    } catch (error: any) {
        throw new Error(`JSON 解析失败: ${error.message}`);
    }
}

export default parseJSON;


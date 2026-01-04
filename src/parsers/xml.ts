/**
 * XML 文件解析器
 * 使用 xml2js 库
 */

export interface XMLParseResult {
    content: string;
    data: any;
    metadata: {
        rootElement?: string;
    };
}

/**
 * 解析 XML 文件
 */
export async function parseXML(
    buffer: Buffer,
    fileName: string
): Promise<XMLParseResult> {
    const text = buffer.toString("utf8");
    
    // 动态导入 xml2js
    const xml2js = await import("xml2js");
    const parseString = xml2js.parseString;

    return new Promise((resolve, reject) => {
        parseString(text, { explicitArray: false }, (err: any, result: any) => {
            if (err) {
                reject(new Error(`XML 解析失败: ${err.message}`));
                return;
            }

            const rootElement = result ? Object.keys(result)[0] : undefined;

            resolve({
                content: JSON.stringify(result, null, 2),
                data: result,
                metadata: { rootElement }
            });
        });
    });
}

export default parseXML;


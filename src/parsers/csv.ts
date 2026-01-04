/**
 * CSV 文件解析器
 */

import type { ParserConfig } from "../types.js";

export interface CSVParseResult {
    content: string;
    metadata: {
        rowCount: number;
        truncated: boolean;
    };
}

/**
 * 解析 CSV 文件
 */
export function parseCSV(
    buffer: Buffer,
    fileName: string,
    config?: ParserConfig["csv"]
): CSVParseResult {
    const delimiter = config?.delimiter ?? ",";
    const maxRows = config?.maxRows ?? 500;
    const outputFormat = config?.outputFormat ?? "markdown";

    const text = buffer.toString("utf8");
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length === 0) {
        return {
            content: "空文件",
            metadata: { rowCount: 0, truncated: false }
        };
    }

    const rowsToInclude = Math.min(lines.length, maxRows);
    const truncated = lines.length > maxRows;

    // 解析所有行
    const parsedRows: string[][] = [];
    for (let i = 0; i < rowsToInclude; i++) {
        parsedRows.push(parseCSVLine(lines[i], delimiter));
    }

    let content = "";

    if (outputFormat === "markdown") {
        content = formatAsMarkdown(parsedRows);
    } else if (outputFormat === "json") {
        content = formatAsJSON(parsedRows);
    } else {
        // 保持原始 CSV 格式
        content = parsedRows.map((row) => row.join(delimiter)).join("\n");
    }

    if (truncated) {
        content += `\n\n... 省略了 ${lines.length - maxRows} 行数据`;
    }

    return {
        content: content.trim(),
        metadata: {
            rowCount: rowsToInclude,
            truncated
        }
    };
}

/**
 * 解析单行 CSV（处理引号和转义）
 */
function parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    // 转义的引号
                    current += '"';
                    i++;
                } else {
                    // 结束引号
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === delimiter) {
                result.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
    }

    result.push(current.trim());
    return result;
}

function formatAsMarkdown(rows: string[][]): string {
    if (rows.length === 0) return "";

    let content = "";

    // 表头
    const header = rows[0].map((cell) => cell.replace(/\|/g, "\\|"));
    content += "| " + header.join(" | ") + " |\n";
    content += "| " + header.map(() => "---").join(" | ") + " |\n";

    // 数据行
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].map((cell) => cell.replace(/\|/g, "\\|"));
        content += "| " + row.join(" | ") + " |\n";
    }

    return content;
}

function formatAsJSON(rows: string[][]): string {
    if (rows.length === 0) return "[]";

    const headers = rows[0];
    const data: Record<string, string>[] = [];

    for (let i = 1; i < rows.length; i++) {
        const row: Record<string, string> = {};
        rows[i].forEach((cell, idx) => {
            const key = headers[idx] || `col${idx}`;
            row[key] = cell;
        });
        data.push(row);
    }

    return JSON.stringify(data, null, 2);
}

export default parseCSV;


/**
 * Excel 文件解析器 (.xlsx, .xls)
 */

import XLSX from "xlsx";
import type { ParserConfig, ParsedFile, RawSheetData, RawOutput } from "../types.js";

export interface ExcelParseResult {
    content: string;
    /** raw 格式时返回结构化数据 */
    rawData?: RawOutput;
    metadata: {
        sheetNames: string[];
        rowCount: number;
        truncated: boolean;
    };
}

/**
 * 解析 Excel 文件
 */
export function parseExcel(
    buffer: Buffer,
    fileName: string,
    config?: ParserConfig["excel"]
): ExcelParseResult {
    // maxRows 默认 -1 表示不限制，正数则限制行数
    const maxRows = config?.maxRows ?? -1;
    const allSheets = config?.allSheets ?? true;
    const outputFormat = config?.outputFormat ?? "markdown";

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames;
    const sheetsToProcess = allSheets ? sheetNames : [sheetNames[0]];

    let content = "";
    let totalRows = 0;
    let truncated = false;
    const rawSheets: RawSheetData[] = [];

    for (const sheetName of sheetsToProcess) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (jsonData.length === 0) continue;

        // maxRows <= 0 表示不限制
        const effectiveMaxRows = maxRows > 0 ? maxRows : jsonData.length;
        const rowsToInclude = Math.min(jsonData.length, effectiveMaxRows);
        if (maxRows > 0 && jsonData.length > maxRows) {
            truncated = true;
        }

        if (outputFormat === "raw") {
            // raw 格式：全表原始数据，返回完整二维数组，不做任何预处理
            // 调用方自行决定哪行是表头
            const rows = jsonData.slice(0, rowsToInclude).map((row: any[]) => 
                (row || []).map((cell: any) => cell)
            );
            rawSheets.push({
                name: sheetName,
                headers: [], // raw 格式不区分表头，由调用方自行处理
                rows,        // 全部行数据（包含表头行）
                totalRows: jsonData.length
            });
            // raw 格式也生成简要的文本内容（用于日志或调试）
            content += `【工作表: ${sheetName}】${jsonData.length} 行\n`;
        } else if (outputFormat === "markdown") {
            content += formatAsMarkdown(sheetName, jsonData, rowsToInclude);
        } else if (outputFormat === "json") {
            content += formatAsJSON(sheetName, jsonData, rowsToInclude);
        } else {
            content += formatAsCSV(jsonData, rowsToInclude);
        }

        totalRows += rowsToInclude;
    }

    return {
        content: content.trim(),
        rawData: outputFormat === "raw" ? { sheets: rawSheets } : undefined,
        metadata: {
            sheetNames,
            rowCount: totalRows,
            truncated
        }
    };
}

function formatAsMarkdown(sheetName: string, data: any[][], maxRows: number): string {
    let content = `\n【工作表: ${sheetName}】\n`;

    if (data.length > 0) {
        // 表头
        const header = (data[0] || []).map((cell) =>
            cell !== undefined && cell !== null ? String(cell).trim().replace(/\|/g, "\\|") : ""
        );
        content += "| " + header.join(" | ") + " |\n";
        content += "| " + header.map(() => "---").join(" | ") + " |\n";

        // 数据行
        for (let i = 1; i < maxRows && i < data.length; i++) {
            const row = (data[i] || []).map((cell) =>
                cell !== undefined && cell !== null ? String(cell).trim().replace(/\|/g, "\\|") : ""
            );
            content += "| " + row.join(" | ") + " |\n";
        }

        if (data.length > maxRows) {
            content += `\n... 省略了 ${data.length - maxRows} 行数据\n`;
        }
    }

    return content + "\n";
}

function formatAsJSON(sheetName: string, data: any[][], maxRows: number): string {
    const headers = data[0] || [];
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < maxRows && i < data.length; i++) {
        const row: Record<string, any> = {};
        (data[i] || []).forEach((cell, idx) => {
            const key = headers[idx] !== undefined ? String(headers[idx]) : `col${idx}`;
            row[key] = cell;
        });
        rows.push(row);
    }

    return JSON.stringify({ sheet: sheetName, data: rows }, null, 2) + "\n";
}

function formatAsCSV(data: any[][], maxRows: number): string {
    let content = "";

    for (let i = 0; i < maxRows && i < data.length; i++) {
        const row = (data[i] || []).map((cell) => {
            if (cell === undefined || cell === null) return "";
            const str = String(cell);
            // 如果包含逗号、引号或换行，需要用引号包裹
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        });
        content += row.join(",") + "\n";
    }

    return content;
}

export default parseExcel;


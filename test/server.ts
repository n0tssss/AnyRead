/**
 * AnyRead 测试服务器
 * 运行: npx ts-node test/server.ts
 * 或:   npm run dev:server
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 动态导入编译后的模块
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const PORT = 3456;

async function startServer() {
    // 导入编译后的 FileParser
    const { FileParser } = await import("../dist/index.mjs");

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || "/", `http://localhost:${PORT}`);

        // CORS
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
        }

        // 静态文件
        if (url.pathname === "/" || url.pathname === "/index.html") {
            const htmlPath = path.join(rootDir, "public", "index.html");
            if (fs.existsSync(htmlPath)) {
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(fs.readFileSync(htmlPath, "utf-8"));
                return;
            }
        }

        // API: 获取支持的格式
        if (url.pathname === "/api/formats" && req.method === "GET") {
            const formats = FileParser.getSupportedFormats();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, formats }));
            return;
        }

        // API: 解析文件
        if (url.pathname === "/api/parse" && req.method === "POST") {
            try {
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                    chunks.push(chunk);
                }
                const body = JSON.parse(Buffer.concat(chunks).toString());

                const { urls, concurrency = 3, ai } = body;

                if (!urls || !Array.isArray(urls) || urls.length === 0) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: "请提供文件 URL 数组" }));
                    return;
                }

                // 创建解析器
                const parser = new FileParser({
                    ai: ai || undefined,
                    logging: { enabled: true, level: "info" }
                });

                console.log(`\n📂 开始解析 ${urls.length} 个文件...`);

                const startTime = Date.now();
                const results = await parser.parseMany(urls, {
                    concurrency,
                    onProgress: (done, total, file) => {
                        console.log(`  [${done}/${total}] ${file?.fileName} - ${file?.success ? "✅" : "❌"}`);
                    }
                });
                const duration = Date.now() - startTime;

                const successCount = results.filter((r) => r.success).length;
                console.log(`✅ 完成: ${successCount}/${results.length} 成功，耗时 ${duration}ms\n`);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    duration,
                    total: results.length,
                    successCount,
                    results
                }));
            } catch (error: any) {
                console.error("❌ 解析错误:", error.message);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
            return;
        }

        // 404
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
    });

    server.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════╗
║         🔍 AnyRead 测试服务器已启动               ║
╠══════════════════════════════════════════════════╣
║  📌 测试页面: http://localhost:${PORT}/             ║
║  📌 API 端点: http://localhost:${PORT}/api/parse    ║
╚══════════════════════════════════════════════════╝
        `);
    });
}

startServer().catch(console.error);


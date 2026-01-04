# @n0ts123/anyread

**读取任意文件格式** - 一个工具搞定所有文件解析，本地能处理的用本地解析器，不能的交给 AI。

## 特性

- 📊 **表格文件**：Excel (.xlsx/.xls)、CSV → 本地解析
- 📝 **文档文件**：Word (.docx)、纯文本 (.txt/.rtf) → 本地解析
- 📄 **PDF 文件**：本地提取文本，失败自动降级到 AI
- 📋 **数据格式**：JSON、YAML、XML → 本地解析
- 🌐 **网页标记**：HTML、Markdown → 本地解析
- 🖼️ **图片识别**：JPG/PNG/GIF/WebP... → AI 视觉识别
- 🎵 **音频转写**：MP3/WAV/OGG... → AI 转写
- 🎬 **视频分析**：MP4/AVI/MOV... → AI 识别
- ⚡ **并发解析**：批量处理，进度回调，大幅提升速度
- 🔧 **灵活配置**：自定义模型、代理、超时、重试等

## 支持的文件格式

| 类型 | 扩展名 | 解析方式 | 使用的库 |
|------|--------|----------|----------|
| Excel | `.xlsx` `.xls` | 本地解析 | [xlsx](https://www.npmjs.com/package/xlsx) |
| CSV | `.csv` | 本地解析 | 内置 |
| Word | `.docx` | 本地解析 | [mammoth](https://www.npmjs.com/package/mammoth) |
| 纯文本 | `.txt` `.rtf` | 本地解析 | 内置 |
| PDF | `.pdf` | 本地解析 / AI 降级 | [pdf-parse](https://www.npmjs.com/package/pdf-parse) |
| JSON | `.json` | 本地解析 | 内置 |
| YAML | `.yaml` `.yml` | 本地解析 | [js-yaml](https://www.npmjs.com/package/js-yaml) |
| XML | `.xml` | 本地解析 | [xml2js](https://www.npmjs.com/package/xml2js) |
| HTML | `.html` `.htm` | 本地解析 | [cheerio](https://www.npmjs.com/package/cheerio) |
| Markdown | `.md` `.markdown` | 本地解析 | 内置 |
| 图片 | `.jpg` `.png` `.gif` `.webp` `.bmp` `.svg` `.ico` `.tiff` | AI 识别 | OpenAI / Gemini / Claude |
| 音频 | `.mp3` `.wav` `.ogg` `.m4a` `.flac` `.aac` | AI 转写 | OpenAI / Gemini / Claude |
| 视频 | `.mp4` `.avi` `.mov` `.webm` `.mkv` | AI 识别 | OpenAI / Gemini / Claude |

## 安装

```bash
npm install @n0ts123/anyread
# 或
yarn add @n0ts123/anyread
# 或
pnpm add @n0ts123/anyread
```

## 快速开始

### 基础使用（无需 AI）

```typescript
import { parse, parseMany, parseAndFormat } from '@n0ts123/anyread';

// 解析单个文件
const result = await parse('https://example.com/file.xlsx');
console.log(result.content);

// 批量并发解析
const files = await parseMany([
  'https://example.com/data.xlsx',
  'https://example.com/config.json',
  'https://example.com/readme.md'
], {
  concurrency: 5,  // 5 个并发
  onProgress: (done, total, file) => {
    console.log(`${done}/${total}: ${file?.fileName}`);
  }
});

// 解析并格式化为文本
const text = await parseAndFormat(urls, {
  includeTitle: true,
  separator: '---'
});
```

### 使用 AI 识别图片/音频/视频

```typescript
import { FileParser } from '@n0ts123/anyread';

// OpenAI
const parser = new FileParser({
  ai: {
    provider: 'openai',
    apiKey: 'sk-xxx',
    model: 'gpt-4o',
    baseURL: 'https://api.openai-proxy.com/v1' // 可选代理
  }
});

// Gemini
const parser = new FileParser({
  ai: {
    provider: 'gemini',
    apiKey: 'AIza...',
    model: 'gemini-2.0-flash'
  }
});

// Anthropic Claude
const parser = new FileParser({
  ai: {
    provider: 'anthropic',
    apiKey: 'sk-ant-xxx',
    model: 'claude-3-5-sonnet-20241022'
  }
});

// 解析图片
const result = await parser.parse('https://example.com/product.jpg');
console.log(result.content); // AI 识别结果
```

## 完整配置

```typescript
import { FileParser, type ParserConfig } from '@n0ts123/anyread';

const config: ParserConfig = {
  // AI 配置（用于图片/音频/视频识别）
  ai: {
    provider: 'openai', // 'openai' | 'gemini' | 'anthropic' | 'custom'
    apiKey: 'your-api-key',
    baseURL: 'https://api.openai.com/v1', // 可选，自定义代理
    model: 'gpt-4o',
    visionModel: 'gpt-4o', // 可选，图片识别专用模型
    timeout: 60000,
    maxRetries: 3,
    headers: {}
  },

  // 下载配置
  download: {
    timeout: 60000,
    maxSize: 50 * 1024 * 1024, // 50MB
    userAgent: 'Mozilla/5.0...',
    headers: {}
  },

  // Excel 解析配置
  excel: {
    maxRows: 500,
    allSheets: true,
    outputFormat: 'markdown' // 'markdown' | 'json' | 'csv'
  },

  // CSV 解析配置
  csv: {
    delimiter: ',',
    maxRows: 500,
    outputFormat: 'markdown'
  },

  // 日志配置
  logging: {
    enabled: true,
    level: 'info' // 'debug' | 'info' | 'warn' | 'error'
  }
};

const parser = new FileParser(config);
```

## API 参考

### FileParser 类

```typescript
class FileParser {
  constructor(config?: ParserConfig);
  
  // 解析单个文件
  parse(url: string): Promise<ParsedFile>;
  
  // 批量解析
  parseMany(urls: string[], options?: BatchParseOptions): Promise<ParsedFile[]>;
  
  // 格式化解析结果为文本
  format(files: ParsedFile[], options?: FormatOptions): string;
  
  // 检测文件类型
  detectFileType(filename: string): FileType;
  
  // 获取支持的格式列表
  static getSupportedFormats(): { extension: string; type: FileType; method: string }[];
}
```

### 便捷函数

```typescript
// 配置默认解析器
configure(config: ParserConfig): FileParser;

// 解析单个文件
parse(url: string, config?: ParserConfig): Promise<ParsedFile>;

// 批量解析
parseMany(urls: string[], options?: BatchParseOptions, config?: ParserConfig): Promise<ParsedFile[]>;

// 解析并格式化
parseAndFormat(urls: string[], formatOptions?: FormatOptions, config?: ParserConfig): Promise<string>;
```

### 类型定义

```typescript
type FileType = 
  | 'excel' | 'csv' | 'word' | 'text' | 'pdf'
  | 'json' | 'yaml' | 'xml' | 'html' | 'markdown'
  | 'image' | 'audio' | 'video' | 'unknown';

interface ParsedFile {
  fileName: string;
  url: string;
  type: FileType;
  content: string;
  success: boolean;
  error?: string;
  metadata?: {
    size?: number;
    mimeType?: string;
    sheetNames?: string[];
    rowCount?: number;
    truncated?: boolean;
  };
}

interface BatchParseOptions {
  concurrency?: number;      // 并发数，默认 3
  continueOnError?: boolean; // 出错时继续，默认 true
  onProgress?: (completed: number, total: number, current?: ParsedFile) => void;
}
```

## 使用的开源库

| 库 | 用途 | 许可证 |
|----|------|--------|
| [xlsx](https://www.npmjs.com/package/xlsx) | Excel 文件解析 | Apache-2.0 |
| [mammoth](https://www.npmjs.com/package/mammoth) | Word 文档解析 | BSD-2-Clause |
| [pdf-parse](https://www.npmjs.com/package/pdf-parse) | PDF 文本提取 | MIT |
| [js-yaml](https://www.npmjs.com/package/js-yaml) | YAML 解析 | MIT |
| [xml2js](https://www.npmjs.com/package/xml2js) | XML 解析 | MIT |
| [cheerio](https://www.npmjs.com/package/cheerio) | HTML 解析 | MIT |
| [axios](https://www.npmjs.com/package/axios) | HTTP 请求 | MIT |

## License

MIT © [n0ts](https://github.com/n0tssss)

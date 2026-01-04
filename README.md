# @n0ts123/anyread

**读取任意文件格式** - 一个工具搞定所有文件解析，本地能处理的用本地，不能的交给 AI。

## 特性

- 📊 **表格文件**：Excel (.xlsx/.xls)、CSV → 本地解析 → Markdown/JSON/CSV
- 📝 **文档文件**：Word (.docx)、纯文本 (.txt) → 本地解析
- 🖼️ **图片识别**：OpenAI / Gemini / Claude → AI 视觉识别
- 📄 **PDF 解析**：AI 视觉模型识别
- ⚡ **并发解析**：批量处理，进度回调，大幅提升速度
- 🔧 **灵活配置**：自定义模型、代理、超时、重试等
- 📦 **TypeScript**：完整类型定义
- 🌐 **双格式**：ESM + CommonJS 全支持

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

// 批量解析
const files = await parseMany([
  'https://example.com/data.xlsx',
  'https://example.com/info.csv',
  'https://example.com/doc.docx'
]);

// 解析并格式化为文本
const text = await parseAndFormat(urls, {
  includeTitle: true,
  separator: '---'
});
```

### 使用 AI 识别图片/PDF

```typescript
import { FileParser } from '@n0ts123/anyread';

// OpenAI
const parser = new FileParser({
  ai: {
    provider: 'openai',
    apiKey: 'sk-xxx',
    model: 'gpt-4o',
    // 可选：自定义代理
    baseURL: 'https://api.openai-proxy.com/v1'
  }
});

// Gemini
const parser = new FileParser({
  ai: {
    provider: 'gemini',
    apiKey: 'AIza...',
    model: 'gemini-2.0-flash',
    baseURL: 'https://generativelanguage.googleapis.com'
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

// 自定义 OpenAI 兼容 API
const parser = new FileParser({
  ai: {
    provider: 'custom',
    apiKey: 'your-key',
    baseURL: 'https://your-api.com/v1',
    model: 'your-model'
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
  // AI 配置（用于图片/PDF 识别）
  ai: {
    provider: 'openai', // 'openai' | 'gemini' | 'anthropic' | 'custom'
    apiKey: 'your-api-key',
    baseURL: 'https://api.openai.com/v1', // 可选，自定义代理
    model: 'gpt-4o', // 可选，默认根据 provider
    visionModel: 'gpt-4o', // 可选，图片识别专用模型
    timeout: 60000, // 请求超时（毫秒）
    maxRetries: 3, // 最大重试次数
    headers: {} // 自定义请求头
  },

  // 下载配置
  download: {
    timeout: 60000, // 下载超时
    maxSize: 50 * 1024 * 1024, // 最大文件大小 50MB
    userAgent: 'Mozilla/5.0...', // User-Agent
    headers: {} // 自定义请求头
  },

  // Excel 解析配置
  excel: {
    maxRows: 500, // 最大行数
    allSheets: true, // 是否解析所有工作表
    outputFormat: 'markdown' // 'markdown' | 'json' | 'csv'
  },

  // CSV 解析配置
  csv: {
    delimiter: ',', // 分隔符
    maxRows: 500, // 最大行数
    outputFormat: 'markdown'
  },

  // 图片解析配置
  image: {
    enableAI: true, // 是否启用 AI 识别
    prompt: '请分析这张图片...', // 自定义提示词
    maxTokens: 2000
  },

  // PDF 解析配置
  pdf: {
    enableAI: true,
    prompt: '请分析这个 PDF 文档...'
  },

  // 日志配置
  logging: {
    enabled: true,
    level: 'info', // 'debug' | 'info' | 'warn' | 'error'
    logger: (level, message, ...args) => {
      console.log(`[${level}] ${message}`, ...args);
    }
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

  // 从 URL 提取文件名
  extractFileName(url: string): string;
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

// 检测文件类型
detectFileType(filename: string): FileType;

// 提取文件名
extractFileName(url: string): string;
```

### 类型定义

```typescript
// 文件类型
type FileType = 'excel' | 'csv' | 'word' | 'text' | 'image' | 'pdf' | 'unknown';

// 解析结果
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

// 批量选项
interface BatchParseOptions {
  concurrency?: number; // 并发数，默认 3
  continueOnError?: boolean; // 出错时继续，默认 true
  onProgress?: (completed: number, total: number, current?: ParsedFile) => void;
}

// 格式化选项
interface FormatOptions {
  includeTitle?: boolean; // 包含文件名标题，默认 true
  includeUrl?: boolean; // 包含 URL，默认 false
  separator?: string; // 分隔符，默认 "---"
  onError?: 'skip' | 'include' | 'error'; // 失败处理，默认 'skip'
}
```

## 支持的文件格式

| 格式 | 扩展名 | 解析方式 |
|------|--------|----------|
| Excel | .xlsx, .xls | 本地解析 (xlsx 库) |
| CSV | .csv | 本地解析 |
| Word | .docx | 本地解析 (mammoth 库) |
| 纯文本 | .txt | 本地解析 |
| 图片 | .jpg, .jpeg, .png, .gif, .webp, .bmp | AI 视觉识别 |
| PDF | .pdf | AI 视觉识别 |

## 示例场景

### 场景 1：解析产品清单

```typescript
import { FileParser } from '@n0ts123/anyread';

const parser = new FileParser({
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!
  },
  excel: {
    maxRows: 1000,
    outputFormat: 'json'
  }
});

const result = await parser.parse('https://storage.com/products.xlsx');
const products = JSON.parse(result.content);
```

### 场景 2：识别产品图片

```typescript
import { FileParser } from '@n0ts123/anyread';

const parser = new FileParser({
  ai: {
    provider: 'gemini',
    apiKey: process.env.GEMINI_API_KEY!,
    model: 'gemini-2.0-flash'
  },
  image: {
    prompt: `请识别图片中的产品信息，包括：
1. 产品名称
2. 型号规格
3. 品牌
4. 其他可见参数
请以 JSON 格式输出。`
  }
});

const result = await parser.parse('https://storage.com/product.jpg');
console.log(result.content);
```

### 场景 3：批量处理多种文件

```typescript
import { parseMany } from '@n0ts123/anyread';

const files = await parseMany(
  [
    'https://storage.com/list.xlsx',
    'https://storage.com/photo.jpg',
    'https://storage.com/spec.pdf'
  ],
  {
    concurrency: 2,
    onProgress: (done, total, file) => {
      console.log(`进度: ${done}/${total} - ${file?.fileName}`);
    }
  },
  {
    ai: {
      provider: 'openai',
      apiKey: 'sk-xxx'
    }
  }
);
```

## License

MIT


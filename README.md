# PDF 转换服务

一个强大的 PDF 转换服务，支持 URL、HTML、图片等多种格式转换为 PDF。

## ✨ 核心特性

- 🌐 **URL 转 PDF** - 将网页转换为 PDF
- 📝 **HTML 转 PDF** - 支持 HTML 字符串和文件上传
- 🖼️ **图片转 PDF** - 单张/批量图片转换，支持长图自动分页
- 🎯 **智能 A4 优化** - 自动优化内容布局
- 🔧 **浏览器自适应** - 自动检测本地浏览器或使用轻量级内核
- 🚀 **跨平台支持** - Mac / Windows / Linux / Docker

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动服务（自动检测本地浏览器）
npm start
```

### Docker 部署

```bash
# 构建并运行
docker build -t pdf-service .
docker run -d -p 3000:3000 pdf-service
```

服务将在 `http://localhost:3000` 启动

## 📡 API 示例

### HTML 转 PDF
```bash
curl -X POST http://localhost:3000/pdf/html \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Hello PDF</h1>"}' \
  --output output.pdf
```

### URL 转 PDF
```bash
curl -X POST http://localhost:3000/pdf/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  --output output.pdf
```

### 健康检查
```bash
curl http://localhost:3000/health
```

## 🎯 浏览器配置

### 自动检测（推荐）
```bash
npm start  # 自动检测本地 Chrome
```

### 使用 Playwright 内置浏览器
```bash
npx playwright install chromium
export FORCE_PLAYWRIGHT=true
npm start
```

### 自定义浏览器路径
```bash
export CHROME_EXECUTABLE_PATH=/path/to/chrome
npm start
```

## 📚 完整文档

详细文档请查看 [`docs/`](./docs/) 目录：

| 文档 | 说明 |
|------|------|
| [API.md](./docs/API.md) | **API 接口文档** |
| [openapi.yaml](./docs/openapi.yaml) | **OpenAPI 3.0 规范** |
| [README.md](./docs/README.md) | 完整使用指南 |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | 详细部署指南 |
| [TEST_GUIDE.md](./docs/TEST_GUIDE.md) | 测试指南 |
| [UPGRADE_GUIDE.md](./docs/UPGRADE_GUIDE.md) | 升级指南 |
| [OPTIMIZATION_REPORT.md](./docs/OPTIMIZATION_REPORT.md) | 技术分析报告 |

## 🔧 环境变量

```bash
PORT=3000                              # 服务端口
FORCE_PLAYWRIGHT=false                 # 强制使用 Playwright 浏览器
CHROME_EXECUTABLE_PATH=/path/to/chrome # 自定义浏览器路径
NODE_ENV=production                    # 运行环境
```

## 📦 依赖要求

- Node.js >= 16.0.0
- npm >= 7.0.0

## 📄 License

ISC

---

**更多详情请查看 [完整文档](./docs/README.md)**


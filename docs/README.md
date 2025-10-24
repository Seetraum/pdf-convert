# PDF 转换服务

一个强大的 PDF 转换服务，支持 URL、HTML、图片等多种格式转换为 PDF。基于 Express + Playwright 构建。

## ✨ 主要特性

- 🌐 **URL 转 PDF** - 将网页转换为 PDF
- 📝 **HTML 转 PDF** - 支持 HTML 字符串和文件上传
- 🖼️ **图片转 PDF** - 单张/批量图片转换，自动处理长图分页
- 🎯 **智能 A4 优化** - 自动优化内容布局适配 A4 纸张
- 🔧 **灵活部署** - 自适应浏览器内核选择

## 🚀 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动服务
npm start

# 开发模式（自动重启）
npm run dev
```

服务将在 `http://localhost:3000` 启动

### Docker 部署

```bash
# 构建镜像
docker build -t pdf-service .

# 运行容器
docker run -p 3000:3000 pdf-service
```

## 🔍 浏览器内核自适应

本服务支持**智能浏览器内核选择**，优先级如下：

### 1️⃣ 环境变量指定路径
```bash
export CHROME_EXECUTABLE_PATH=/path/to/chrome
npm start
```

### 2️⃣ 本地安装的浏览器（自动检测）
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Linux: `/usr/bin/google-chrome` 或 `/usr/bin/chromium`

### 3️⃣ Playwright 内置 Chromium（轻量级）
```bash
# 首次使用需要安装
npx playwright install chromium

# 强制使用内置浏览器
export FORCE_PLAYWRIGHT=true
npm start
```

### 🐳 Docker 环境

Docker 环境会自动使用 Playwright 内置的轻量级 Chromium，无需额外配置。

## 📡 API 接口

### 1. URL 转 PDF
```bash
curl -X POST http://localhost:3000/pdf/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' \
  --output output.pdf
```

### 2. HTML 字符串转 PDF
```bash
curl -X POST http://localhost:3000/pdf/html \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello World</h1>"}' \
  --output output.pdf
```

### 3. HTML 文件转 PDF
```bash
curl -X POST http://localhost:3000/pdf/html-file \
  -F "htmlFile=@document.html" \
  --output output.pdf
```

### 4. 图片转 PDF
```bash
# 单张图片
curl -X POST http://localhost:3000/pdf/image \
  -F "imageFile=@image.jpg" \
  --output output.pdf

# 批量图片
curl -X POST http://localhost:3000/pdf/images \
  -F "imageFiles=@image1.jpg" \
  -F "imageFiles=@image2.jpg" \
  --output output.pdf
```

### 5. 健康检查
```bash
curl http://localhost:3000/health
```

返回示例：
```json
{
  "status": "healthy",
  "browser": {
    "working": true,
    "source": "local_installation",
    "path": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "initialized": "2025-10-24T10:00:00.000Z"
  },
  "environment": {
    "os": "darwin",
    "localChrome": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "envPath": "not set",
    "recommendation": "建议使用本地浏览器: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  },
  "timestamp": "2025-10-24T10:05:00.000Z",
  "uptime": 300.5
}
```

### 6. 服务信息
```bash
curl http://localhost:3000/info
```

## ⚙️ 环境变量配置

创建 `.env` 文件（参考 `.env.example`）：

```bash
# 服务端口
PORT=3000

# 浏览器配置
FORCE_PLAYWRIGHT=false
CHROME_EXECUTABLE_PATH=/path/to/chrome

# Node 环境
NODE_ENV=production
```

## 🎨 高级选项

### PDF 自定义选项

在请求中传递 `options` 参数：

```json
{
  "url": "https://example.com",
  "options": {
    "format": "A4",
    "landscape": false,
    "margin": {
      "top": "20mm",
      "bottom": "20mm",
      "left": "15mm",
      "right": "15mm"
    }
  }
}
```

### 图片转换选项

```json
{
  "options": {
    "fitMode": "contain",
    "backgroundColor": "white"
  }
}
```

## 🛠️ 故障排查

### 浏览器启动失败

如果遇到浏览器初始化错误，按照以下步骤排查：

1. **检查浏览器是否安装**
   ```bash
   # macOS
   ls "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   
   # Linux
   which google-chrome
   ```

2. **安装 Playwright 内置浏览器**
   ```bash
   npx playwright install chromium
   ```

3. **使用环境变量指定路径**
   ```bash
   export CHROME_EXECUTABLE_PATH=/path/to/chrome
   npm start
   ```

4. **强制使用 Playwright 内置浏览器**
   ```bash
   export FORCE_PLAYWRIGHT=true
   npm start
   ```

### Docker 相关问题

如果 Docker 容器中浏览器运行异常：

```bash
# 确保使用了正确的基础镜像
FROM mcr.microsoft.com/playwright:latest

# 安装完整的依赖
RUN npx playwright install chromium --with-deps
```

## 📦 依赖要求

- Node.js >= 16.0.0
- npm >= 7.0.0

主要依赖：
- `express` - Web 服务框架
- `playwright` - 浏览器自动化
- `sharp` - 图片处理
- `multer` - 文件上传

## 📝 项目结构

```
pdf-service/
├── converters/           # 转换器模块
│   ├── htmlConverter.js  # HTML 转换器
│   └── imageConverter.js # 图片转换器
├── utils/                # 工具函数
│   ├── pdfUtils.js       # PDF 工具
│   └── browserUtils.js   # 浏览器工具（智能检测）
├── pdf_service.js        # 主服务入口
├── package.json          # 项目配置
├── Dockerfile            # Docker 配置
└── README.md             # 项目文档
```

## 🔒 安全建议

1. 在生产环境使用时，建议添加认证机制
2. 限制上传文件大小（当前限制 50MB）
3. 使用反向代理（如 Nginx）处理外部请求
4. 定期更新依赖包

## 📄 License

ISC

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 首次运行可能需要下载浏览器内核（约 100-200MB），请耐心等待。


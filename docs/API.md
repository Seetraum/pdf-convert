# API 接口文档

本文档说明了 PDF 转换服务的所有 API 接口。

## 📋 OpenAPI 规范

完整的 OpenAPI 3.0 规范文档请查看：[openapi.yaml](./openapi.yaml)

您可以使用以下工具查看和测试 API：
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)

## 🌐 基础信息

- **Base URL**: `http://localhost:3000`
- **API Version**: `2.0.0`
- **Content-Type**: `application/json` (除文件上传接口外)

## 📡 接口列表

### 系统接口

#### 1. 健康检查

**GET** `/health`

检查服务运行状态和浏览器工作状态。

**响应示例**:
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
    "playwrightAvailable": true,
    "recommendation": "建议使用本地浏览器"
  },
  "timestamp": "2025-10-24T10:05:00.000Z",
  "uptime": 300.5
}
```

#### 2. 服务信息

**GET** `/info`

获取服务版本、功能列表和接口说明。

**响应示例**:
```json
{
  "service": "PDF转换服务",
  "version": "2.0.0",
  "features": [
    "URL转PDF - 支持网页转换",
    "HTML字符串转PDF - 智能A4优化",
    "HTML文件转PDF - 文件上传支持",
    "单张图片转PDF - 自动分页长图",
    "批量图片转PDF - 多图合并",
    "HTML预处理 - 内容分析和优化"
  ],
  "limits": {
    "maxFileSize": "50MB",
    "maxImages": 20,
    "timeout": "30秒"
  },
  "endpoints": {
    "POST /pdf/url": "URL转PDF",
    "POST /pdf/html": "HTML字符串转PDF",
    "POST /pdf/html-file": "HTML文件转PDF",
    "POST /pdf/image": "单张图片转PDF",
    "POST /pdf/images": "批量图片转PDF",
    "POST /preview/html": "HTML预处理预览",
    "GET /health": "健康检查",
    "GET /info": "服务信息"
  }
}
```

---

### PDF 转换接口

#### 3. URL 转 PDF

**POST** `/pdf/url`

将指定的 URL 网页转换为 PDF 文档。

**请求体**:
```json
{
  "url": "https://example.com",
  "options": {
    "format": "A4",
    "landscape": false
  }
}
```

**cURL 示例**:
```bash
curl -X POST http://localhost:3000/pdf/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  --output output.pdf
```

**响应**: PDF 文件（二进制）

---

#### 4. HTML 字符串转 PDF

**POST** `/pdf/html`

将 HTML 字符串转换为 PDF 文档，支持智能 A4 优化。

**请求体**:
```json
{
  "html": "<h1>标题</h1><p>内容</p>",
  "options": {
    "format": "A4",
    "margin": {
      "top": "20px",
      "bottom": "20px",
      "left": "0px",
      "right": "0px"
    }
  }
}
```

**cURL 示例**:
```bash
curl -X POST http://localhost:3000/pdf/html \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Hello PDF</h1>"}' \
  --output output.pdf
```

**完整 HTML 示例**:
```bash
curl -X POST http://localhost:3000/pdf/html \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>测试</title></head><body><h1>标题</h1><p>内容</p></body></html>",
    "options": {
      "format": "A4",
      "landscape": false
    }
  }' \
  --output output.pdf
```

**响应**: PDF 文件（二进制）

---

#### 5. HTML 文件转 PDF

**POST** `/pdf/html-file`

上传 HTML 文件并转换为 PDF。

**请求**: multipart/form-data
- `htmlFile`: HTML 文件（必需）
- `options`: JSON 格式的 PDF 选项（可选）

**cURL 示例**:
```bash
curl -X POST http://localhost:3000/pdf/html-file \
  -F "htmlFile=@document.html" \
  -F 'options={"format":"A4"}' \
  --output output.pdf
```

**响应**: PDF 文件（二进制）

---

#### 6. 单张图片转 PDF

**POST** `/pdf/image`

将单张图片转换为 PDF，支持自动分页长图。

**支持格式**: JPG, PNG, GIF, WebP, SVG

**请求**: multipart/form-data
- `imageFile`: 图片文件（必需）
- `options`: JSON 格式的选项（可选）

**cURL 示例**:
```bash
curl -X POST http://localhost:3000/pdf/image \
  -F "imageFile=@image.jpg" \
  -F 'options={"fitMode":"contain","backgroundColor":"white"}' \
  --output output.pdf
```

**可选参数**:
- `fitMode`: 图片适配模式（`contain`、`cover`、`fill`）
- `backgroundColor`: 背景颜色（默认 `white`）

**响应**: PDF 文件（二进制）

---

#### 7. 批量图片转 PDF

**POST** `/pdf/images`

将多张图片合并转换为一个 PDF 文档。

**请求**: multipart/form-data
- `imageFiles`: 图片文件数组（最多 20 张）
- `options`: JSON 格式的选项（可选）

**cURL 示例**:
```bash
curl -X POST http://localhost:3000/pdf/images \
  -F "imageFiles=@image1.jpg" \
  -F "imageFiles=@image2.jpg" \
  -F "imageFiles=@image3.jpg" \
  --output output.pdf
```

**响应**: PDF 文件（二进制）

---

#### 8. HTML 预处理预览

**POST** `/preview/html`

预览 HTML 处理结果，不生成 PDF。用于测试和调试。

**请求体**:
```json
{
  "html": "<h1>测试</h1><p>预览内容</p>",
  "options": {
    "format": "A4"
  }
}
```

**cURL 示例**:
```bash
curl -X POST http://localhost:3000/preview/html \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>测试</h1>"}' | jq
```

**响应示例**:
```json
{
  "processedHTML": "<!DOCTYPE html>...",
  "analysis": {
    "type": "article",
    "complexity": "medium",
    "features": ["headings"],
    "estimatedPages": 1,
    "hasImages": false,
    "hasTables": false,
    "hasLists": false,
    "hasCode": false,
    "textLength": 50
  },
  "issues": [],
  "optimization": {
    "fontSize": "13px",
    "lineHeight": "1.5",
    "addPageBreaks": true
  }
}
```

---

## ⚙️ PDF 选项参数

所有 PDF 转换接口都支持以下选项参数：

```json
{
  "options": {
    "format": "A4",           // 页面格式：A4, A3, Letter, Legal
    "landscape": false,       // 是否横向
    "margin": {
      "top": "20px",         // 上边距（分页时生效）
      "bottom": "20px",      // 下边距（分页时生效）
      "left": "0px",         // 左边距
      "right": "0px"         // 右边距
    },
    "printBackground": true,  // 是否打印背景
    "preferCSSPageSize": false // 是否优先使用 CSS 定义的页面尺寸
  }
}
```

### 边距说明

**新的边距策略**（v2.0.0+）：
- **上下边距**: 只在分页时添加，默认 20px
- **左右边距**: 不添加边距（0px），内容充满整个页面宽度
- 这样可以最大化利用页面空间，特别适合图片和表格内容

---

## 🔧 错误响应

所有接口在出错时返回 JSON 格式的错误信息：

```json
{
  "error": "错误类型",
  "details": "详细错误信息"
}
```

### 常见错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 413 | 文件过大或数量超过限制 |
| 500 | 服务器内部错误 |

**示例**:

```json
{
  "error": "Missing required parameter",
  "details": "url parameter is required"
}
```

```json
{
  "error": "文件大小超过限制(50MB)"
}
```

```json
{
  "error": "PDF conversion failed",
  "details": "Browser initialization failed"
}
```

---

## 📊 使用限制

| 限制项 | 值 |
|--------|-----|
| 最大文件大小 | 50MB |
| 最大图片数量 | 20 张 |
| 请求超时时间 | 30 秒 |

---

## 🔒 认证（可选）

当前版本不需要认证。如需在生产环境中添加认证，可以使用：

- API Key 认证（在请求头中添加 `X-API-Key`）
- JWT Token
- OAuth 2.0

在 `openapi.yaml` 中已定义了 API Key 认证的结构，可根据需要启用。

---

## 🧪 测试接口

### 使用 cURL

```bash
# 健康检查
curl http://localhost:3000/health

# HTML 转 PDF
curl -X POST http://localhost:3000/pdf/html \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>测试</h1>"}' \
  --output test.pdf
```

### 使用 Postman

1. 导入 `openapi.yaml` 文件
2. 选择接口并设置参数
3. 点击 Send 发送请求
4. 对于 PDF 接口，选择 "Send and Download" 保存文件

### 使用 Swagger UI

```bash
# 在线查看和测试
docker run -p 8080:8080 \
  -e SWAGGER_JSON=/docs/openapi.yaml \
  -v $(pwd)/docs:/docs \
  swaggerapi/swagger-ui

# 访问 http://localhost:8080
```

---

## 📚 更多资源

- [完整文档](./README.md)
- [部署指南](./DEPLOYMENT.md)
- [测试指南](./TEST_GUIDE.md)
- [OpenAPI 规范](./openapi.yaml)

---

**更新日期**: 2025-10-24  
**API 版本**: 2.0.0


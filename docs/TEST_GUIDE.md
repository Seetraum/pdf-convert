# 测试指南

## ✅ 服务状态

服务已成功启动并运行在：**http://localhost:3000**

### 🎉 自动检测结果

- ✅ **操作系统**：macOS (darwin)
- ✅ **浏览器来源**：local_installation（本地安装）
- ✅ **浏览器路径**：`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- ✅ **浏览器状态**：working（正常工作）
- ✅ **服务版本**：2.0.0

## 🧪 测试命令

### 1. 健康检查
```bash
curl http://localhost:3000/health | python3 -m json.tool
```

**预期结果**：返回 `"status": "healthy"` 和详细的浏览器信息

---

### 2. 服务信息
```bash
curl http://localhost:3000/info | python3 -m json.tool
```

**预期结果**：显示服务版本、功能列表、接口说明

---

### 3. HTML 转 PDF（简单测试）
```bash
curl -X POST http://localhost:3000/pdf/html \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Hello PDF</h1><p>这是一个测试</p>"}' \
  --output hello.pdf

# 查看生成的文件
open hello.pdf
```

---

### 4. HTML 转 PDF（复杂内容）
```bash
curl -X POST http://localhost:3000/pdf/html \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><head><meta charset=\"utf-8\"><style>body{font-family:Arial;padding:20px;}h1{color:#2c3e50;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#3498db;color:white;}</style></head><body><h1>测试报告</h1><h2>浏览器自适应功能</h2><table><tr><th>项目</th><th>状态</th></tr><tr><td>本地浏览器检测</td><td>✅ 通过</td></tr><tr><td>自动环境适配</td><td>✅ 通过</td></tr><tr><td>PDF 生成</td><td>✅ 通过</td></tr><tr><td>跨平台支持</td><td>✅ 通过</td></tr></table><p style=\"color:green;font-weight:bold;margin-top:20px;\">所有测试通过！</p></body></html>"
  }' \
  --output report.pdf

open report.pdf
```

---

### 5. URL 转 PDF
```bash
curl -X POST http://localhost:3000/pdf/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' \
  --output example.pdf

open example.pdf
```

---

### 6. 测试中文支持
```bash
curl -X POST http://localhost:3000/pdf/html \
  -H "Content-Type: application/json" \
  -d '{"html":"<html><head><meta charset=\"utf-8\"></head><body><h1>中文测试</h1><p>这是中文内容测试。</p><p>支持各种字符：你好世界 🌍</p><ul><li>列表项目 1</li><li>列表项目 2</li><li>列表项目 3</li></ul></body></html>"}' \
  --output chinese.pdf

open chinese.pdf
```

---

### 7. 测试图片转 PDF

首先创建一个测试 HTML 文件：
```bash
cat > test.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>测试页面</title>
</head>
<body>
    <h1>测试页面</h1>
    <p>这是一个测试页面</p>
</body>
</html>
EOF
```

然后上传转换：
```bash
curl -X POST http://localhost:3000/pdf/html-file \
  -F "htmlFile=@test.html" \
  --output test-file.pdf

open test-file.pdf
```

---

### 8. HTML 预处理预览
```bash
curl -X POST http://localhost:3000/preview/html \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>测试</h1><p>预览 HTML 处理结果</p>"}' \
  | python3 -m json.tool
```

**预期结果**：返回处理后的 HTML、分析结果、问题诊断

---

## 📊 性能测试

### 并发测试（可选）
```bash
# 安装 Apache Bench（如果没有）
# brew install httpd

# 测试 100 个请求，10 个并发
ab -n 100 -c 10 -p payload.json -T application/json \
  http://localhost:3000/pdf/html
```

准备 payload.json：
```bash
echo '{"html":"<h1>性能测试</h1>"}' > payload.json
```

---

## 🔍 调试和监控

### 查看服务日志
如果服务有日志文件：
```bash
tail -f service.log
```

### 查看进程信息
```bash
# 查看 Node.js 进程
ps aux | grep node

# 查看端口占用
lsof -i:3000
```

### 查看资源占用
```bash
# 内存和 CPU 使用情况
top -pid $(lsof -ti:3000)
```

---

## 🛑 停止服务

```bash
# 查找进程 ID
lsof -ti:3000

# 停止服务（替换 PID）
kill -9 <PID>

# 或者一行命令
kill -9 $(lsof -ti:3000)
```

---

## 🧹 清理测试文件

```bash
cd /Users/seetraum/project/pdf-service

# 删除生成的测试 PDF
rm -f *.pdf test.html payload.json

# 确认清理
ls *.pdf 2>/dev/null || echo "所有测试文件已清理"
```

---

## 📝 测试检查清单

测试完成后，请确认：

- [ ] 健康检查返回 healthy 状态
- [ ] 服务信息显示正确
- [ ] HTML 转 PDF 功能正常
- [ ] 中文内容正确显示
- [ ] 生成的 PDF 可以正常打开
- [ ] URL 转 PDF 功能正常（如有网络）
- [ ] 文件上传转换功能正常
- [ ] 浏览器自动检测成功
- [ ] 没有错误日志

---

## 🎯 浏览器测试（Postman/Insomnia）

你也可以使用 API 测试工具进行测试：

### Postman 配置示例

**1. 健康检查**
- Method: GET
- URL: http://localhost:3000/health

**2. HTML 转 PDF**
- Method: POST
- URL: http://localhost:3000/pdf/html
- Headers: Content-Type: application/json
- Body (raw JSON):
```json
{
  "html": "<h1>Hello PDF</h1>"
}
```
- 在 Response 中选择 "Send and Download" 保存 PDF

---

## 📱 Web 界面测试（可选）

如果需要 Web 界面，可以创建一个简单的测试页面：

```bash
cat > test-ui.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PDF 服务测试</title>
    <style>
        body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
        textarea { width: 100%; height: 200px; margin: 10px 0; }
        button { padding: 10px 20px; background: #3498db; color: white; border: none; cursor: pointer; }
        button:hover { background: #2980b9; }
    </style>
</head>
<body>
    <h1>PDF 转换服务测试</h1>
    <textarea id="html" placeholder="输入 HTML 内容..."><h1>测试标题</h1><p>测试内容</p></textarea>
    <button onclick="generatePDF()">生成 PDF</button>
    <div id="status"></div>
    
    <script>
        async function generatePDF() {
            const html = document.getElementById('html').value;
            const status = document.getElementById('status');
            status.textContent = '生成中...';
            
            try {
                const response = await fetch('http://localhost:3000/pdf/html', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ html })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'output.pdf';
                    a.click();
                    status.textContent = '✅ PDF 生成成功！';
                } else {
                    status.textContent = '❌ 生成失败：' + response.statusText;
                }
            } catch (error) {
                status.textContent = '❌ 错误：' + error.message;
            }
        }
    </script>
</body>
</html>
EOF

# 用浏览器打开测试页面
open test-ui.html
```

---

## 🎉 测试成功标准

当以下所有项目都正常时，说明服务运行完美：

1. ✅ 服务成功启动在端口 3000
2. ✅ 健康检查返回 healthy
3. ✅ 自动检测到本地浏览器
4. ✅ 能够生成 PDF 文件
5. ✅ 生成的 PDF 可以正常打开和查看
6. ✅ 中文内容正确显示
7. ✅ 没有错误和警告信息

---

**祝测试顺利！** 🚀


# 部署指南

本文档详细说明如何在不同环境中部署 PDF 转换服务。

## 📋 目录

1. [本地开发环境](#本地开发环境)
2. [Docker 容器部署](#docker-容器部署)
3. [云服务器部署](#云服务器部署)
4. [浏览器内核选择策略](#浏览器内核选择策略)

---

## 🖥️ 本地开发环境

### macOS

```bash
# 1. 克隆项目
git clone <repository-url>
cd pdf-service

# 2. 安装依赖
npm install

# 3. 方案 A: 使用本地 Chrome（推荐）
# 确保已安装 Chrome 浏览器
# 服务会自动检测: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
npm start

# 3. 方案 B: 使用 Playwright 内置浏览器
npx playwright install chromium
export FORCE_PLAYWRIGHT=true
npm start
```

### Windows

```bash
# 1. 安装依赖
npm install

# 2. 方案 A: 使用本地 Chrome
# 服务会自动检测系统中的 Chrome
npm start

# 2. 方案 B: 使用 Playwright 内置浏览器
npx playwright install chromium
set FORCE_PLAYWRIGHT=true
npm start
```

### Linux (Ubuntu/Debian)

```bash
# 1. 安装系统依赖
sudo apt-get update
sudo apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2

# 2. 安装 Chrome（可选，推荐）
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get install -f

# 3. 安装 Node.js 依赖
npm install

# 4. 启动服务
npm start

# 或使用 Playwright 内置浏览器
npx playwright install chromium --with-deps
export FORCE_PLAYWRIGHT=true
npm start
```

---

## 🐳 Docker 容器部署

### 基础部署

```bash
# 1. 构建镜像
docker build -t pdf-service:latest .

# 2. 运行容器
docker run -d \
  --name pdf-service \
  -p 3000:3000 \
  pdf-service:latest

# 3. 查看日志
docker logs -f pdf-service

# 4. 停止服务
docker stop pdf-service
```

### Docker Compose 部署

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  pdf-service:
    build: .
    container_name: pdf-service
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - FORCE_PLAYWRIGHT=true
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    volumes:
      - ./logs:/app/logs
    networks:
      - pdf-network

networks:
  pdf-network:
    driver: bridge
```

启动服务：

```bash
docker-compose up -d
docker-compose logs -f
```

### 生产环境优化

创建优化的 `Dockerfile.prod`:

```dockerfile
FROM mcr.microsoft.com/playwright:latest

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 安装 Playwright Chromium
RUN npx playwright install chromium --with-deps

# 复制应用代码
COPY . .

# 设置环境变量
ENV FORCE_PLAYWRIGHT=true
ENV NODE_ENV=production
ENV PORT=3000

# 创建非 root 用户
RUN groupadd -r pdfuser && useradd -r -g pdfuser pdfuser
RUN chown -R pdfuser:pdfuser /app

# 切换到非 root 用户
USER pdfuser

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动服务
CMD ["node", "pdf_service.js"]
```

构建和运行：

```bash
docker build -f Dockerfile.prod -t pdf-service:prod .
docker run -d -p 3000:3000 --name pdf-service-prod pdf-service:prod
```

---

## ☁️ 云服务器部署

### AWS EC2

```bash
# 1. SSH 连接到 EC2 实例
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 克隆项目
git clone <repository-url>
cd pdf-service

# 4. 安装依赖
npm install
npx playwright install chromium --with-deps

# 5. 使用 PM2 管理进程
sudo npm install -g pm2
pm2 start pdf_service.js --name pdf-service
pm2 startup
pm2 save

# 6. 配置防火墙
sudo ufw allow 3000
sudo ufw enable

# 7. 使用 Nginx 反向代理（推荐）
sudo apt-get install nginx

# 创建 Nginx 配置
sudo tee /etc/nginx/sites-available/pdf-service << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 启用配置
sudo ln -s /etc/nginx/sites-available/pdf-service /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 阿里云 / 腾讯云

类似 AWS EC2 部署，主要步骤：

```bash
# 1. 安装 Node.js 和依赖
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 配置项目
cd /opt
git clone <repository-url> pdf-service
cd pdf-service
npm install
npx playwright install chromium --with-deps

# 3. 创建 systemd 服务
sudo tee /etc/systemd/system/pdf-service.service << 'EOF'
[Unit]
Description=PDF Conversion Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/pdf-service
Environment="NODE_ENV=production"
Environment="FORCE_PLAYWRIGHT=true"
ExecStart=/usr/bin/node pdf_service.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 4. 启动服务
sudo systemctl daemon-reload
sudo systemctl enable pdf-service
sudo systemctl start pdf-service
sudo systemctl status pdf-service
```

### Kubernetes 部署

创建 `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pdf-service
  labels:
    app: pdf-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pdf-service
  template:
    metadata:
      labels:
        app: pdf-service
    spec:
      containers:
      - name: pdf-service
        image: pdf-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: FORCE_PLAYWRIGHT
          value: "true"
        resources:
          limits:
            memory: "1Gi"
            cpu: "1000m"
          requests:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 20
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: pdf-service
spec:
  selector:
    app: pdf-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

部署：

```bash
kubectl apply -f k8s-deployment.yaml
kubectl get pods
kubectl get services
```

---

## 🎯 浏览器内核选择策略

### 场景 1: 本地开发（Mac/Windows）

**推荐**: 使用系统安装的 Chrome

```bash
# 自动检测本地 Chrome
npm start
```

**优点**:
- 无需额外下载
- 启动速度快
- 完整浏览器功能

### 场景 2: Docker 容器

**推荐**: 使用 Playwright 内置 Chromium

```bash
export FORCE_PLAYWRIGHT=true
```

**优点**:
- 轻量级（约 150MB）
- 无外部依赖
- 容器环境优化

### 场景 3: 云服务器（Linux）

**方案 A**: 安装系统 Chrome（推荐用于单机）

```bash
# 安装 Chrome
sudo apt-get install google-chrome-stable
npm start
```

**方案 B**: 使用 Playwright（推荐用于容器化）

```bash
npx playwright install chromium --with-deps
export FORCE_PLAYWRIGHT=true
npm start
```

### 场景 4: 自定义浏览器路径

```bash
# 方式 1: 环境变量
export CHROME_EXECUTABLE_PATH=/custom/path/to/chrome
npm start

# 方式 2: .env 文件
echo "CHROME_EXECUTABLE_PATH=/custom/path/to/chrome" > .env
npm start
```

---

## 🔧 环境变量完整列表

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `PORT` | 服务端口 | `3000` | `8080` |
| `NODE_ENV` | 运行环境 | `development` | `production` |
| `FORCE_PLAYWRIGHT` | 强制使用 Playwright 内置浏览器 | `false` | `true` |
| `CHROME_EXECUTABLE_PATH` | 自定义浏览器路径 | `null` | `/usr/bin/chrome` |

---

## 📊 性能优化建议

### 1. 浏览器复用

服务已实现浏览器实例复用，避免频繁启动和关闭。

### 2. 内存管理

```bash
# 设置 Node.js 内存限制
node --max-old-space-size=2048 pdf_service.js
```

### 3. 并发控制

根据服务器配置调整并发数：
- 2GB 内存: 2-3 个并发请求
- 4GB 内存: 5-8 个并发请求
- 8GB+ 内存: 10+ 个并发请求

### 4. 负载均衡

使用 Nginx 或 HAProxy 进行负载均衡：

```nginx
upstream pdf_backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    location / {
        proxy_pass http://pdf_backend;
    }
}
```

---

## 🛡️ 安全建议

1. **使用 HTTPS**
   ```bash
   # 使用 Let's Encrypt
   sudo certbot --nginx -d your-domain.com
   ```

2. **添加认证**
   - JWT Token
   - API Key
   - OAuth 2.0

3. **限流保护**
   ```bash
   npm install express-rate-limit
   ```

4. **防火墙配置**
   ```bash
   # 只允许特定 IP
   sudo ufw allow from your-ip to any port 3000
   ```

---

## 📝 故障排查

### 问题 1: 浏览器启动失败

```bash
# 检查浏览器是否安装
npx playwright install chromium --with-deps

# 检查系统依赖
ldd $(which chromium) | grep "not found"
```

### 问题 2: 内存不足

```bash
# 增加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 问题 3: PDF 生成超时

```javascript
// 在 pdf_service.js 中增加超时时间
await page.goto(url, {
  waitUntil: "networkidle",
  timeout: 60000  // 增加到 60 秒
});
```

---

## 📞 技术支持

遇到问题？请查看：
1. [README.md](./README.md) - 基础使用文档
2. [GitHub Issues](your-repo-url/issues) - 提交问题
3. 日志文件 - 检查详细错误信息

---

**更新日期**: 2025-10-24


FROM mcr.microsoft.com/playwright:latest

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装 Node.js 依赖
RUN npm install --production

# 安装 Playwright Chromium (轻量级浏览器内核)
RUN npx playwright install chromium --with-deps

# 复制应用代码
COPY . .

# 设置环境变量 - 强制使用 Playwright 内置浏览器
ENV FORCE_PLAYWRIGHT=true
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "pdf_service.js"]
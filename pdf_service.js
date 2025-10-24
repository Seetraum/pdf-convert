// pdf_service.js
import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

// 导入自定义模块
import { PDF_OPTIONS } from './utils/pdfUtils.js';
import { processSingleImage, processMultipleImages } from './converters/imageConverter.js';
import { processHTMLString, processHTMLFile, addSmartPageBreaks, validateAndCleanHTML } from './converters/htmlConverter.js';
import { initializeBrowser, validateBrowser, getBrowserInfo } from './utils/browserUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 配置body parser
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB限制
  fileFilter: (req, file, cb) => {
    // 允许HTML文件和图片文件
    const allowedTypes = [
      'text/html',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.html')) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  }
});

// 日志中间件
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const { method, url, ip } = req;
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
  next();
};

app.use(logger);

// 全局浏览器实例
let browser;
let browserInfo;

const initBrowser = async () => {
  try {
    console.log('[启动] 正在初始化 Chromium 浏览器...');
    console.log('========================================');
    
    // 显示浏览器环境信息
    const envInfo = getBrowserInfo();
    console.log('[环境信息]');
    console.log(`  操作系统: ${envInfo.os}`);
    console.log(`  本地浏览器: ${envInfo.localChrome}`);
    console.log(`  环境变量路径: ${envInfo.envPath}`);
    console.log(`  推荐: ${envInfo.recommendation}`);
    console.log('========================================');
    
    // 智能初始化浏览器
    const result = await initializeBrowser({
      headless: true,
      forcePlaywright: process.env.FORCE_PLAYWRIGHT === 'true'
    });
    
    browser = result.browser;
    browserInfo = {
      source: result.source,
      path: result.path,
      initialized: new Date().toISOString()
    };
    
    console.log('========================================');
    console.log('[成功] 浏览器初始化完成');
    console.log(`  来源: ${browserInfo.source}`);
    console.log(`  路径: ${browserInfo.path}`);
    console.log('========================================');
    
    // 验证浏览器是否正常工作
    const isValid = await validateBrowser(browser);
    if (!isValid) {
      throw new Error('浏览器验证失败');
    }
    console.log('[验证] ✓ 浏览器功能正常\n');
    
  } catch (error) {
    console.error('========================================');
    console.error('[错误] 浏览器初始化失败:', error.message);
    console.error('========================================');
    console.error('\n故障排查建议:');
    console.error('1. 确保系统已安装 Chrome 或 Chromium');
    console.error('2. 运行: npx playwright install chromium');
    console.error('3. 设置环境变量: export CHROME_EXECUTABLE_PATH=/path/to/chrome');
    console.error('4. 使用内置浏览器: export FORCE_PLAYWRIGHT=true');
    console.error('========================================\n');
    process.exit(1);
  }
};

// 优雅关闭浏览器
const closeBrowser = async () => {
  if (browser) {
    console.log('[关闭] 正在关闭 Chromium 浏览器...');
    try {
      await browser.close();
      console.log('[完成] Chromium 浏览器已关闭');
    } catch (error) {
      console.error('[错误] 关闭浏览器时发生错误:', error);
    }
  }
};

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

// 通用PDF生成函数
async function generatePDF(html, options = {}) {
  let context;
  try {
    context = await browser.newContext();
    const page = await context.newPage();

    console.log('[PDF生成] 正在设置HTML内容');
    await page.setContent(html, { 
      waitUntil: "networkidle",
      timeout: 30000 
    });

    // 等待图片和其他资源加载
    await page.waitForLoadState('networkidle');

    console.log('[PDF生成] HTML内容设置完成，开始生成PDF');
    const pdfBuffer = await page.pdf({
      ...PDF_OPTIONS,
      ...options
    });

    console.log(`[PDF生成] 完成，大小: ${pdfBuffer.length} bytes`);
    return pdfBuffer;

  } finally {
    if (context) {
      await context.close();
    }
  }
}

// URL 转 PDF
app.post("/pdf/url", async (req, res) => {
  const startTime = Date.now();
  const { url, options = {} } = req.body;
  
  console.log(`[URL->PDF] 开始处理: ${url}`);
  
  if (!url) {
    console.log('[错误] URL参数缺失');
    return res.status(400).send({ error: "Missing url parameter" });
  }

  let context;
  try {
    context = await browser.newContext();
    const page = await context.newPage();

    console.log(`[URL->PDF] 正在加载页面: ${url}`);
    await page.goto(url, { 
      waitUntil: "networkidle",
      timeout: 30000 
    });

    // 注入A4优化样式（只在分页时添加上下边距）
    await page.addStyleTag({
      content: `
        @page { 
          size: A4; 
          margin: 20px 0px; 
        }
        body { 
          max-width: 210mm; 
          margin: 0 auto;
          padding: 20px 0px;
          font-family: Arial, sans-serif;
          line-height: 1.4;
        }
        img { 
          max-width: 100%; 
          height: auto; 
          page-break-inside: avoid; 
        }
        table { 
          page-break-inside: avoid; 
          border-collapse: collapse; 
        }
        h1, h2, h3, h4, h5, h6 { 
          page-break-after: avoid; 
        }
      `
    });

    console.log('[URL->PDF] 页面加载完成，开始生成PDF');
    const pdfBuffer = await page.pdf({
      ...PDF_OPTIONS,
      ...options
    });

    const duration = Date.now() - startTime;
    console.log(`[URL->PDF] 转换完成，耗时: ${duration}ms，大小: ${pdfBuffer.length} bytes`);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="url-output.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[URL->PDF] 转换失败，耗时: ${duration}ms，错误:`, err.message);
    res.status(500).send({ 
      error: "PDF conversion failed", 
      details: err.message 
    });
  } finally {
    if (context) {
      await context.close();
    }
  }
});

// HTML 字符串转 PDF
app.post("/pdf/html", async (req, res) => {
  const startTime = Date.now();
  const { html, options = {} } = req.body;
  
  console.log('[HTML->PDF] 开始处理HTML字符串转换');
  
  if (!html) {
    console.log('[错误] HTML参数缺失');
    return res.status(400).send({ error: "Missing html parameter" });
  }

  try {
    // 验证和清理HTML
    const { html: cleanedHTML, issues } = validateAndCleanHTML(html);
    
    // 处理HTML内容
    const result = await processHTMLString(cleanedHTML, options);
    
    // 生成PDF
    const pdfBuffer = await generatePDF(result.html, options);

    const duration = Date.now() - startTime;
    console.log(`[HTML->PDF] 转换完成，耗时: ${duration}ms，大小: ${pdfBuffer.length} bytes`);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="html-output.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[HTML->PDF] 转换失败，耗时: ${duration}ms，错误:`, err.message);
    res.status(500).send({ 
      error: "PDF conversion failed", 
      details: err.message 
    });
  }
});

// HTML 文件上传转 PDF
app.post("/pdf/html-file", upload.single('htmlFile'), async (req, res) => {
  const startTime = Date.now();
  
  console.log('[HTML文件->PDF] 开始处理HTML文件上传转换');
  
  if (!req.file) {
    console.log('[错误] HTML文件参数缺失');
    return res.status(400).send({ error: "Missing HTML file" });
  }

  try {
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
    // 处理HTML文件
    const result = await processHTMLFile(req.file, options);
    
    // 生成PDF
    const pdfBuffer = await generatePDF(result.html, options);

    const duration = Date.now() - startTime;
    const fileName = path.parse(req.file.originalname).name;
    console.log(`[HTML文件->PDF] 转换完成，耗时: ${duration}ms，大小: ${pdfBuffer.length} bytes`);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[HTML文件->PDF] 转换失败，耗时: ${duration}ms，错误:`, err.message);
    res.status(500).send({ 
      error: "PDF conversion failed", 
      details: err.message 
    });
  }
});

// 单张图片转 PDF
app.post("/pdf/image", upload.single('imageFile'), async (req, res) => {
  const startTime = Date.now();
  
  console.log('[图片->PDF] 开始处理图片转换');
  
  if (!req.file) {
    console.log('[错误] 图片文件参数缺失');
    return res.status(400).send({ error: "Missing image file" });
  }

  try {
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
    // 处理图片
    const result = await processSingleImage(req.file, options);
    
    // 生成PDF
    const pdfBuffer = await generatePDF(result.html, options);

    const duration = Date.now() - startTime;
    const fileName = path.parse(req.file.originalname).name;
    console.log(`[图片->PDF] 转换完成，耗时: ${duration}ms，大小: ${pdfBuffer.length} bytes`);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[图片->PDF] 转换失败，耗时: ${duration}ms，错误:`, err.message);
    res.status(500).send({ 
      error: "PDF conversion failed", 
      details: err.message 
    });
  }
});

// 批量图片转 PDF
app.post("/pdf/images", upload.array('imageFiles', 20), async (req, res) => {
  const startTime = Date.now();
  
  console.log('[批量图片->PDF] 开始处理批量图片转换');
  
  if (!req.files || req.files.length === 0) {
    console.log('[错误] 图片文件参数缺失');
    return res.status(400).send({ error: "Missing image files" });
  }

  try {
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
    // 处理多张图片
    const result = await processMultipleImages(req.files, options);
    
    // 生成PDF
    const pdfBuffer = await generatePDF(result.html, options);

    const duration = Date.now() - startTime;
    console.log(`[批量图片->PDF] 转换完成，耗时: ${duration}ms，大小: ${pdfBuffer.length} bytes`);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="images-combined.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[批量图片->PDF] 转换失败，耗时: ${duration}ms，错误:`, err.message);
    res.status(500).send({ 
      error: "PDF conversion failed", 
      details: err.message 
    });
  }
});

// HTML预处理接口（可选，用于测试和调试）
app.post("/preview/html", async (req, res) => {
  try {
    const { html, options = {} } = req.body;
    
    if (!html) {
      return res.status(400).send({ error: "Missing html parameter" });
    }

    const { html: cleanedHTML, issues } = validateAndCleanHTML(html);
    const result = await processHTMLString(cleanedHTML, options);
    
    res.json({
      processedHTML: result.html,
      analysis: result.analysis,
      issues: issues,
      optimization: result.options
    });
  } catch (error) {
    res.status(500).send({ 
      error: "HTML processing failed", 
      details: error.message 
    });
  }
});

// 健康检查接口
app.get('/health', async (req, res) => {
  const status = browser ? 'healthy' : 'unhealthy';
  console.log(`[健康检查] 服务状态: ${status}`);
  
  // 尝试创建一个测试页面来验证浏览器是否正常工作
  let browserWorking = false;
  if (browser) {
    try {
      browserWorking = await validateBrowser(browser);
      if (!browserWorking) {
        console.log(`[健康检查] 浏览器功能测试失败`);
      }
    } catch (error) {
      console.log(`[健康检查] 浏览器测试失败: ${error.message}`);
    }
  }
  
  res.json({ 
    status: browserWorking ? 'healthy' : 'unhealthy',
    browser: {
      working: browserWorking,
      source: browserInfo?.source || 'unknown',
      path: browserInfo?.path || 'unknown',
      initialized: browserInfo?.initialized || 'unknown'
    },
    environment: getBrowserInfo(),
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 获取服务信息
app.get('/info', (req, res) => {
  res.json({
    service: 'PDF转换服务',
    version: '2.0.0',
    features: [
      'URL转PDF - 支持网页转换',
      'HTML字符串转PDF - 智能A4优化',
      'HTML文件转PDF - 文件上传支持',
      '单张图片转PDF - 自动分页长图',
      '批量图片转PDF - 多图合并',
      'HTML预处理 - 内容分析和优化'
    ],
    limits: {
      maxFileSize: '50MB',
      maxImages: 20,
      timeout: '30秒'
    },
    endpoints: {
      'POST /pdf/url': 'URL转PDF',
      'POST /pdf/html': 'HTML字符串转PDF',
      'POST /pdf/html-file': 'HTML文件转PDF',
      'POST /pdf/image': '单张图片转PDF',
      'POST /pdf/images': '批量图片转PDF',
      'POST /preview/html': 'HTML预处理预览',
      'GET /health': '健康检查',
      'GET /info': '服务信息'
    }
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      console.log('[错误] 文件大小超过限制');
      return res.status(413).json({ error: '文件大小超过限制(50MB)' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      console.log('[错误] 文件数量超过限制');
      return res.status(413).json({ error: '文件数量超过限制(20个)' });
    }
  }
  
  console.error('[错误]', error.message);
  res.status(400).json({ error: error.message });
});

// 404处理
app.use((req, res) => {
  console.log(`[404] 未找到路径: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;

// 启动服务
initBrowser().then(() => {
  app.listen(PORT, () => {
    console.log(`[启动] PDF转换服务已启动，端口: ${PORT}`);
    console.log(`[信息] 访问 http://localhost:${PORT}/info 查看服务详情`);
    console.log(`[信息] 可用接口:`);
    console.log(`  POST /pdf/url         - URL转PDF`);
    console.log(`  POST /pdf/html        - HTML字符串转PDF`);
    console.log(`  POST /pdf/html-file   - HTML文件转PDF`);
    console.log(`  POST /pdf/image       - 单张图片转PDF`);
    console.log(`  POST /pdf/images      - 批量图片转PDF`);
    console.log(`  POST /preview/html    - HTML预处理预览`);
    console.log(`  GET  /health          - 健康检查`);
    console.log(`  GET  /info            - 服务信息`);
  });
}).catch(error => {
  console.error('[启动失败]', error);
  process.exit(1);
});
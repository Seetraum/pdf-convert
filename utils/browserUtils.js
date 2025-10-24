// utils/browserUtils.js
import { chromium } from 'playwright';
import { existsSync } from 'fs';
import { platform } from 'os';

/**
 * 不同操作系统的 Chrome/Chromium 可能路径
 */
const CHROME_PATHS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    process.env.HOME + '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ]
};

/**
 * 检测本地是否有可用的 Chrome/Chromium 浏览器
 * @returns {string|null} 返回浏览器路径，如果没有找到返回 null
 */
export function detectLocalChrome() {
  const os = platform();
  const paths = CHROME_PATHS[os] || [];
  
  console.log(`[浏览器检测] 当前系统: ${os}`);
  
  for (const path of paths) {
    if (existsSync(path)) {
      console.log(`[浏览器检测] ✓ 找到本地浏览器: ${path}`);
      return path;
    }
  }
  
  console.log('[浏览器检测] ✗ 未找到本地浏览器');
  return null;
}

/**
 * 智能初始化浏览器
 * 优先级：
 * 1. 环境变量指定的路径 (CHROME_EXECUTABLE_PATH)
 * 2. 本地安装的 Chrome/Chromium
 * 3. Playwright 内置的 Chromium
 */
export async function initializeBrowser(options = {}) {
  const {
    forcePlaywright = false,
    headless = true,
    args = []
  } = options;
  
  let executablePath = null;
  let browserSource = 'unknown';
  
  try {
    // 方案1: 检查环境变量
    if (process.env.CHROME_EXECUTABLE_PATH) {
      executablePath = process.env.CHROME_EXECUTABLE_PATH;
      if (existsSync(executablePath)) {
        browserSource = 'environment_variable';
        console.log(`[浏览器启动] 使用环境变量指定的浏览器: ${executablePath}`);
      } else {
        console.warn(`[浏览器启动] 警告: 环境变量指定的路径不存在: ${executablePath}`);
        executablePath = null;
      }
    }
    
    // 方案2: 检测本地浏览器（如果不是强制使用 Playwright）
    if (!executablePath && !forcePlaywright) {
      executablePath = detectLocalChrome();
      if (executablePath) {
        browserSource = 'local_installation';
        console.log('[浏览器启动] 使用本地安装的浏览器');
      }
    }
    
    // 方案3: 使用 Playwright 内置的 Chromium
    if (!executablePath) {
      browserSource = 'playwright_bundled';
      console.log('[浏览器启动] 使用 Playwright 内置的 Chromium（轻量级）');
    }
    
    // 默认启动参数
    const defaultArgs = [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-features=VizDisplayCompositor',
      '--disable-software-rasterizer',
      '--disable-extensions'
    ];
    
    const launchOptions = {
      headless,
      args: [...defaultArgs, ...args],
    };
    
    // 只有在找到本地浏览器时才设置 executablePath
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    console.log('[浏览器启动] 正在启动浏览器...');
    const browser = await chromium.launch(launchOptions);
    
    console.log(`[浏览器启动] ✓ 浏览器启动成功`);
    console.log(`[浏览器启动] 浏览器来源: ${browserSource}`);
    
    return {
      browser,
      source: browserSource,
      path: executablePath || 'playwright-bundled'
    };
    
  } catch (error) {
    console.error(`[浏览器启动] ✗ 浏览器启动失败:`, error.message);
    
    // 如果本地浏览器启动失败，尝试回退到 Playwright 内置版本
    if (executablePath && browserSource !== 'playwright_bundled') {
      console.log('[浏览器启动] 尝试回退到 Playwright 内置的 Chromium...');
      try {
        const browser = await chromium.launch({
          headless,
          args: [
            '--no-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-web-security',
          ]
        });
        
        console.log('[浏览器启动] ✓ 回退成功，使用 Playwright 内置浏览器');
        return {
          browser,
          source: 'playwright_bundled_fallback',
          path: 'playwright-bundled'
        };
      } catch (fallbackError) {
        console.error('[浏览器启动] ✗ 回退失败:', fallbackError.message);
        throw fallbackError;
      }
    }
    
    throw error;
  }
}

/**
 * 获取浏览器信息（用于健康检查和调试）
 */
export function getBrowserInfo() {
  const os = platform();
  const localChrome = detectLocalChrome();
  const envPath = process.env.CHROME_EXECUTABLE_PATH;
  
  return {
    os,
    localChrome: localChrome || 'not found',
    envPath: envPath || 'not set',
    playwrightAvailable: true,
    recommendation: localChrome 
      ? `建议使用本地浏览器: ${localChrome}`
      : '建议使用 Playwright 内置 Chromium 或设置 CHROME_EXECUTABLE_PATH 环境变量'
  };
}

/**
 * 验证浏览器是否正常工作
 */
export async function validateBrowser(browser) {
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent('<html><body>Browser Test</body></html>', {
      timeout: 5000
    });
    const content = await page.content();
    await context.close();
    
    return content.includes('Browser Test');
  } catch (error) {
    console.error('[浏览器验证] 验证失败:', error.message);
    return false;
  }
}


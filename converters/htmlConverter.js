// converters/htmlConverter.js
import { optimizeHTMLForA4 } from '../utils/pdfUtils.js';

/**
 * 处理HTML字符串转PDF
 */
export async function processHTMLString(htmlContent, options = {}) {
  console.log(`[HTML字符串] 开始处理，原始长度: ${htmlContent.length} 字符`);
  
  try {
    // 分析HTML内容类型
    const analysis = analyzeHTMLContent(htmlContent);
    console.log(`[HTML分析] 类型: ${analysis.type}, 复杂度: ${analysis.complexity}`);
    
    // 根据内容类型选择优化策略
    const optimizationOptions = getOptimizationOptions(analysis, options);
    
    // 优化HTML以适配A4
    const optimizedHTML = optimizeHTMLForA4(htmlContent, optimizationOptions);
    
    console.log(`[HTML优化] 完成，优化后长度: ${optimizedHTML.length} 字符`);
    
    return {
      html: optimizedHTML,
      analysis,
      options: optimizationOptions
    };
    
  } catch (error) {
    console.error(`[HTML字符串] 处理失败: ${error.message}`);
    throw new Error(`HTML字符串处理失败: ${error.message}`);
  }
}

/**
 * 处理HTML文件转PDF
 */
export async function processHTMLFile(file, options = {}) {
  console.log(`[HTML文件] 开始处理: ${file.originalname}, 大小: ${file.size} bytes`);
  
  try {
    const htmlContent = file.buffer.toString('utf-8');
    console.log(`[HTML文件] 解码完成，内容长度: ${htmlContent.length} 字符`);
    
    // 处理文件路径中的相对资源引用
    const processedHTML = processRelativeResources(htmlContent, file.originalname);
    
    // 继续使用HTML字符串处理逻辑
    const result = await processHTMLString(processedHTML, options);
    
    return {
      ...result,
      filename: file.originalname,
      originalSize: file.size
    };
    
  } catch (error) {
    console.error(`[HTML文件] 处理失败: ${error.message}`);
    throw new Error(`HTML文件处理失败: ${error.message}`);
  }
}

/**
 * 分析HTML内容特征
 */
function analyzeHTMLContent(htmlContent) {
  const analysis = {
    type: 'unknown',
    complexity: 'low',
    features: [],
    estimatedPages: 1,
    hasImages: false,
    hasTables: false,
    hasLists: false,
    hasCode: false,
    textLength: 0
  };
  
  // 检测文档类型
  if (/<h1|<h2|<h3/i.test(htmlContent)) {
    analysis.type = 'article';
    analysis.features.push('headings');
  }
  
  if (/<table/i.test(htmlContent)) {
    analysis.type = 'report';
    analysis.hasTables = true;
    analysis.features.push('tables');
  }
  
  if (/<ul|<ol|<li/i.test(htmlContent)) {
    analysis.hasLists = true;
    analysis.features.push('lists');
  }
  
  if (/<img/i.test(htmlContent)) {
    analysis.hasImages = true;
    analysis.features.push('images');
  }
  
  if (/<pre|<code/i.test(htmlContent)) {
    analysis.hasCode = true;
    analysis.features.push('code');
    analysis.type = 'technical';
  }
  
  if (/<form|<input|<button/i.test(htmlContent)) {
    analysis.type = 'form';
    analysis.features.push('forms');
  }
  
  // 估算文本长度（去除HTML标签）
  const textContent = htmlContent.replace(/<[^>]*>/g, '').trim();
  analysis.textLength = textContent.length;
  
  // 评估复杂度
  const tagCount = (htmlContent.match(/<[^>]*>/g) || []).length;
  const cssCount = (htmlContent.match(/style\s*=|<style/gi) || []).length;
  
  if (tagCount > 100 || cssCount > 20 || analysis.textLength > 5000) {
    analysis.complexity = 'high';
  } else if (tagCount > 30 || cssCount > 5 || analysis.textLength > 2000) {
    analysis.complexity = 'medium';
  }
  
  // 估算页数（基于文本长度，每页约1000字符）
  analysis.estimatedPages = Math.max(1, Math.ceil(analysis.textLength / 1000));
  
  return analysis;
}

/**
 * 根据HTML分析结果获取优化选项
 */
function getOptimizationOptions(analysis, userOptions = {}) {
  const baseOptions = {
    addPageBreaks: true,
    fontSize: '12px',
    lineHeight: '1.4',
    margin: {
      top: 20,
      right: 15,
      bottom: 20,
      left: 15
    }
  };
  
  // 根据文档类型调整选项
  switch (analysis.type) {
    case 'article':
      return {
        ...baseOptions,
        fontSize: '13px',
        lineHeight: '1.5',
        addPageBreaks: true,
        ...userOptions
      };
      
    case 'report':
      return {
        ...baseOptions,
        fontSize: '11px',
        lineHeight: '1.3',
        margin: {
          top: 15,
          right: 10,
          bottom: 15,
          left: 10
        },
        addPageBreaks: true,
        ...userOptions
      };
      
    case 'technical':
      return {
        ...baseOptions,
        fontSize: '10px',
        lineHeight: '1.2',
        addPageBreaks: true,
        preserveCodeFormatting: true,
        ...userOptions
      };
      
    case 'form':
      return {
        ...baseOptions,
        fontSize: '12px',
        lineHeight: '1.4',
        addPageBreaks: false, // 表单通常不需要强制分页
        ...userOptions
      };
      
    default:
      return {
        ...baseOptions,
        ...userOptions
      };
  }
}

/**
 * 处理HTML中的相对资源引用
 */
function processRelativeResources(htmlContent, filename) {
  console.log(`[资源处理] 开始处理相对路径资源`);
  
  let processedHTML = htmlContent;
  let warnings = [];
  
  // 处理相对路径的图片
  const imgMatches = htmlContent.match(/<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi) || [];
  imgMatches.forEach(imgTag => {
    const srcMatch = imgTag.match(/src\s*=\s*["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      const src = srcMatch[1];
      if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/')) {
        // 相对路径图片，添加警告注释
        const warningComment = `<!-- 警告: 相对路径图片可能无法显示: ${src} -->`;
        processedHTML = processedHTML.replace(imgTag, warningComment + imgTag);
        warnings.push(`相对路径图片: ${src}`);
      }
    }
  });
  
  // 处理相对路径的CSS
  const linkMatches = htmlContent.match(/<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi) || [];
  linkMatches.forEach(linkTag => {
    const hrefMatch = linkTag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (hrefMatch && hrefMatch[1]) {
      const href = hrefMatch[1];
      if (!href.startsWith('http') && !href.startsWith('/')) {
        const warningComment = `<!-- 警告: 相对路径CSS可能无法加载: ${href} -->`;
        processedHTML = processedHTML.replace(linkTag, warningComment + linkTag);
        warnings.push(`相对路径CSS: ${href}`);
      }
    }
  });
  
  if (warnings.length > 0) {
    console.log(`[资源处理] 发现 ${warnings.length} 个相对路径资源警告`);
  }
  
  return processedHTML;
}

/**
 * 为HTML添加智能分页标记
 */
export function addSmartPageBreaks(htmlContent, options = {}) {
  const {
    breakBeforeHeaders = true,
    breakAfterSections = true,
    avoidBreakInTables = true,
    maxContentHeight = '250mm' // A4减去边距的内容高度
  } = options;
  
  let processedHTML = htmlContent;
  
  if (breakBeforeHeaders) {
    // 在主要标题前添加分页
    processedHTML = processedHTML.replace(
      /(<h[12][^>]*>)/gi, 
      '<div class="page-break"></div>$1'
    );
  }
  
  if (breakAfterSections) {
    // 在章节结束后添加分页提示
    processedHTML = processedHTML.replace(
      /(<\/section>)/gi,
      '$1<div class="page-break-suggestion"></div>'
    );
  }
  
  if (avoidBreakInTables) {
    // 为表格添加避免分页的类
    processedHTML = processedHTML.replace(
      /(<table[^>]*>)/gi,
      '<div class="avoid-break">$1'
    );
    processedHTML = processedHTML.replace(
      /(<\/table>)/gi,
      '$1</div>'
    );
  }
  
  return processedHTML;
}

/**
 * 验证和清理HTML内容
 */
export function validateAndCleanHTML(htmlContent) {
  console.log(`[HTML验证] 开始验证HTML内容`);
  
  let cleanedHTML = htmlContent;
  const issues = [];
  
  // 检查基本HTML结构
  if (!/<html[^>]*>/i.test(cleanedHTML) && !/<body[^>]*>/i.test(cleanedHTML)) {
    issues.push('缺少HTML基本结构，将自动添加');
  }
  
  // 检查字符编码
  if (!/<meta[^>]+charset/i.test(cleanedHTML)) {
    issues.push('缺少字符编码声明，将自动添加UTF-8');
  }
  
  // 清理潜在的问题标签
  const problematicTags = ['script', 'iframe', 'object', 'embed'];
  problematicTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
    if (regex.test(cleanedHTML)) {
      cleanedHTML = cleanedHTML.replace(regex, `<!-- ${tag}标签已被移除以确保PDF转换兼容性 -->`);
      issues.push(`移除了${tag}标签`);
    }
  });
  
  // 处理自闭合标签
  const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];
  selfClosingTags.forEach(tag => {
    const regex = new RegExp(`<${tag}([^>]*[^/])>`, 'gi');
    cleanedHTML = cleanedHTML.replace(regex, `<${tag}$1/>`);
  });
  
  if (issues.length > 0) {
    console.log(`[HTML验证] 发现并修复了 ${issues.length} 个问题:`, issues);
  }
  
  return {
    html: cleanedHTML,
    issues
  };
}

// utils/pdfUtils.js
import sharp from 'sharp';

// A4 尺寸配置 (210mm x 297mm)
export const A4_CONFIG = {
  width: 210,  // mm
  height: 297, // mm
  widthPx: 794,   // px at 96 DPI (210mm * 96/25.4)
  heightPx: 1123, // px at 96 DPI (297mm * 96/25.4)
  // 只在分页时添加上下边距，左右不添加边距
  margin: {
    top: 20,    // px - 分页时的上边距
    right: 0,   // px - 无右边距
    bottom: 20, // px - 分页时的下边距
    left: 0     // px - 无左边距
  },
  // 内容区域尺寸
  contentWidth: 210,  // 210 - 0 - 0 (无左右边距)
  contentHeight: 257  // 297 - 20 - 20 (只有上下边距)
};

// 通用PDF配置
// 只在分页时添加上下边距，左右不添加边距
export const PDF_OPTIONS = {
  format: "A4",
  printBackground: true,
  margin: { 
    top: `${A4_CONFIG.margin.top}px`,    // 分页时上边距 20px
    bottom: `${A4_CONFIG.margin.bottom}px`, // 分页时下边距 20px
    left: `${A4_CONFIG.margin.left}px`,     // 左边距 0px
    right: `${A4_CONFIG.margin.right}px`    // 右边距 0px
  },
  preferCSSPageSize: false,
  displayHeaderFooter: false,
};

/**
 * 分析图片尺寸和分页需求
 */
export async function analyzeImage(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height, format } = metadata;
    
    // 计算显示尺寸（保持比例）
    const contentWidthPx = A4_CONFIG.contentWidth * 96 / 25.4; // 转换为像素
    const contentHeightPx = A4_CONFIG.contentHeight * 96 / 25.4;
    
    const scaleX = contentWidthPx / width;
    const scaleY = contentHeightPx / height;
    const scale = Math.min(scaleX, scaleY, 1); // 不放大，只缩小
    
    const displayWidth = width * scale;
    const displayHeight = height * scale;
    
    // 判断是否需要分页（如果图片很长）
    const needsPaging = displayHeight > contentHeightPx;
    
    return {
      original: { width, height, format },
      display: { 
        width: Math.round(displayWidth), 
        height: Math.round(displayHeight),
        scale 
      },
      needsPaging,
      pagesNeeded: needsPaging ? Math.ceil(displayHeight / contentHeightPx) : 1
    };
  } catch (error) {
    throw new Error(`图片分析失败: ${error.message}`);
  }
}

/**
 * 为长图片创建分页切片
 */
export async function createImageSlices(imageBuffer, analysis) {
  if (!analysis.needsPaging) {
    return [imageBuffer]; // 不需要分页，返回原图
  }
  
  try {
    const { original, display } = analysis;
    const sliceHeight = Math.floor(original.height / analysis.pagesNeeded);
    const slices = [];
    
    for (let i = 0; i < analysis.pagesNeeded; i++) {
      const top = i * sliceHeight;
      const height = i === analysis.pagesNeeded - 1 
        ? original.height - top // 最后一片取剩余部分
        : sliceHeight;
      
      const sliceBuffer = await sharp(imageBuffer)
        .extract({ 
          left: 0, 
          top, 
          width: original.width, 
          height 
        })
        .toBuffer();
        
      slices.push(sliceBuffer);
    }
    
    return slices;
  } catch (error) {
    throw new Error(`图片切片失败: ${error.message}`);
  }
}

/**
 * 生成图片的HTML模板
 */
export function generateImageHTML(imageData, options = {}) {
  const { fitMode = 'contain', backgroundColor = 'white' } = options;
  
  let imagesHtml;
  
  if (Array.isArray(imageData)) {
    // 多张图片或切片
    imagesHtml = imageData.map((data, index) => {
      const { buffer, mimeType, analysis } = data;
      const base64 = buffer.toString('base64');
      
      return `
        <div class="page" ${index > 0 ? 'style="page-break-before: always;"' : ''}>
          <div class="image-container">
            <img src="data:${mimeType};base64,${base64}" 
                 alt="Image ${index + 1}"
                 class="responsive-image">
            ${analysis?.pagesNeeded > 1 ? `<div class="page-info">第 ${index + 1} 页，共 ${analysis.pagesNeeded} 页</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } else {
    // 单张图片
    const { buffer, mimeType } = imageData;
    const base64 = buffer.toString('base64');
    
    imagesHtml = `
      <div class="page">
        <div class="image-container">
          <img src="data:${mimeType};base64,${base64}" 
               alt="Image"
               class="responsive-image">
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            html, body {
                width: 100%;
                height: 100%;
                background: ${backgroundColor};
                font-family: Arial, sans-serif;
            }
            
            .page {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                position: relative;
                background: white;
                page-break-after: always;
            }
            
            .page:last-child {
                page-break-after: avoid;
            }
            
            .image-container {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            
            .responsive-image {
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                object-fit: ${fitMode};
                display: block;
            }
            
            .page-info {
                position: absolute;
                bottom: 10px;
                right: 10px;
                font-size: 10px;
                color: #666;
                background: rgba(255, 255, 255, 0.8);
                padding: 2px 6px;
                border-radius: 3px;
            }
        </style>
    </head>
    <body>
        ${imagesHtml}
    </body>
    </html>
  `;
}

/**
 * 优化HTML内容以适配A4
 */
export function optimizeHTMLForA4(htmlContent, options = {}) {
  const { 
    addPageBreaks = true,
    fontSize = '12px',
    lineHeight = '1.4',
    margin = A4_CONFIG.margin 
  } = options;
  
  // 检查是否已有完整的HTML结构
  const hasHtmlTag = /<html[^>]*>/i.test(htmlContent);
  const hasHeadTag = /<head[^>]*>/i.test(htmlContent);
  const hasBodyTag = /<body[^>]*>/i.test(htmlContent);
  
  if (hasHtmlTag && hasHeadTag && hasBodyTag) {
    // 如果已有完整结构，只注入CSS样式
    return injectA4Styles(htmlContent, { addPageBreaks, fontSize, lineHeight, margin });
  }
  
  // 创建完整的HTML结构
  const bodyContent = hasBodyTag ? htmlContent : `<body>${htmlContent}</body>`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* A4 优化样式 */
            * {
                box-sizing: border-box;
            }
            
            html, body {
                margin: 0;
                padding: 0;
                font-family: 'Arial', 'Microsoft YaHei', sans-serif;
                font-size: ${fontSize};
                line-height: ${lineHeight};
                background: white;
            }
            
            @page {
                size: A4;
                margin: ${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px;
            }
            
            body {
                width: ${A4_CONFIG.width}mm;
                max-width: 100%;
                margin: 0 auto;
                padding: ${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px;
                background: white;
            }
            
            /* 表格优化 */
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 1em;
                page-break-inside: avoid;
            }
            
            th, td {
                padding: 8px;
                text-align: left;
                border: 1px solid #ddd;
                word-wrap: break-word;
            }
            
            th {
                background-color: #f5f5f5;
                font-weight: bold;
            }
            
            /* 图片优化 */
            img {
                max-width: 100%;
                height: auto;
                display: block;
                margin: 0 auto;
                page-break-inside: avoid;
            }
            
            /* 标题优化 */
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
            }
            
            h1 { font-size: 1.8em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.3em; }
            h4 { font-size: 1.1em; }
            h5 { font-size: 1em; }
            h6 { font-size: 0.9em; }
            
            /* 段落优化 */
            p {
                margin-bottom: 1em;
                text-align: justify;
                word-wrap: break-word;
            }
            
            /* 列表优化 */
            ul, ol {
                margin-bottom: 1em;
                padding-left: 2em;
            }
            
            li {
                margin-bottom: 0.3em;
            }
            
            /* 代码块优化 */
            pre, code {
                font-family: 'Courier New', monospace;
                background-color: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 3px;
            }
            
            pre {
                padding: 10px;
                overflow-x: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
                page-break-inside: avoid;
            }
            
            code {
                padding: 2px 4px;
            }
            
            /* 分页控制 */
            ${addPageBreaks ? `
            .page-break {
                page-break-before: always;
            }
            
            .avoid-break {
                page-break-inside: avoid;
            }
            
            .keep-together {
                page-break-inside: avoid;
            }
            ` : ''}
            
            /* 打印优化 */
            @media print {
                body {
                    padding: 0;
                }
                
                .no-print {
                    display: none;
                }
            }
        </style>
    </head>
    ${bodyContent}
    </html>
  `;
}

/**
 * 向现有HTML注入A4优化样式
 */
function injectA4Styles(htmlContent, options) {
  const { addPageBreaks, fontSize, lineHeight, margin } = options;
  
  const styleContent = `
    <style>
      /* A4 PDF 优化样式 - 自动注入 */
      @page {
        size: A4;
        margin: ${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px;
      }
      body {
        font-family: 'Arial', 'Microsoft YaHei', sans-serif;
        font-size: ${fontSize};
        line-height: ${lineHeight};
        max-width: ${A4_CONFIG.contentWidth}mm;
        margin: 0 auto;
        padding: ${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px;
      }
      table { page-break-inside: avoid; border-collapse: collapse; }
      img { max-width: 100%; height: auto; page-break-inside: avoid; }
      h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
      ${addPageBreaks ? '.page-break { page-break-before: always; }' : ''}
    </style>
  `;
  
  // 尝试插入到 </head> 之前
  if (/<\/head>/i.test(htmlContent)) {
    return htmlContent.replace(/<\/head>/i, `${styleContent}</head>`);
  }
  
  // 如果没有 head 标签，插入到 <html> 之后
  if (/<html[^>]*>/i.test(htmlContent)) {
    return htmlContent.replace(/(<html[^>]*>)/i, `$1<head>${styleContent}</head>`);
  }
  
  // 最后尝试插入到文档开头
  return `<head>${styleContent}</head>${htmlContent}`;
}
// converters/imageConverter.js
import { analyzeImage, createImageSlices, generateImageHTML, A4_CONFIG } from '../utils/pdfUtils.js';
import sharp from 'sharp';

/**
 * 处理单张图片转PDF
 */
export async function processSingleImage(file, options = {}) {
  console.log(`[图片处理] 开始处理: ${file.originalname}`);
  
  try {
    // 分析图片
    const analysis = await analyzeImage(file.buffer);
    console.log(`[图片分析] 尺寸: ${analysis.original.width}x${analysis.original.height}, 需要分页: ${analysis.needsPaging}, 页数: ${analysis.pagesNeeded}`);
    
    let imageData;
    
    if (analysis.needsPaging) {
      // 需要分页的长图
      console.log(`[图片分页] 正在创建 ${analysis.pagesNeeded} 个切片`);
      const slices = await createImageSlices(file.buffer, analysis);
      
      imageData = slices.map((slice, index) => ({
        buffer: slice,
        mimeType: file.mimetype,
        analysis: {
          ...analysis,
          currentPage: index + 1,
          totalPages: analysis.pagesNeeded
        }
      }));
    } else {
      // 单页图片
      imageData = {
        buffer: file.buffer,
        mimeType: file.mimetype,
        analysis
      };
    }
    
    const html = generateImageHTML(imageData, {
      fitMode: options.fitMode || 'contain',
      backgroundColor: options.backgroundColor || 'white'
    });
    
    console.log(`[图片处理] 完成，生成HTML长度: ${html.length} 字符`);
    
    return {
      html,
      analysis,
      filename: file.originalname
    };
    
  } catch (error) {
    console.error(`[图片处理] 失败: ${error.message}`);
    throw new Error(`图片处理失败: ${error.message}`);
  }
}

/**
 * 处理多张图片转PDF
 */
export async function processMultipleImages(files, options = {}) {
  console.log(`[批量图片] 开始处理 ${files.length} 张图片`);
  
  try {
    const processedImages = [];
    let totalPages = 0;
    
    // 处理每张图片
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[批量图片] 处理第 ${i + 1}/${files.length} 张: ${file.originalname}`);
      
      const analysis = await analyzeImage(file.buffer);
      
      if (analysis.needsPaging) {
        // 长图需要切片
        const slices = await createImageSlices(file.buffer, analysis);
        
        slices.forEach((slice, sliceIndex) => {
          processedImages.push({
            buffer: slice,
            mimeType: file.mimetype,
            originalName: file.originalname,
            imageIndex: i + 1,
            totalImages: files.length,
            sliceIndex: sliceIndex + 1,
            totalSlices: analysis.pagesNeeded,
            analysis
          });
        });
        
        totalPages += analysis.pagesNeeded;
      } else {
        // 普通图片
        processedImages.push({
          buffer: file.buffer,
          mimeType: file.mimetype,
          originalName: file.originalname,
          imageIndex: i + 1,
          totalImages: files.length,
          analysis
        });
        
        totalPages += 1;
      }
    }
    
    console.log(`[批量图片] 图片处理完成，总页数: ${totalPages}`);
    
    // 生成HTML
    const imagesHtml = processedImages.map((imageData, pageIndex) => {
      const base64 = imageData.buffer.toString('base64');
      const pageNumber = pageIndex + 1;
      
      let imageInfo = `图片 ${imageData.imageIndex}`;
      if (imageData.totalSlices > 1) {
        imageInfo += ` (第 ${imageData.sliceIndex}/${imageData.totalSlices} 部分)`;
      }
      
      return `
        <div class="page" ${pageIndex > 0 ? 'style="page-break-before: always;"' : ''}>
          <div class="image-container">
            <img src="data:${imageData.mimeType};base64,${base64}" 
                 alt="${imageData.originalName}"
                 class="responsive-image">
            <div class="image-info">
              <div class="image-name">${imageInfo}</div>
              <div class="page-number">第 ${pageNumber} 页，共 ${totalPages} 页</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    const html = `
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
                  background: white;
                  font-family: 'Arial', 'Microsoft YaHei', sans-serif;
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
                  padding: 30px 20px 40px 20px;
                  position: relative;
              }
              
              .responsive-image {
                  max-width: 100%;
                  max-height: 100%;
                  width: auto;
                  height: auto;
                  object-fit: contain;
                  display: block;
              }
              
              .image-info {
                  position: absolute;
                  bottom: 10px;
                  left: 10px;
                  right: 10px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  font-size: 10px;
                  color: #666;
                  background: rgba(255, 255, 255, 0.9);
                  padding: 5px 10px;
                  border-radius: 3px;
                  border-top: 1px solid #ddd;
              }
              
              .image-name {
                  font-weight: bold;
              }
              
              .page-number {
                  color: #888;
              }
          </style>
      </head>
      <body>
          ${imagesHtml}
      </body>
      </html>
    `;
    
    console.log(`[批量图片] HTML生成完成，长度: ${html.length} 字符`);
    
    return {
      html,
      totalImages: files.length,
      totalPages,
      processedImages: processedImages.length
    };
    
  } catch (error) {
    console.error(`[批量图片] 处理失败: ${error.message}`);
    throw new Error(`批量图片处理失败: ${error.message}`);
  }
}

/**
 * 智能调整图片以适应A4页面
 * 根据图片比例和内容类型选择最佳布局
 */
export function getOptimalImageLayout(analysis) {
  const { original } = analysis;
  const aspectRatio = original.width / original.height;
  
  // A4 纸张比例约为 0.707 (210/297)
  const a4Ratio = 210 / 297;
  
  if (aspectRatio > 1.5) {
    // 横向长图 - 建议横向布局
    return {
      orientation: 'landscape',
      fitMode: 'contain',
      recommendation: '检测到横向长图，建议使用横向布局以获得更好的显示效果'
    };
  } else if (aspectRatio < 0.5) {
    // 纵向长图 - 可能需要分页
    return {
      orientation: 'portrait',
      fitMode: 'contain',
      splitRecommended: true,
      recommendation: '检测到纵向长图，将自动分页显示'
    };
  } else {
    // 普通比例图片
    return {
      orientation: 'portrait',
      fitMode: 'contain',
      recommendation: '图片比例适中，使用标准A4布局'
    };
  }
}

/**
 * 处理特殊图片格式
 */
export async function processSpecialImageFormats(file) {
  const { mimetype, buffer } = file;
  
  try {
    if (mimetype === 'image/svg+xml') {
      // SVG 特殊处理
      console.log('[特殊格式] 处理SVG图片');
      const svgString = buffer.toString('utf-8');
      
      // 提取SVG尺寸
      const widthMatch = svgString.match(/width\s*=\s*["']?(\d+)/i);
      const heightMatch = svgString.match(/height\s*=\s*["']?(\d+)/i);
      
      let width = widthMatch ? parseInt(widthMatch[1]) : 800;
      let height = heightMatch ? parseInt(heightMatch[1]) : 600;
      
      // 转换SVG为PNG以获得更好的兼容性
      const pngBuffer = await sharp(buffer)
        .resize(width, height, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .png()
        .toBuffer();
      
      return {
        buffer: pngBuffer,
        mimetype: 'image/png',
        converted: true,
        originalFormat: 'svg'
      };
    }
    
    if (mimetype === 'image/gif') {
      // GIF 特殊处理（提取第一帧）
      console.log('[特殊格式] 处理GIF图片（提取首帧）');
      const pngBuffer = await sharp(buffer, { animated: false })
        .png()
        .toBuffer();
      
      return {
        buffer: pngBuffer,
        mimetype: 'image/png',
        converted: true,
        originalFormat: 'gif'
      };
    }
    
    // 其他格式直接返回
    return {
      buffer,
      mimetype,
      converted: false
    };
    
  } catch (error) {
    console.error(`[特殊格式] 处理失败: ${error.message}`);
    // 如果特殊处理失败，返回原始数据
    return {
      buffer,
      mimetype,
      converted: false,
      error: error.message
    };
  }
}

/**
 * 图片质量优化
 */
export async function optimizeImageForPDF(buffer, mimetype, options = {}) {
  const {
    maxWidth = A4_CONFIG.widthPx,
    maxHeight = A4_CONFIG.heightPx,
    quality = 90,
    format = 'original'
  } = options;
  
  try {
    let sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();
    
    console.log(`[图片优化] 原始尺寸: ${metadata.width}x${metadata.height}, 格式: ${metadata.format}`);
    
    // 如果图片过大，进行压缩
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: false
      });
      console.log(`[图片优化] 调整尺寸至最大 ${maxWidth}x${maxHeight}`);
    }
    
    // 根据格式进行优化
    let optimizedBuffer;
    let outputMimetype = mimetype;
    
    if (format === 'jpeg' || mimetype === 'image/jpeg') {
      optimizedBuffer = await sharpInstance.jpeg({ quality }).toBuffer();
      outputMimetype = 'image/jpeg';
    } else if (format === 'png' || mimetype === 'image/png') {
      optimizedBuffer = await sharpInstance.png({ 
        compressionLevel: 6,
        quality 
      }).toBuffer();
      outputMimetype = 'image/png';
    } else if (format === 'webp') {
      optimizedBuffer = await sharpInstance.webp({ quality }).toBuffer();
      outputMimetype = 'image/webp';
    } else {
      // 保持原格式
      optimizedBuffer = await sharpInstance.toBuffer();
    }
    
    const compressionRatio = ((buffer.length - optimizedBuffer.length) / buffer.length * 100).toFixed(1);
    console.log(`[图片优化] 优化完成，压缩率: ${compressionRatio}%, 新尺寸: ${optimizedBuffer.length} bytes`);
    
    return {
      buffer: optimizedBuffer,
      mimetype: outputMimetype,
      originalSize: buffer.length,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: parseFloat(compressionRatio)
    };
    
  } catch (error) {
    console.error(`[图片优化] 失败: ${error.message}`);
    // 优化失败时返回原图
    return {
      buffer,
      mimetype,
      originalSize: buffer.length,
      optimizedSize: buffer.length,
      compressionRatio: 0,
      error: error.message
    };
  }
}
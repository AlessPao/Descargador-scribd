import axios from 'axios';
import { load } from 'cheerio';
import { configLoader } from '../utils/io/ConfigLoader.js';
import { pdfGenerator } from '../utils/io/PdfGenerator.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { URL } from 'url';

/**
 * Servicio de scraping con estrategia de fuerza bruta
 * Intenta múltiples enfoques para extraer contenido
 */
class BruteForceScrapingService {
  constructor() {
    this.axios = axios.create({
      timeout: 45000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.google.com/'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
  }

  /**
   * Generar URLs de imágenes probables para Scribd
   */
  generateProbableImageUrls(url, docId) {
    const urls = [];
    
    // Patrones comunes de Scribd
    const basePatterns = [
      `https://imgv2-1-f.scribdassets.com/img/document/${docId}`,
      `https://imgv2-2-f.scribdassets.com/img/document/${docId}`,
      `https://html2pdf.files.wordpress.com/2015/01/scribd-${docId}`,
      `https://document-export.canva.com/DAD${docId}`,
      `https://www.scribd.com/doc/${docId}/pages`,
      `https://www.scribd.com/document/${docId}/pages`
    ];
    
    // Generar URLs para múltiples páginas
    for (let page = 1; page <= 50; page++) {
      const pageStr = page.toString().padStart(3, '0');
      const pageStr2 = page.toString();
      
      // Patrones con número de página
      urls.push(...basePatterns.map(base => `${base}/page_${pageStr}.jpg`));
      urls.push(...basePatterns.map(base => `${base}/page-${pageStr}.jpg`));
      urls.push(...basePatterns.map(base => `${base}/page${pageStr}.jpg`));
      urls.push(...basePatterns.map(base => `${base}/p${pageStr}.jpg`));
      urls.push(...basePatterns.map(base => `${base}/${pageStr}.jpg`));
      urls.push(...basePatterns.map(base => `${base}/page_${pageStr2}.jpg`));
      urls.push(...basePatterns.map(base => `${base}/page-${pageStr2}.jpg`));
      urls.push(...basePatterns.map(base => `${base}/page${pageStr2}.jpg`));
      urls.push(...basePatterns.map(base => `${base}/p${pageStr2}.jpg`));
      urls.push(...basePatterns.map(base => `${base}/${pageStr2}.jpg`));
      
      // Variantes con PNG
      urls.push(...basePatterns.map(base => `${base}/page_${pageStr}.png`));
      urls.push(...basePatterns.map(base => `${base}/page-${pageStr}.png`));
      urls.push(...basePatterns.map(base => `${base}/page${pageStr}.png`));
      urls.push(...basePatterns.map(base => `${base}/p${pageStr}.png`));
      urls.push(...basePatterns.map(base => `${base}/${pageStr}.png`));
    }
    
    return urls;
  }

  /**
   * Extraer ID del documento
   */
  extractDocumentId(url) {
    const patterns = [
      /\/doc\/(\d+)/,
      /\/document\/(\d+)/,
      /scribd\.com\/.*?(\d{8,})/,
      /\/([0-9]{8,})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Probar si una URL de imagen existe
   */
  async testImageUrl(url) {
    try {
      const response = await this.axios.head(url, {
        timeout: 10000,
        headers: {
          'Referer': 'https://www.scribd.com/'
        }
      });
      
      const contentType = response.headers['content-type'];
      const contentLength = parseInt(response.headers['content-length'] || '0');
      
      return contentType && contentType.includes('image') && contentLength > 1000;
    } catch (error) {
      return false;
    }
  }

  /**
   * Encontrar imágenes válidas por fuerza bruta
   */
  async findImagesByBruteForce(url) {
    const docId = this.extractDocumentId(url);
    if (!docId) {
      throw new Error('No se pudo extraer el ID del documento');
    }
    
    console.log(`📋 ID del documento: ${docId}`);
    
    const possibleUrls = this.generateProbableImageUrls(url, docId);
    console.log(`🔍 Probando ${possibleUrls.length} URLs posibles...`);
    
    const validImages = [];
    const batchSize = 20;
    
    for (let i = 0; i < possibleUrls.length; i += batchSize) {
      const batch = possibleUrls.slice(i, i + batchSize);
      
      console.log(`🔍 Probando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(possibleUrls.length / batchSize)}...`);
      
      const results = await Promise.allSettled(
        batch.map(async (imageUrl) => {
          const isValid = await this.testImageUrl(imageUrl);
          if (isValid) {
            return {
              src: imageUrl,
              page: validImages.length + 1,
              alt: `página ${validImages.length + 1}`
            };
          }
          return null;
        })
      );
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          validImages.push(result.value);
          console.log(`✅ Imagen encontrada: ${result.value.src}`);
        }
      });
      
      // Si encontramos suficientes imágenes, podemos parar
      if (validImages.length >= 20) {
        console.log(`🎯 Encontradas ${validImages.length} imágenes, suficiente para continuar`);
        break;
      }
    }
    
    return validImages;
  }

  /**
   * Descargar imágenes
   */
  async downloadImages(images, outputDir) {
    const downloadedImages = [];
    
    console.log(`📥 Descargando ${images.length} imágenes...`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    for (let i = 0; i < images.length; i++) {
      try {
        const image = images[i];
        console.log(`📥 Descargando imagen ${i + 1}/${images.length}: ${image.src}`);
        
        const response = await this.axios.get(image.src, { 
          responseType: 'stream',
          timeout: 30000,
          headers: {
            'Referer': 'https://www.scribd.com/'
          }
        });
        
        const contentType = response.headers['content-type'];
        let extension = '.jpg';
        if (contentType) {
          if (contentType.includes('png')) extension = '.png';
          else if (contentType.includes('gif')) extension = '.gif';
          else if (contentType.includes('webp')) extension = '.webp';
        }
        
        const filename = `page_${(i + 1).toString().padStart(3, '0')}${extension}`;
        const filepath = path.join(outputDir, filename);
        
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        const stats = fs.statSync(filepath);
        if (stats.size > 1000) {
          downloadedImages.push(filepath);
          console.log(`✅ Descargada: ${filename} (${stats.size} bytes)`);
        } else {
          console.log(`⚠️ Archivo muy pequeño: ${filename}`);
          fs.unlinkSync(filepath);
        }
        
      } catch (error) {
        console.error(`❌ Error descargando imagen ${i + 1}:`, error.message);
      }
    }
    
    return downloadedImages;
  }

  /**
   * Procesar URL con fuerza bruta
   */
  async processUrl(url, mode = '/d') {
    try {
      console.log(`🚀 Procesando URL con fuerza bruta: ${url}`);
      
      if (!url.includes('scribd.com')) {
        throw new Error('Este servicio solo soporta Scribd.com');
      }
      
      // Obtener página principal para extraer título
      const response = await this.axios.get(url);
      const $ = load(response.data);
      const title = $('title').text().split(' - ')[0] || $('h1').first().text() || 'documento';
      
      console.log(`📄 Título: ${title}`);
      
      // Encontrar imágenes por fuerza bruta
      const images = await this.findImagesByBruteForce(url);
      
      if (images.length === 0) {
        throw new Error('No se encontraron imágenes válidas');
      }
      
      console.log(`📄 Encontradas ${images.length} imágenes válidas`);
      
      // Crear directorio temporal
      const tempDir = path.join(process.cwd(), 'temp_images');
      
      // Descargar imágenes
      const downloadedImages = await this.downloadImages(images, tempDir);
      
      if (downloadedImages.length === 0) {
        throw new Error('No se pudo descargar ninguna imagen');
      }
      
      // Generar PDF
      const outputDir = configLoader.load("DIRECTORY", "output") || 'output';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const sanitizedTitle = this.sanitizeTitle(title);
      const pdfPath = path.join(outputDir, `${sanitizedTitle}.pdf`);
      
      console.log(`📄 Generando PDF: ${pdfPath}`);
      await pdfGenerator.imagesToPdf(downloadedImages, pdfPath);
      
      // Limpiar archivos temporales
      this.cleanupTempFiles(tempDir);
      
      console.log(`✅ PDF generado exitosamente: ${pdfPath}`);
      return pdfPath;
      
    } catch (error) {
      console.error('❌ Error procesando URL:', error.message);
      throw error;
    }
  }

  /**
   * Limpiar archivos temporales
   */
  cleanupTempFiles(tempDir) {
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
          const filePath = path.join(tempDir, file);
          fs.unlinkSync(filePath);
        });
        fs.rmdirSync(tempDir);
        console.log('🧹 Archivos temporales limpiados');
      }
    } catch (error) {
      console.error('⚠️ Error limpiando archivos temporales:', error.message);
    }
  }

  /**
   * Sanitizar título para nombre de archivo
   */
  sanitizeTitle(title) {
    return title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }
}

export const bruteForceScrapingService = new BruteForceScrapingService();

import axios from 'axios';
import cheerio from 'cheerio';
import { configLoader } from '../utils/io/ConfigLoader.js';
import { pdfGenerator } from '../utils/io/PdfGenerator.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { URL } from 'url';

/**
 * Servicio de scraping SIN navegador headless
 * Usa solo HTTP requests y parsing HTML
 */
class HttpScrapingService {
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
        'Cache-Control': 'max-age=0'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
  }

  /**
   * Extraer contenido de Scribd
   */
  async extractScribdContent(url) {
    try {
      console.log(`🔍 Procesando Scribd: ${url}`);
      
      const response = await this.axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extraer título
      const title = $('title').text().split(' - ')[0] || $('h1').first().text() || 'documento';
      
      // Buscar imágenes de páginas en Scribd
      const images = [];
      
      // Patrones específicos de Scribd
      const imageSelectors = [
        'img[src*="scribd.com/page"]',
        'img[data-src*="scribd.com/page"]',
        'img[src*="document_page"]',
        'img[data-src*="document_page"]',
        '.page img',
        '.document_page img',
        'img[src*="/pages/"]',
        'img[data-src*="/pages/"]'
      ];
      
      for (const selector of imageSelectors) {
        $(selector).each((i, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          if (src && src.includes('scribd')) {
            const fullUrl = src.startsWith('//') ? `https:${src}` : 
                           src.startsWith('/') ? `https://scribd.com${src}` : src;
            images.push({
              src: fullUrl,
              page: i + 1,
              alt: $(img).attr('alt') || `página ${i + 1}`
            });
          }
        });
      }
      
      // Si no encontramos imágenes, buscar en scripts JSON
      if (images.length === 0) {
        const scripts = $('script[type="application/json"]').toArray();
        for (const script of scripts) {
          try {
            const content = $(script).html();
            if (content && content.includes('page_images')) {
              const data = JSON.parse(content);
              if (data.page_images) {
                data.page_images.forEach((img, i) => {
                  if (img.url) {
                    images.push({
                      src: img.url,
                      page: i + 1,
                      alt: `página ${i + 1}`
                    });
                  }
                });
              }
            }
          } catch (e) {
            // Continuar con el siguiente script
          }
        }
      }
      
      return {
        title: this.sanitizeTitle(title),
        images,
        source: 'scribd',
        url
      };
      
    } catch (error) {
      console.error('❌ Error procesando Scribd:', error.message);
      throw new Error(`Error procesando Scribd: ${error.message}`);
    }
  }

  /**
   * Extraer contenido de SlideShare
   */
  async extractSlideshareContent(url) {
    try {
      console.log(`🔍 Procesando SlideShare: ${url}`);
      
      const response = await this.axios.get(url);
      const $ = cheerio.load(response.data);
      
      const title = $('title').text().split(' - ')[0] || $('h1').first().text() || 'presentacion';
      
      const images = [];
      
      // Patrones específicos de SlideShare
      const imageSelectors = [
        'img[data-src*="slidesharecdn.com"]',
        'img[src*="slidesharecdn.com"]',
        '.slide img',
        '.slide-image img',
        'img[src*="/slide"]',
        'img[data-src*="/slide"]'
      ];
      
      for (const selector of imageSelectors) {
        $(selector).each((i, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          if (src) {
            const fullUrl = src.startsWith('//') ? `https:${src}` : 
                           src.startsWith('/') ? `https://slideshare.net${src}` : src;
            images.push({
              src: fullUrl,
              page: i + 1,
              alt: $(img).attr('alt') || `slide ${i + 1}`
            });
          }
        });
      }
      
      return {
        title: this.sanitizeTitle(title),
        images,
        source: 'slideshare',
        url
      };
      
    } catch (error) {
      console.error('❌ Error procesando SlideShare:', error.message);
      throw new Error(`Error procesando SlideShare: ${error.message}`);
    }
  }

  /**
   * Extraer contenido genérico
   */
  async extractGenericContent(url) {
    try {
      console.log(`🔍 Procesando contenido genérico: ${url}`);
      
      const response = await this.axios.get(url);
      const $ = cheerio.load(response.data);
      
      const title = $('title').text() || $('h1').first().text() || 'documento';
      
      const images = [];
      
      // Buscar imágenes genéricas
      $('img').each((i, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && (src.includes('page') || src.includes('slide') || src.includes('document'))) {
          const fullUrl = this.resolveUrl(src, url);
          images.push({
            src: fullUrl,
            page: i + 1,
            alt: $(img).attr('alt') || `imagen ${i + 1}`
          });
        }
      });
      
      return {
        title: this.sanitizeTitle(title),
        images,
        source: 'generic',
        url
      };
      
    } catch (error) {
      console.error('❌ Error procesando contenido genérico:', error.message);
      throw new Error(`Error procesando contenido: ${error.message}`);
    }
  }

  /**
   * Resolver URL relativa a absoluta
   */
  resolveUrl(src, baseUrl) {
    try {
      if (src.startsWith('http')) return src;
      if (src.startsWith('//')) return `https:${src}`;
      if (src.startsWith('/')) {
        const base = new URL(baseUrl);
        return `${base.protocol}//${base.host}${src}`;
      }
      return new URL(src, baseUrl).href;
    } catch (error) {
      return src;
    }
  }

  /**
   * Descargar imágenes
   */
  async downloadImages(images, outputDir) {
    const downloadedImages = [];
    
    console.log(`📥 Descargando ${images.length} imágenes...`);
    
    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    for (let i = 0; i < images.length; i++) {
      try {
        const image = images[i];
        console.log(`📥 Descargando imagen ${i + 1}/${images.length}: ${image.src}`);
        
        const response = await this.axios.get(image.src, { 
          responseType: 'stream',
          timeout: 30000
        });
        
        // Determinar extensión
        const contentType = response.headers['content-type'];
        let extension = '.jpg';
        if (contentType) {
          if (contentType.includes('png')) extension = '.png';
          else if (contentType.includes('gif')) extension = '.gif';
          else if (contentType.includes('webp')) extension = '.webp';
        }
        
        const filename = `page_${(i + 1).toString().padStart(3, '0')}${extension}`;
        const filepath = path.join(outputDir, filename);
        
        // Guardar imagen
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        // Verificar que el archivo se creó y tiene contenido
        const stats = fs.statSync(filepath);
        if (stats.size > 0) {
          downloadedImages.push(filepath);
          console.log(`✅ Descargada: ${filename} (${stats.size} bytes)`);
        } else {
          console.log(`⚠️ Archivo vacío: ${filename}`);
          fs.unlinkSync(filepath);
        }
        
      } catch (error) {
        console.error(`❌ Error descargando imagen ${i + 1}:`, error.message);
      }
    }
    
    return downloadedImages;
  }

  /**
   * Procesar URL principal
   */
  async processUrl(url, mode = '/d') {
    try {
      console.log(`🚀 Procesando URL: ${url}`);
      
      let content;
      
      // Detectar tipo de sitio
      if (url.includes('scribd.com')) {
        content = await this.extractScribdContent(url);
      } else if (url.includes('slideshare.net')) {
        content = await this.extractSlideshareContent(url);
      } else {
        content = await this.extractGenericContent(url);
      }
      
      if (!content.images || content.images.length === 0) {
        throw new Error('No se encontraron imágenes para descargar');
      }
      
      console.log(`📄 Encontradas ${content.images.length} imágenes`);
      
      // Crear directorio temporal
      const tempDir = path.join(process.cwd(), 'temp_images');
      
      // Descargar imágenes
      const downloadedImages = await this.downloadImages(content.images, tempDir);
      
      if (downloadedImages.length === 0) {
        throw new Error('No se pudo descargar ninguna imagen');
      }
      
      // Generar PDF
      const outputDir = configLoader.load("DIRECTORY", "output") || 'output';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const pdfPath = path.join(outputDir, `${content.title}.pdf`);
      
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
      .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '_') // Espacios a guiones bajos
      .substring(0, 100); // Límite de caracteres
  }
}

export const httpScrapingService = new HttpScrapingService();

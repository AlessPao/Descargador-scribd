import axios from 'axios';
import cheerio from 'cheerio';
import { configLoader } from '../utils/io/ConfigLoader.js';
import { pdfGenerator } from '../utils/io/PdfGenerator.js';
import fs from 'fs';
import path from 'path';

/**
 * Servicio de scraping ligero sin Puppeteer
 * Usa axios + cheerio para casos más simples
 */
class LightScrapingService {
  constructor() {
    this.axios = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });
  }

  /**
   * Intenta extraer contenido de una página web
   * @param {string} url - URL a procesar
   * @returns {Object} - Información extraída
   */
  async extractContent(url) {
    try {
      console.log(`🔍 Extrayendo contenido de: ${url}`);
      
      const response = await this.axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extraer información básica
      const title = $('title').text() || 'documento';
      const description = $('meta[name="description"]').attr('content') || '';
      
      // Buscar imágenes del documento
      const images = [];
      
      // Patrones comunes para imágenes de documentos
      const imageSelectors = [
        'img[src*="page"]',
        'img[src*="slide"]',
        'img[data-src*="page"]',
        'img[data-src*="slide"]',
        '.page img',
        '.slide img',
        '[class*="page"] img',
        '[class*="slide"] img'
      ];
      
      for (const selector of imageSelectors) {
        $(selector).each((i, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          if (src) {
            images.push({
              src: src.startsWith('//') ? `https:${src}` : src.startsWith('/') ? new URL(src, url).href : src,
              alt: $(img).attr('alt') || `página ${i + 1}`
            });
          }
        });
      }
      
      // Extraer texto del documento si está disponible
      const textContent = $('body').text().trim();
      
      return {
        title: this.sanitizeTitle(title),
        description,
        images,
        textContent: textContent.length > 1000 ? textContent.substring(0, 1000) + '...' : textContent,
        url
      };
      
    } catch (error) {
      console.error('❌ Error extrayendo contenido:', error.message);
      throw new Error(`No se pudo extraer contenido de ${url}: ${error.message}`);
    }
  }

  /**
   * Descargar imágenes encontradas
   * @param {Array} images - Lista de imágenes
   * @param {string} outputDir - Directorio de salida
   * @returns {Array} - Rutas de archivos descargados
   */
  async downloadImages(images, outputDir) {
    const downloadedImages = [];
    
    console.log(`📥 Descargando ${images.length} imágenes...`);
    
    for (let i = 0; i < images.length; i++) {
      try {
        const image = images[i];
        const response = await this.axios.get(image.src, { responseType: 'stream' });
        
        // Determinar extensión del archivo
        const contentType = response.headers['content-type'];
        let extension = '.jpg';
        if (contentType) {
          if (contentType.includes('png')) extension = '.png';
          else if (contentType.includes('gif')) extension = '.gif';
          else if (contentType.includes('webp')) extension = '.webp';
        }
        
        const filename = `page_${(i + 1).toString().padStart(3, '0')}${extension}`;
        const filepath = path.join(outputDir, filename);
        
        // Crear directorio si no existe
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Guardar imagen
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        downloadedImages.push(filepath);
        console.log(`✅ Descargada: ${filename}`);
        
      } catch (error) {
        console.error(`❌ Error descargando imagen ${i + 1}:`, error.message);
      }
    }
    
    return downloadedImages;
  }

  /**
   * Procesar URL y generar PDF
   * @param {string} url - URL a procesar
   * @param {string} mode - Modo de procesamiento
   */
  async processUrl(url, mode = '/d') {
    try {
      console.log(`🚀 Procesando URL con scraping ligero: ${url}`);
      
      // Extraer contenido
      const content = await this.extractContent(url);
      
      if (content.images.length === 0) {
        throw new Error('No se encontraron imágenes para descargar');
      }
      
      // Crear directorio temporal
      const tempDir = path.join(process.cwd(), 'temp_images');
      
      // Descargar imágenes
      const downloadedImages = await this.downloadImages(content.images, tempDir);
      
      if (downloadedImages.length === 0) {
        throw new Error('No se pudo descargar ninguna imagen');
      }
      
      // Generar PDF
      const outputDir = configLoader.load("DIRECTORY", "output") || 'output';
      const pdfPath = path.join(outputDir, `${content.title}.pdf`);
      
      console.log('📄 Generando PDF...');
      await pdfGenerator.imagesToPdf(downloadedImages, pdfPath);
      
      // Limpiar archivos temporales
      this.cleanupTempFiles(tempDir);
      
      console.log(`✅ PDF generado: ${pdfPath}`);
      return pdfPath;
      
    } catch (error) {
      console.error('❌ Error procesando URL:', error.message);
      throw error;
    }
  }

  /**
   * Limpiar archivos temporales
   * @param {string} tempDir - Directorio temporal
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
   * @param {string} title - Título original
   * @returns {string} - Título sanitizado
   */
  sanitizeTitle(title) {
    return title
      .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '_') // Espacios a guiones bajos
      .substring(0, 100); // Límite de caracteres
  }
}

export const lightScrapingService = new LightScrapingService();

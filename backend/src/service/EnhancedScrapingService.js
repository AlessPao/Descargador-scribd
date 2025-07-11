import axios from 'axios';
import { load } from 'cheerio';
import { configLoader } from '../utils/io/ConfigLoader.js';
import { pdfGenerator } from '../utils/io/PdfGenerator.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { URL } from 'url';

/**
 * Servicio de scraping mejorado con múltiples estrategias
 */
class EnhancedScrapingService {
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
   * Extraer contenido de Scribd con múltiples estrategias
   */
  async extractScribdContent(url) {
    try {
      console.log(`🔍 Procesando Scribd: ${url}`);
      
      const response = await this.axios.get(url);
      const $ = load(response.data);
      
      // Extraer título
      const title = $('title').text().split(' - ')[0] || $('h1').first().text() || 'documento';
      
      const images = [];
      
      // Estrategia 1: Buscar en scripts JSON embebidos
      console.log('🔍 Estrategia 1: Buscando datos JSON embebidos...');
      const scripts = $('script').toArray();
      
      for (const script of scripts) {
        const content = $(script).html();
        if (content) {
          // Buscar patrones específicos de Scribd
          const patterns = [
            /page_images['"\\s]*:[\\s]*\\[(.*?)\\]/g,
            /document_pages['"\\s]*:[\\s]*\\[(.*?)\\]/g,
            /pageImageUrls['"\\s]*:[\\s]*\\[(.*?)\\]/g,
            /"page_image_urls"\\s*:\\s*\\[(.*?)\\]/g,
            /"images"\\s*:\\s*\\[(.*?)\\]/g
          ];
          
          for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
              console.log(`✅ Encontrado patrón: ${pattern}`);
              try {
                // Extraer URLs de las coincidencias
                const urlMatches = content.match(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|gif|webp)/gi);
                if (urlMatches) {
                  urlMatches.forEach((url, i) => {
                    const cleanUrl = url.replace(/\\\\/g, '');
                    if (cleanUrl.includes('scribd') || cleanUrl.includes('page')) {
                      images.push({
                        src: cleanUrl,
                        page: images.length + 1,
                        alt: `página ${images.length + 1}`
                      });
                    }
                  });
                }
              } catch (e) {
                console.error('Error procesando patrón:', e.message);
              }
            }
          }
        }
      }
      
      // Estrategia 2: Buscar elementos img con patrones específicos
      if (images.length === 0) {
        console.log('🔍 Estrategia 2: Buscando elementos img...');
        const imageSelectors = [
          'img[src*="scribd.com"]',
          'img[data-src*="scribd.com"]',
          'img[src*="document"]',
          'img[data-src*="document"]',
          'img[src*="page"]',
          'img[data-src*="page"]',
          '.page img',
          '.document_page img',
          'img[src*="/pages/"]',
          'img[data-src*="/pages/"]',
          'img[class*="page"]',
          'img[id*="page"]'
        ];
        
        for (const selector of imageSelectors) {
          $(selector).each((i, img) => {
            const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
            if (src && !src.includes('data:image')) {
              const fullUrl = this.resolveUrl(src, url);
              if (fullUrl.includes('scribd') || fullUrl.includes('page') || fullUrl.includes('document')) {
                images.push({
                  src: fullUrl,
                  page: images.length + 1,
                  alt: $(img).attr('alt') || `página ${images.length + 1}`
                });
              }
            }
          });
        }
      }
      
      // Estrategia 3: Intentar con API endpoints conocidos
      if (images.length === 0) {
        console.log('🔍 Estrategia 3: Intentando APIs conocidas...');
        const docId = this.extractDocumentId(url);
        if (docId) {
          console.log(`📋 ID del documento: ${docId}`);
          const apiUrls = [
            `https://www.scribd.com/doc/${docId}/pages`,
            `https://www.scribd.com/document/${docId}/pages`,
            `https://www.scribd.com/api/document/${docId}/pages`
          ];
          
          for (const apiUrl of apiUrls) {
            try {
              console.log(`🔍 Intentando API: ${apiUrl}`);
              const apiResponse = await this.axios.get(apiUrl);
              if (apiResponse.data && Array.isArray(apiResponse.data)) {
                apiResponse.data.forEach((page, i) => {
                  if (page.image_url || page.url) {
                    images.push({
                      src: page.image_url || page.url,
                      page: i + 1,
                      alt: `página ${i + 1}`
                    });
                  }
                });
              }
            } catch (apiError) {
              console.log(`❌ API falló: ${apiUrl}`);
            }
          }
        }
      }
      
      // Estrategia 4: Buscar en todos los scripts por URLs de imágenes
      if (images.length === 0) {
        console.log('🔍 Estrategia 4: Búsqueda exhaustiva de URLs...');
        const allScriptContent = scripts.map(script => $(script).html()).join(' ');
        
        // Buscar todas las URLs de imágenes en el contenido
        const allImageUrls = allScriptContent.match(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|gif|webp)/gi);
        
        if (allImageUrls) {
          console.log(`📋 Encontradas ${allImageUrls.length} URLs de imágenes`);
          
          allImageUrls.forEach((imgUrl, i) => {
            const cleanUrl = imgUrl.replace(/\\\\/g, '');
            // Filtrar solo URLs que parecen ser páginas de documentos
            if (cleanUrl.includes('scribd') || 
                cleanUrl.includes('page') || 
                cleanUrl.includes('document') ||
                cleanUrl.includes('thumb') ||
                cleanUrl.match(/p\\d+/)) {
              images.push({
                src: cleanUrl,
                page: images.length + 1,
                alt: `imagen ${images.length + 1}`
              });
            }
          });
        }
      }
      
      // Eliminar duplicados
      const uniqueImages = images.filter((img, index, self) => 
        index === self.findIndex(t => t.src === img.src)
      );
      
      console.log(`📄 Encontradas ${uniqueImages.length} imágenes únicas`);
      
      return {
        title: this.sanitizeTitle(title),
        images: uniqueImages,
        source: 'scribd',
        url
      };
      
    } catch (error) {
      console.error('❌ Error procesando Scribd:', error.message);
      throw new Error(`Error procesando Scribd: ${error.message}`);
    }
  }

  /**
   * Extraer ID del documento de la URL
   */
  extractDocumentId(url) {
    const patterns = [
      /\/doc\/(\d+)/,
      /\/document\/(\d+)/,
      /scribd\.com\/.*?(\d{8,})/,
      /\/([0-9]+)/
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
   * Descargar imágenes con reintentos
   */
  async downloadImages(images, outputDir) {
    const downloadedImages = [];
    
    console.log(`📥 Descargando ${images.length} imágenes...`);
    
    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      let success = false;
      
      // Intentar descargar con diferentes headers
      const strategies = [
        { referer: 'https://www.scribd.com/' },
        { referer: 'https://www.google.com/' },
        { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15' }
      ];
      
      for (const strategy of strategies) {
        try {
          console.log(`📥 Descargando imagen ${i + 1}/${images.length}: ${image.src}`);
          
          const response = await this.axios.get(image.src, { 
            responseType: 'stream',
            timeout: 30000,
            headers: {
              ...this.axios.defaults.headers,
              ...strategy
            }
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
          if (stats.size > 1000) { // Al menos 1KB
            downloadedImages.push(filepath);
            console.log(`✅ Descargada: ${filename} (${stats.size} bytes)`);
            success = true;
            break;
          } else {
            console.log(`⚠️ Archivo muy pequeño: ${filename} (${stats.size} bytes)`);
            fs.unlinkSync(filepath);
          }
          
        } catch (error) {
          console.error(`❌ Error con estrategia ${JSON.stringify(strategy)}:`, error.message);
        }
      }
      
      if (!success) {
        console.error(`❌ No se pudo descargar la imagen ${i + 1}: ${image.src}`);
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
      
      // Solo soportamos Scribd por ahora con este método mejorado
      if (url.includes('scribd.com')) {
        content = await this.extractScribdContent(url);
      } else {
        throw new Error('Solo se soporta Scribd.com con este método mejorado');
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

export const enhancedScrapingService = new EnhancedScrapingService();

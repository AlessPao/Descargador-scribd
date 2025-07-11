import puppeteer from 'puppeteer'

class PuppeteerSg {
  constructor() {
    if (!PuppeteerSg.instance) {
      PuppeteerSg.instance = this;
      process.on('exit', () => {
        this.close();
      });
    }
    return PuppeteerSg.instance;
  }

  /**
   * Verificar si Puppeteer está disponible
   */
  isPuppeteerAvailable() {
    try {
      // Verificar que puppeteer esté importado correctamente
      return typeof puppeteer !== 'undefined' && typeof puppeteer.launch === 'function';
    } catch (error) {
      console.error('❌ Error verificando Puppeteer:', error.message);
      return false;
    }
  }

  /**
   * Launch a browser
   */
  async launch() {
    // Verificar si Puppeteer está disponible
    if (!this.isPuppeteerAvailable()) {
      throw new Error('Puppeteer no está disponible en este entorno');
    }

    const puppeteerOptions = {
      headless: "new",
      defaultViewport: null,
    };

    // Configuración para producción (Render, Heroku, etc.)
    if (process.env.NODE_ENV === 'production') {
      puppeteerOptions.args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-sync',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-ipc-flooding-protection'
      ];
      
      // Intentar detectar Chrome automáticamente en diferentes rutas
      const possibleChromePaths = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        process.env.CHROME_BIN,
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/opt/google/chrome/chrome',
        '/opt/render/project/.render/chrome/opt/google/chrome/chrome',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      ];
      
      let chromePath = null;
      console.log('🔍 Buscando Chrome en el sistema...');
      
      for (const path of possibleChromePaths) {
        if (path) {
          try {
            const fs = await import('fs');
            if (fs.existsSync(path)) {
              chromePath = path;
              console.log(`✅ Chrome encontrado en: ${path}`);
              break;
            } else {
              console.log(`❌ No encontrado en: ${path}`);
            }
          } catch (error) {
            console.log(`⚠️ Error verificando ${path}:`, error.message);
          }
        }
      }
      
      if (chromePath) {
        puppeteerOptions.executablePath = chromePath;
        console.log(`🚀 Usando Chrome en: ${chromePath}`);
      } else {
        console.log('⚠️ No se encontró Chrome instalado, usando Chromium de Puppeteer');
      }
    }

    // Intentar múltiples estrategias de lanzamiento
    const launchStrategies = [
      // Estrategia 1: Con la configuración actual
      () => {
        console.log('🔄 Estrategia 1: Configuración completa');
        return puppeteer.launch(puppeteerOptions);
      },
      
      // Estrategia 2: Sin executablePath
      () => {
        const options = { ...puppeteerOptions };
        delete options.executablePath;
        console.log('🔄 Estrategia 2: Sin executablePath personalizado');
        return puppeteer.launch(options);
      },
      
      // Estrategia 3: Con configuración mínima
      () => {
        console.log('🔄 Estrategia 3: Configuración mínima');
        return puppeteer.launch({
          headless: "new",
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
      },
      
      // Estrategia 4: Solo headless básico
      () => {
        console.log('🔄 Estrategia 4: Solo headless básico');
        return puppeteer.launch({ headless: "new" });
      },
      
      // Estrategia 5: Headless legacy
      () => {
        console.log('🔄 Estrategia 5: Headless legacy');
        return puppeteer.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }
    ];

    let lastError = null;
    console.log(`🚀 Iniciando lanzamiento de Puppeteer (${launchStrategies.length} estrategias)...`);
    
    for (let i = 0; i < launchStrategies.length; i++) {
      try {
        console.log(`📡 Intento ${i + 1}/${launchStrategies.length}...`);
        
        this.browser = await launchStrategies[i]();
        console.log('✅ Puppeteer lanzado exitosamente');
        return;
      } catch (error) {
        lastError = error;
        console.error(`❌ Intento ${i + 1} falló:`, error.message);
        
        // Mostrar información adicional en el último intento
        if (i === launchStrategies.length - 1) {
          console.log('🔍 Información de diagnóstico final:');
          console.log('Platform:', process.platform);
          console.log('Architecture:', process.arch);
          console.log('Node version:', process.version);
          console.log('Working directory:', process.cwd());
          console.log('Environment variables:');
          console.log('  NODE_ENV:', process.env.NODE_ENV);
          console.log('  PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
          console.log('  CHROME_BIN:', process.env.CHROME_BIN);
          console.log('  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:', process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD);
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    console.error('❌ Todos los intentos de lanzamiento de Puppeteer fallaron');
    console.log('💡 La aplicación continuará con servicios alternativos');
    
    throw new Error(`Puppeteer no disponible después de ${launchStrategies.length} intentos. Último error: ${lastError?.message || 'Desconocido'}`);
  }

  /**
   * New a page
   * @param {string} url 
   * @returns 
   */
  async getPage(url) {
    if (!this.browser) {
      await this.launch()
    }
    let page = await this.browser.newPage()
    await page.goto(url, {
      waitUntil: "load",
    })
    return page
  }

  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const puppeteerSg = new PuppeteerSg()

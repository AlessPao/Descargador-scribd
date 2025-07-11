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
   * Launch a browser
   */
  async launch() {
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
        '--disable-background-networking'
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
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      ];
      
      let chromePath = null;
      for (const path of possibleChromePaths) {
        if (path) {
          try {
            const fs = await import('fs');
            if (fs.existsSync(path)) {
              chromePath = path;
              console.log(`Found Chrome at: ${path}`);
              break;
            }
          } catch (error) {
            console.log(`Could not access ${path}:`, error.message);
          }
        }
      }
      
      if (chromePath) {
        puppeteerOptions.executablePath = chromePath;
        console.log(`Using Chrome at: ${chromePath}`);
      } else {
        console.log('No Chrome installation found, using Puppeteer\'s bundled Chromium');
      }
    }

    // Intentar múltiples estrategias de lanzamiento
    const launchStrategies = [
      // Estrategia 1: Con la configuración actual
      () => puppeteer.launch(puppeteerOptions),
      
      // Estrategia 2: Sin executablePath
      () => {
        const options = { ...puppeteerOptions };
        delete options.executablePath;
        console.log('🔄 Retrying without custom executable path...');
        return puppeteer.launch(options);
      },
      
      // Estrategia 3: Con configuración mínima
      () => {
        console.log('🔄 Retrying with minimal configuration...');
        return puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      },
      
      // Estrategia 4: Solo headless
      () => {
        console.log('🔄 Retrying with headless only...');
        return puppeteer.launch({ headless: true });
      }
    ];

    let lastError = null;
    for (let i = 0; i < launchStrategies.length; i++) {
      try {
        console.log(`� Launching Puppeteer (attempt ${i + 1}/${launchStrategies.length})...`);
        if (i === 0) {
          console.log('Options:', JSON.stringify(puppeteerOptions, null, 2));
        }
        
        this.browser = await launchStrategies[i]();
        console.log('✅ Puppeteer launched successfully');
        return;
      } catch (error) {
        lastError = error;
        console.error(`❌ Launch attempt ${i + 1} failed:`, error.message);
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    console.error('❌ All Puppeteer launch attempts failed');
    throw new Error(`Failed to launch Puppeteer after ${launchStrategies.length} attempts. Last error: ${lastError.message}`);
  }

  /**
   * New a page
   * @param {string} url 
   * @returns 
   */
  async getPage(url) {
    if (!this.browser) {
      await this.launch({headless: true, timeout: 0})
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

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
        '--disable-features=VizDisplayCompositor'
      ];
      
      // No establecer executablePath para permitir que Puppeteer use su propio Chromium
      // Solo usar executablePath si está explícitamente definido y el archivo existe
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
            puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            console.log(`Using custom Chromium at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
          } else {
            console.log(`Custom path ${process.env.PUPPETEER_EXECUTABLE_PATH} not found, using Puppeteer's bundled Chromium`);
          }
        } catch (error) {
          console.log(`Could not access ${process.env.PUPPETEER_EXECUTABLE_PATH}:`, error.message);
        }
      } else {
        console.log('Using Puppeteer\'s bundled Chromium');
      }
    }

    try {
      console.log('🚀 Launching Puppeteer with options:', JSON.stringify(puppeteerOptions, null, 2));
      this.browser = await puppeteer.launch(puppeteerOptions);
      console.log('✅ Puppeteer launched successfully');
    } catch (error) {
      console.error('❌ Failed to launch Puppeteer:', error.message);
      
      // Intentar sin executablePath como fallback
      if (puppeteerOptions.executablePath) {
        console.log('🔄 Retrying without custom executable path...');
        delete puppeteerOptions.executablePath;
        try {
          this.browser = await puppeteer.launch(puppeteerOptions);
          console.log('✅ Puppeteer launched successfully with bundled Chromium');
        } catch (fallbackError) {
          console.error('❌ Failed to launch even with bundled Chromium:', fallbackError.message);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
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

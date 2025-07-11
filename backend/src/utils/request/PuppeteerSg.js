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
      
      // Intentar diferentes rutas de Chromium
      const possiblePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        process.env.PUPPETEER_EXECUTABLE_PATH
      ].filter(Boolean);
      
      for (const executablePath of possiblePaths) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(executablePath)) {
            puppeteerOptions.executablePath = executablePath;
            console.log(`Using Chromium at: ${executablePath}`);
            break;
          }
        } catch (error) {
          console.log(`Could not access ${executablePath}:`, error.message);
        }
      }
    }

    try {
      this.browser = await puppeteer.launch(puppeteerOptions);
      console.log('✅ Puppeteer launched successfully');
    } catch (error) {
      console.error('❌ Failed to launch Puppeteer:', error.message);
      
      // Intentar instalación automática si falla
      if (error.message.includes('Could not find Chromium')) {
        console.log('🔄 Attempting to install Chromium...');
        try {
          const { execSync } = await import('child_process');
          execSync('npx @puppeteer/browsers install chrome@stable', { stdio: 'inherit' });
          console.log('✅ Chromium installed, retrying...');
          this.browser = await puppeteer.launch(puppeteerOptions);
        } catch (installError) {
          console.error('❌ Failed to install Chromium:', installError.message);
          throw error;
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

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
        '--window-size=1920x1080'
      ];
    }

    this.browser = await puppeteer.launch(puppeteerOptions);
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

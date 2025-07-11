import { scribdDownloader } from "./service/ScribdDownloader.js"
import { slideshareDownloader } from "./service/SlideshareDownloader.js"
import { everandDownloader } from "./service/EverandDownloader.js"
import { lightScrapingService } from "./service/LightScrapingService.js"
import * as scribdRegex from "./const/ScribdRegex.js"
import * as slideshareRegex from "./const/SlideshareRegex.js"
import * as everandRegex from "./const/EverandRegex.js"

class App {
    constructor() {
        if (!App.instance) {
            App.instance = this
        }
        return App.instance
    }

    async execute(url, flag) {
        try {
            // Intentar con el servicio específico primero
            if (url.match(scribdRegex.DOMAIN)) {
                await scribdDownloader.execute(url, flag)
            } else if (url.match(slideshareRegex.DOMAIN)) {
                await slideshareDownloader.execute(url)
            } else if (url.match(everandRegex.DOMAIN)) {
                await everandDownloader.execute(url)
            } else {
                throw new Error(`Unsupported URL: ${url}`)
            }
        } catch (error) {
            console.error('❌ Error con servicio específico:', error.message);
            
            // Si el error es relacionado con Puppeteer, intentar con el servicio ligero
            if (error.message.includes('Puppeteer') || error.message.includes('chrome') || error.message.includes('browser')) {
                console.log('🔄 Intentando con servicio de scraping ligero...');
                try {
                    await lightScrapingService.processUrl(url, flag);
                    console.log('✅ Procesado exitosamente con servicio ligero');
                } catch (lightError) {
                    console.error('❌ Error con servicio ligero:', lightError.message);
                    throw new Error(`Error con ambos servicios. Principal: ${error.message}. Alternativo: ${lightError.message}`);
                }
            } else {
                throw error;
            }
        }
    }
}

export const app = new App()
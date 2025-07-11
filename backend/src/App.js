import { httpScrapingService } from "./service/HttpScrapingService.js"
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
            console.log(`🚀 Procesando URL: ${url}`);
            
            // Usar el servicio HTTP para todos los tipos de URL
            await httpScrapingService.processUrl(url, flag);
            
            console.log('✅ Procesamiento completado exitosamente');
            
        } catch (error) {
            console.error('❌ Error procesando URL:', error.message);
            throw error;
        }
    }
}

export const app = new App()
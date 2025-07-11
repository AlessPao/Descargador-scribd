import { enhancedScrapingService } from "./service/EnhancedScrapingService.js"
import { bruteForceScrapingService } from "./service/BruteForceScrapingService.js"
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
            
            // Para Scribd, intentar múltiples estrategias
            if (url.includes('scribd.com')) {
                
                // Estrategia 1: Scraping mejorado con análisis de contenido
                try {
                    console.log('🔄 Estrategia 1: Scraping mejorado...');
                    await enhancedScrapingService.processUrl(url, flag);
                    console.log('✅ Procesamiento completado con servicio mejorado');
                    return;
                } catch (error) {
                    console.error('⚠️ Estrategia 1 falló:', error.message);
                }
                
                // Estrategia 2: Fuerza bruta probando URLs comunes
                try {
                    console.log('🔄 Estrategia 2: Fuerza bruta...');
                    await bruteForceScrapingService.processUrl(url, flag);
                    console.log('✅ Procesamiento completado con fuerza bruta');
                    return;
                } catch (error) {
                    console.error('⚠️ Estrategia 2 falló:', error.message);
                }
                
                // Estrategia 3: Scraping HTTP básico
                try {
                    console.log('🔄 Estrategia 3: Scraping HTTP básico...');
                    await httpScrapingService.processUrl(url, flag);
                    console.log('✅ Procesamiento completado con servicio básico');
                    return;
                } catch (error) {
                    console.error('⚠️ Estrategia 3 falló:', error.message);
                }
                
                throw new Error('Todas las estrategias de scraping fallaron para Scribd');
            }
            
            // Para otros sitios, usar el servicio HTTP básico
            console.log('🔄 Usando servicio HTTP básico para sitio no-Scribd...');
            await httpScrapingService.processUrl(url, flag);
            
            console.log('✅ Procesamiento completado exitosamente');
            
        } catch (error) {
            console.error('❌ Error procesando URL:', error.message);
            throw error;
        }
    }
}

export const app = new App()
import { enhancedScrapingService } from './src/service/EnhancedScrapingService.js';

async function testEnhancedScraping() {
    try {
        console.log('🧪 Probando servicio de scraping mejorado...');
        
        // URL de prueba de Scribd
        const testUrl = 'https://www.scribd.com/doc/123456789/test-document';
        
        console.log(`📋 Probando URL: ${testUrl}`);
        
        // Probar extracción de contenido
        const content = await enhancedScrapingService.extractScribdContent(testUrl);
        
        console.log('📊 Resultados:');
        console.log('- Título:', content.title);
        console.log('- Imágenes encontradas:', content.images.length);
        console.log('- Fuente:', content.source);
        
        if (content.images.length > 0) {
            console.log('🖼️ Primeras 3 imágenes:');
            content.images.slice(0, 3).forEach((img, i) => {
                console.log(`  ${i + 1}. ${img.src}`);
            });
        }
        
        console.log('✅ Prueba completada');
        
    } catch (error) {
        console.error('❌ Error en prueba:', error.message);
        console.error('Stack:', error.stack);
    }
}

testEnhancedScraping();

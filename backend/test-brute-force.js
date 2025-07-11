import { bruteForceScrapingService } from './src/service/BruteForceScrapingService.js';

async function testBruteForce() {
    try {
        console.log('🧪 Probando servicio de fuerza bruta...');
        
        // Simular un ID de documento
        const testUrl = 'https://www.scribd.com/doc/123456789/test-document';
        
        console.log(`📋 Probando URL: ${testUrl}`);
        
        // Probar extracción de ID
        const docId = bruteForceScrapingService.extractDocumentId(testUrl);
        console.log(`📋 ID extraído: ${docId}`);
        
        // Generar URLs probables
        const possibleUrls = bruteForceScrapingService.generateProbableImageUrls(testUrl, docId);
        console.log(`🔍 URLs generadas: ${possibleUrls.length}`);
        
        // Mostrar primeras 10 URLs
        console.log('📋 Primeras 10 URLs probables:');
        possibleUrls.slice(0, 10).forEach((url, i) => {
            console.log(`  ${i + 1}. ${url}`);
        });
        
        console.log('✅ Prueba de generación de URLs completada');
        
    } catch (error) {
        console.error('❌ Error en prueba:', error.message);
    }
}

testBruteForce();

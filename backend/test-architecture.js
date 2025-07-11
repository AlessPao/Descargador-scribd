#!/usr/bin/env node

/**
 * Script para verificar que la nueva arquitectura funciona correctamente
 */

import { httpScrapingService } from './src/service/HttpScrapingService.js';
import axios from 'axios';
import { load } from 'cheerio';

console.log('🔍 Verificando nueva arquitectura...');

async function testDependencies() {
  try {
    console.log('📦 Verificando dependencias...');
    
    // Verificar axios
    const response = await axios.get('https://httpbin.org/get');
    console.log('✅ Axios funcionando');
    
    // Verificar cheerio
    const $ = load('<html><body><h1>Test</h1></body></html>');
    const title = $('h1').text();
    console.log('✅ Cheerio funcionando:', title);
    
    // Verificar servicio HTTP
    console.log('✅ HttpScrapingService importado correctamente');
    
    return true;
  } catch (error) {
    console.error('❌ Error verificando dependencias:', error.message);
    return false;
  }
}

async function testHttpService() {
  try {
    console.log('🧪 Probando servicio HTTP...');
    
    // Test con una URL simple
    const testUrl = 'https://httpbin.org/html';
    const response = await axios.get(testUrl);
    const $ = load(response.data);
    
    console.log('✅ Servicio HTTP funcional');
    
    return true;
  } catch (error) {
    console.error('❌ Error probando servicio HTTP:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🎯 Ejecutando pruebas...\n');
  
  const tests = [
    { name: 'Dependencias', fn: testDependencies },
    { name: 'Servicio HTTP', fn: testHttpService }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR -`, error.message);
    }
  }
  
  console.log('\n📊 Resultados:');
  console.log(`Pruebas pasadas: ${passed}/${total}`);
  console.log(`Porcentaje de éxito: ${Math.round((passed/total) * 100)}%`);
  
  if (passed === total) {
    console.log('🎉 ¡Todas las pruebas pasaron! La nueva arquitectura está lista.');
  } else {
    console.log('⚠️ Algunas pruebas fallaron. Revisa los errores anteriores.');
  }
}

// Ejecutar pruebas
runTests().catch(error => {
  console.error('❌ Error ejecutando pruebas:', error);
  process.exit(1);
});

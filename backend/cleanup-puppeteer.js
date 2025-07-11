#!/usr/bin/env node

/**
 * Script para limpiar archivos relacionados con Puppeteer
 */

import fs from 'fs';
import path from 'path';

console.log('🧹 Limpiando archivos de Puppeteer...');

const filesToRemove = [
  'install-chrome.js',
  'install-chrome.sh',
  'build.sh',
  'src/utils/request/PuppeteerSg.js'
];

const filesToCheck = [
  'PUPPETEER_TROUBLESHOOTING.md',
  'DEPLOYMENT_GUIDE.md'
];

let removed = 0;
let errors = 0;

console.log('📝 Archivos a eliminar:');
filesToRemove.forEach(file => {
  const filePath = path.resolve(file);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Eliminado: ${file}`);
      removed++;
    } else {
      console.log(`⚠️ No existe: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error eliminando ${file}:`, error.message);
    errors++;
  }
});

console.log('\n📝 Archivos opcionales:');
filesToCheck.forEach(file => {
  const filePath = path.resolve(file);
  if (fs.existsSync(filePath)) {
    console.log(`ℹ️ Existe: ${file} (puedes eliminarlo manualmente si quieres)`);
  }
});

console.log(`\n📊 Resumen:`);
console.log(`Archivos eliminados: ${removed}`);
console.log(`Errores: ${errors}`);

if (errors === 0) {
  console.log('🎉 Limpieza completada exitosamente');
} else {
  console.log('⚠️ Algunos archivos no pudieron ser eliminados');
}

console.log('\n💡 Siguiente paso: Redeploy tu aplicación para usar la nueva arquitectura');
console.log('🚀 Comando: git add . && git commit -m "Remove Puppeteer, use HTTP scraping" && git push');

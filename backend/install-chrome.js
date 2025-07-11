#!/usr/bin/env node

/**
 * Script para instalar Chromium en plataformas de despliegue
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function installChrome() {
  try {
    console.log('🔍 Verificando instalación de Chromium...');
    
    // Verificar si ya está instalado
    const browserFetcher = puppeteer.createBrowserFetcher();
    const revisionInfo = await browserFetcher.download(puppeteer.PUPPETEER_REVISIONS.chromium);
    
    console.log('✅ Chromium instalado correctamente en:', revisionInfo.executablePath);
    
    // Verificar que el archivo existe
    if (fs.existsSync(revisionInfo.executablePath)) {
      console.log('✅ Ejecutable verificado');
    } else {
      console.error('❌ Error: El ejecutable no existe');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error instalando Chromium:', error.message);
    process.exit(1);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  installChrome();
}

module.exports = installChrome;

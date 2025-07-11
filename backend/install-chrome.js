#!/usr/bin/env node

/**
 * Script para instalar Chromium en plataformas de despliegue
 */

import puppeteer from 'puppeteer';

async function installChrome() {
  try {
    console.log('🔍 Verificando instalación de Chromium...');
    
    // Intentar lanzar el navegador para verificar que funciona
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    console.log('✅ Chromium instalado y funcionando correctamente');
    
    // Cerrar el navegador
    await browser.close();
    
  } catch (error) {
    console.error('❌ Error con Chromium:', error.message);
    console.log('🔄 Intentando instalar Chromium...');
    
    // Si falla, intentar forzar la instalación
    try {
      const { execSync } = await import('child_process');
      execSync('npx puppeteer install', { stdio: 'inherit' });
      console.log('✅ Chromium instalado via npx');
    } catch (installError) {
      console.error('❌ Error instalando Chromium:', installError.message);
      process.exit(1);
    }
  }
}

// Ejecutar la instalación
installChrome();

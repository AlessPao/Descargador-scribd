#!/usr/bin/env node

/**
 * Script para instalar Chromium en plataformas de despliegue
 * Versión que no falla el build si Chrome no está disponible
 */

import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function installChrome() {
  try {
    console.log('🔍 Verificando instalación de Chromium...');
    
    // Primero intentar usar el Chromium incluido con Puppeteer
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
      
      console.log('✅ Chromium instalado y funcionando correctamente');
      await browser.close();
      return;
    } catch (error) {
      console.log('⚠️ Chromium no funciona con configuración inicial:', error.message);
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // Ignorar errores de cierre
        }
      }
    }
    
    // Buscar instalaciones de Chrome existentes primero
    const possibleChromePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/opt/google/chrome/chrome',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ];
    
    console.log('🔍 Buscando instalaciones de Chrome...');
    for (const chromePath of possibleChromePaths) {
      if (fs.existsSync(chromePath)) {
        console.log(`✅ Encontrado Chrome en: ${chromePath}`);
        // Intentar usar esta instalación
        try {
          const testBrowser = await puppeteer.launch({
            headless: "new",
            executablePath: chromePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
          await testBrowser.close();
          console.log('✅ Chrome externo verificado correctamente');
          console.log(`💡 Chrome funcional encontrado en: ${chromePath}`);
          return;
        } catch (error) {
          console.log(`❌ Chrome en ${chromePath} no funciona:`, error.message);
        }
      }
    }
    
    // Si no se encuentra Chrome, intentar instalarlo
    console.log('🔄 Intentando instalar Chromium...');
    
    const installCommands = [
      'npx puppeteer install',
      'npx @puppeteer/browsers install chrome@stable --platform=linux',
      'npm install puppeteer --no-save'
    ];
    
    for (const cmd of installCommands) {
      try {
        console.log(`📦 Ejecutando: ${cmd}`);
        execSync(cmd, { stdio: 'pipe', timeout: 180000 }); // 3 minutos timeout
        console.log('✅ Comando ejecutado exitosamente');
        
        // Verificar que funciona después de la instalación
        const testBrowser = await puppeteer.launch({
          headless: "new",
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        await testBrowser.close();
        console.log('✅ Chromium instalado y verificado correctamente');
        return;
      } catch (installError) {
        console.error(`❌ Error con comando ${cmd}:`, installError.message);
      }
    }
    
    // Si nada funciona, mostrar información de diagnóstico pero NO fallar el build
    console.log('🔍 Información de diagnóstico:');
    console.log('Node version:', process.version);
    console.log('Platform:', process.platform);
    console.log('Architecture:', process.arch);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:', process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD);
    
    console.log('⚠️ No se pudo instalar Chrome, pero la aplicación continuará con servicios alternativos');
    console.log('� La aplicación usará automáticamente el servicio de scraping ligero cuando sea necesario');
    console.log('🚀 Build continuará sin fallar...');
    
    // NO hacer process.exit(1) para no fallar el build
    console.log('✅ Script de instalación completado (modo fallback)');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.log('⚠️ Error en instalación de Chrome, pero build continuará');
    console.log('💡 La aplicación usará servicios alternativos');
    // NO hacer process.exit(1) para no fallar el build
  }
}

// Ejecutar la instalación
installChrome().catch(error => {
  console.error('❌ Error ejecutando instalación:', error.message);
  console.log('⚠️ Build continuará sin Chrome (modo fallback)');
  // NO hacer process.exit(1)
});

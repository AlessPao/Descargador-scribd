#!/usr/bin/env node

/**
 * Script para instalar Chromium en plataformas de despliegue
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
    
    // Si falla, intentar instalar Chromium
    console.log('🔄 Intentando instalar Chromium...');
    
    const installCommands = [
      'npx puppeteer install',
      'npx @puppeteer/browsers install chrome@stable',
      'npm install puppeteer --no-save'
    ];
    
    for (const cmd of installCommands) {
      try {
        console.log(`📦 Ejecutando: ${cmd}`);
        execSync(cmd, { stdio: 'inherit', timeout: 300000 }); // 5 minutos timeout
        console.log('✅ Comando ejecutado exitosamente');
        
        // Verificar que funciona después de la instalación
        const testBrowser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        await testBrowser.close();
        console.log('✅ Chromium instalado y verificado correctamente');
        return;
      } catch (installError) {
        console.error(`❌ Error con comando ${cmd}:`, installError.message);
      }
    }
    
    // Si nada funciona, mostrar información de diagnóstico
    console.log('🔍 Información de diagnóstico:');
    console.log('Node version:', process.version);
    console.log('Platform:', process.platform);
    console.log('Architecture:', process.arch);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:', process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD);
    
    // Buscar instalaciones de Chrome existentes
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
            headless: true,
            executablePath: chromePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
          await testBrowser.close();
          console.log('✅ Chrome externo verificado correctamente');
          console.log(`💡 Configura PUPPETEER_EXECUTABLE_PATH=${chromePath} en tu entorno`);
          return;
        } catch (error) {
          console.log(`❌ Chrome en ${chromePath} no funciona:`, error.message);
        }
      }
    }
    
    console.error('❌ No se pudo instalar o encontrar una instalación funcional de Chrome');
    console.log('💡 Opciones:');
    console.log('1. Usar una alternativa sin Puppeteer (ver documentación)');
    console.log('2. Configurar buildpack de Chrome en tu plataforma de deployment');
    console.log('3. Usar un servicio de scraping externo');
    
    process.exit(1);
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    process.exit(1);
  }
}

// Ejecutar la instalación
installChrome();

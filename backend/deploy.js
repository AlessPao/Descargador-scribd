#!/usr/bin/env node

/**
 * Script para deployr los cambios
 */

import { execSync } from 'child_process';

console.log('🚀 Preparando deployment...');

try {
    // Agregar todos los cambios
    console.log('📝 Agregando cambios...');
    execSync('git add .', { stdio: 'inherit', cwd: '../' });
    
    // Commit con mensaje descriptivo
    console.log('💾 Haciendo commit...');
    execSync('git commit -m "Fix: Remove Puppeteer, implement HTTP scraping, fix CORS"', { 
        stdio: 'inherit', 
        cwd: '../' 
    });
    
    // Push to repository
    console.log('🌐 Pushing to repository...');
    execSync('git push', { stdio: 'inherit', cwd: '../' });
    
    console.log('✅ Deployment preparado exitosamente');
    console.log('🎯 Render debería autodeploy en unos minutos');
    console.log('🔗 Verifica el deploy en: https://render.com/dashboard');
    
} catch (error) {
    console.error('❌ Error en deployment:', error.message);
    process.exit(1);
}

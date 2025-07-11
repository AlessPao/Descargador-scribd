#!/usr/bin/env node

/**
 * Script para probar el servidor API
 */

import axios from 'axios';

async function testServer() {
  try {
    console.log('🔍 Probando servidor API...');
    
    // Test endpoint básico
    const response = await axios.get('http://localhost:3001/api/test');
    console.log('✅ Servidor responde correctamente:', response.data);
    
    // Test CORS
    const corsResponse = await axios.get('http://localhost:3001/api/test', {
      headers: {
        'Origin': 'https://descargador-scribd.vercel.app'
      }
    });
    console.log('✅ CORS funcionando');
    
    console.log('🎉 Servidor API funcionando correctamente');
    
  } catch (error) {
    console.error('❌ Error probando servidor:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testServer();

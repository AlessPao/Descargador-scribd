#!/bin/bash

# Script de build para Render.com
# Este script configura el entorno para que la aplicación funcione
# incluso si Chrome no está disponible

echo "🔧 Configurando entorno para deployment..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json no encontrado"
  exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Intentar instalar Chrome, pero continuar si falla
echo "🔍 Intentando instalar Chrome..."
npm run install-chrome || {
  echo "⚠️ Chrome no pudo ser instalado, continuando con servicios alternativos"
  export ENABLE_LIGHT_SCRAPING=true
  export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
}

# Verificar que las dependencias críticas estén instaladas
echo "✅ Verificando dependencias críticas..."
node -e "
try {
  require('express');
  require('axios');
  require('cheerio');
  console.log('✅ Dependencias críticas verificadas');
} catch (error) {
  console.error('❌ Error en dependencias:', error.message);
  process.exit(1);
}
"

# Crear directorio de salida si no existe
mkdir -p output

echo "🎉 Build completado exitosamente"
echo "💡 La aplicación está configurada para usar servicios alternativos si Chrome no está disponible"

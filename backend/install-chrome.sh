#!/bin/bash

# Script para instalar Chrome en sistemas Linux (para Render)
echo "🔍 Instalando Chrome para Puppeteer..."

# Actualizar la lista de paquetes
apt-get update -y

# Instalar dependencias
apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    software-properties-common

# Agregar la clave GPG de Google
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -

# Agregar el repositorio de Google Chrome
echo "deb [arch=amd64] https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list

# Actualizar la lista de paquetes
apt-get update -y

# Instalar Google Chrome
apt-get install -y google-chrome-stable

# Verificar instalación
google-chrome --version

echo "✅ Chrome instalado exitosamente"

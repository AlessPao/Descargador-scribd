# Guía de Solución de Problemas con Puppeteer

## Problema: "Failed to launch Puppeteer: Tried to find the browser at the configured path"

Este error ocurre cuando Puppeteer no puede encontrar una instalación de Chrome/Chromium en el sistema de deployment.

## Soluciones Implementadas

### 1. Detección Automática Multi-Path
El sistema ahora busca Chrome en múltiples ubicaciones:
- `/usr/bin/google-chrome-stable`
- `/usr/bin/google-chrome`
- `/usr/bin/chromium-browser`
- `/usr/bin/chromium`
- `/opt/google/chrome/chrome`
- Variables de entorno: `PUPPETEER_EXECUTABLE_PATH`, `CHROME_BIN`

### 2. Estrategia de Fallback
Si Puppeteer falla, el sistema automáticamente:
1. Intenta sin `executablePath` personalizado
2. Usa configuración mínima
3. Intenta solo con `headless: true`
4. Como último recurso, usa el servicio de scraping ligero (sin Puppeteer)

### 3. Servicio de Scraping Ligero
Si Puppeteer falla completamente, usa `LightScrapingService` que emplea:
- `axios` para solicitudes HTTP
- `cheerio` para parsing HTML
- No requiere browser headless

## Configuración para Diferentes Plataformas

### Render.com
```yaml
buildCommand: cd backend && npm install && npm run install-chrome
envVars:
  - key: PUPPETEER_EXECUTABLE_PATH
    value: /usr/bin/google-chrome
  - key: CHROME_BIN
    value: /usr/bin/google-chrome
```

### Heroku
Agregar buildpack de Chrome:
```bash
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-google-chrome
```

### Vercel
En `vercel.json`:
```json
{
  "functions": {
    "backend/src/api/server.js": {
      "maxDuration": 30
    }
  },
  "env": {
    "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "true"
  }
}
```

### Docker
```dockerfile
RUN apt-get update && apt-get install -y \
    chromium-browser \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## Comandos de Diagnóstico

### Instalar Chrome manualmente
```bash
# Backend
cd backend
npm run install-chrome
```

### Verificar instalación
```bash
# Verificar que Chrome está instalado
which google-chrome || which chromium-browser || which chromium

# Verificar que funciona
google-chrome --version
```

### Debugging
```bash
# Ejecutar con logs detallados
DEBUG=puppeteer:* npm start
```

## Variables de Entorno Importantes

```bash
# Obligatorias para producción
NODE_ENV=production

# Para Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
CHROME_BIN=/usr/bin/google-chrome

# Opcional para debugging
DEBUG=puppeteer:*
```

## Alternativas Sin Puppeteer

Si los problemas persisten, considera estas alternativas:

### 1. Usar el servicio ligero
El sistema automáticamente usa `LightScrapingService` cuando Puppeteer falla.

### 2. Servicios externos
- ScrapingBee
- Browserless
- Puppeteer como servicio

### 3. Bibliotecas alternativas
- Playwright (similar a Puppeteer)
- Selenium con ChromeDriver
- Requests + BeautifulSoup (Python)

## Monitoreo y Logs

Los logs te ayudarán a identificar el problema:

```
✅ Puppeteer launched successfully
❌ Failed to launch Puppeteer: [mensaje de error]
🔄 Retrying without custom executable path...
🔄 Intentando con servicio de scraping ligero...
```

## Contacto

Si el problema persiste, revisa:
1. Los logs de deployment
2. Las variables de entorno
3. La configuración de buildpacks
4. Los permisos del sistema de archivos

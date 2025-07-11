# Guía de Deployment - Scribd Downloader

## Problema Resuelto
Esta versión ha sido optimizada para funcionar en entornos de deployment donde Chrome/Puppeteer puede no estar disponible.

## Arquitectura de Fallback

### 1. Estrategia Principal: Puppeteer
- Detecta automáticamente instalaciones de Chrome
- Múltiples estrategias de lanzamiento
- Configuración optimizada para producción

### 2. Estrategia Alternativa: Scraping Ligero
- Usa `axios` + `cheerio` 
- No requiere navegador headless
- Extrae contenido HTML y descarga imágenes

### 3. Proceso de Fallback Automático
```
URL Request → Puppeteer → [Falla] → Light Scraping → PDF Generation
```

## Configuración por Plataforma

### Render.com ✅
```yaml
# render.yaml
buildCommand: cd backend && chmod +x build.sh && ./build.sh
envVars:
  - key: ENABLE_LIGHT_SCRAPING
    value: true
```

### Vercel ✅
```json
// vercel.json
{
  "functions": {
    "backend/src/api/server.js": {
      "maxDuration": 30
    }
  }
}
```

### Heroku ✅
```bash
# Agregar buildpack
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-google-chrome

# Variables de entorno
heroku config:set ENABLE_LIGHT_SCRAPING=true
heroku config:set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
```

## Scripts de Deployment

### 1. build.sh
- Instala dependencias
- Intenta instalar Chrome
- Continúa sin fallar si Chrome no está disponible
- Configura variables de entorno para fallback

### 2. install-chrome.js
- Versión que no falla el build
- Múltiples estrategias de instalación
- Diagnóstico detallado

## Logs de Deployment

### Éxito con Puppeteer
```
✅ Chrome encontrado en: /usr/bin/google-chrome
🚀 Usando Chrome en: /usr/bin/google-chrome
✅ Puppeteer lanzado exitosamente
```

### Éxito con Fallback
```
⚠️ Chrome no pudo ser instalado, continuando con servicios alternativos
🔄 Intentando con servicio de scraping ligero...
✅ Procesado exitosamente con servicio ligero
```

## Troubleshooting

### Build Falla
1. **Verificar logs**: Buscar errores específicos
2. **Dependencias**: Verificar que `cheerio` esté instalado
3. **Permisos**: Asegurar que `build.sh` tenga permisos de ejecución

### Runtime Falla
1. **Variables de entorno**: Verificar `ENABLE_LIGHT_SCRAPING=true`
2. **Logs del servidor**: Revisar qué servicio está siendo usado
3. **Memoria**: Verificar límites de memoria en la plataforma

## Comandos de Diagnóstico

```bash
# Verificar instalación local
npm run install-chrome

# Verificar dependencias
node -e "console.log(require('puppeteer').version)"
node -e "console.log(require('cheerio').version)"

# Probar servicios
curl -X POST http://localhost:3001/api/download \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/document"}'
```

## Beneficios de Esta Solución

✅ **Resiliente**: Funciona incluso sin Chrome
✅ **Automático**: Fallback transparente
✅ **Optimizado**: Múltiples estrategias de lanzamiento
✅ **Monitoreable**: Logs detallados para diagnóstico
✅ **Portable**: Funciona en múltiples plataformas

## Limitaciones

⚠️ **Servicio Ligero**: 
- No ejecuta JavaScript
- Limitado a contenido HTML estático
- Puede no funcionar con SPAs complejas

⚠️ **Puppeteer**:
- Requiere más recursos
- Puede fallar en entornos restrictivos
- Necesita Chrome instalado

## Próximos Pasos

1. **Monitorear**: Verificar qué porcentaje de requests usa cada servicio
2. **Optimizar**: Mejorar detección de contenido en servicio ligero
3. **Expandir**: Agregar más estrategias de fallback
4. **Cachear**: Implementar caché para reducir carga

## Soporte

Si tienes problemas:
1. Revisa los logs de deployment
2. Verifica las variables de entorno
3. Prueba localmente primero
4. Consulta la documentación de tu plataforma de deployment

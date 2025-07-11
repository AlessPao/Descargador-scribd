# Deployment Guide

## Overview
This guide covers deployment options for the Scribd-dl application on various platforms.

## Platform-Specific Deployment

### Railway
1. Connect your GitHub repository to Railway
2. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   ```
3. Railway will automatically detect the Node.js application and deploy it

### Vercel
1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `npm install`
3. Add environment variables in Vercel dashboard

### Heroku
1. Create a Heroku app:
   ```bash
   heroku create your-app-name
   ```
2. Add a `Procfile` in the root directory:
   ```
   web: cd backend && npm start
   ```
3. Deploy:
   ```bash
   git push heroku main
   ```

### Docker
1. Create a `Dockerfile` in the root directory:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   
   # Install dependencies
   COPY package*.json ./
   RUN npm install
   
   # Copy backend
   COPY backend/ ./backend/
   WORKDIR /app/backend
   RUN npm install
   
   # Copy frontend and build
   WORKDIR /app
   COPY frontend/ ./frontend/
   WORKDIR /app/frontend
   RUN npm install && npm run build
   
   # Start the application
   WORKDIR /app/backend
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

2. Build and run:
   ```bash
   docker build -t scribd-dl .
   docker run -p 3001:3001 scribd-dl
   ```

## Environment Variables

### Required
- `NODE_ENV`: Set to `production` for production deployments
- `PORT`: Port number (default: 3001)

### Optional
- `SCRIBD_RENDER_TIME`: Override render time from config.ini
- `OUTPUT_DIR`: Override output directory from config.ini

## Configuration

### config.ini
Make sure to customize your `config.ini` file:
```ini
[SCRIBD]
rendertime=100

[DIRECTORY]
output=output
filename=title
```

### Security Considerations
- Never commit sensitive configuration files
- Use environment variables for sensitive data
- Consider using a reverse proxy (nginx) for production
- Implement rate limiting for the API endpoints

## Performance Optimization

### Frontend
- The frontend is built as static files and served by the backend
- Consider using a CDN for static assets in production
- Enable gzip compression in your reverse proxy

### Backend
- Use PM2 for process management in production
- Consider horizontal scaling for high traffic
- Monitor memory usage due to Puppeteer

## Troubleshooting

### Common Issues
1. **Puppeteer not working**: Install system dependencies
2. **Port conflicts**: Check if port 3001 is available
3. **Build failures**: Ensure Node.js version compatibility
4. **File permissions**: Check write permissions for output directory

### Logs
- Check console output for error messages
- Monitor file system for downloaded files
- Use appropriate logging levels for production

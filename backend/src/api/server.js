import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { app } from '../App.js';
import { configLoader } from '../utils/io/ConfigLoader.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = express();
const PORT = process.env.PORT || 3001;

// Función auxiliar para obtener la ruta correcta del directorio de salida
const getOutputDir = () => {
    const outputDir = configLoader.load("DIRECTORY", "output");
    // Usar process.cwd() para que sea relativo al directorio de trabajo actual (raíz del proyecto)
    return path.isAbsolute(outputDir) ? outputDir : path.resolve(process.cwd(), outputDir);
};

// Configuración CORS para producción
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL, 'https://your-vercel-app.vercel.app']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
server.use(cors(corsOptions));
server.use(express.json());
server.use(express.static(getOutputDir()));

// Store para progreso de descargas
const downloadProgress = new Map();

// Endpoints
server.post('/api/download', async (req, res) => {
    try {
        const { url, mode = '/d' } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Generar ID único para el download
        const downloadId = Date.now().toString();
        const outputDir = getOutputDir();
        console.log('Output directory:', outputDir);
        console.log('Output directory exists:', fs.existsSync(outputDir));
        
        downloadProgress.set(downloadId, { 
            status: 'starting', 
            progress: 0, 
            message: 'Iniciando descarga...',
            filename: null,
            downloadUrl: null
        });

        // Responder inmediatamente con el ID
        res.json({ downloadId, status: 'started' });

        // Ejecutar descarga en background
        try {
            downloadProgress.set(downloadId, { 
                status: 'downloading', 
                progress: 25, 
                message: 'Procesando documento...',
                filename: null,
                downloadUrl: null
            });
            
            // Obtener lista de archivos antes de la descarga
            const filesBefore = fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : [];
            console.log('Files before download:', filesBefore);
            
            // Obtener timestamps de archivos existentes para detectar cambios
            const fileTimestamps = {};
            filesBefore.forEach(file => {
                const filePath = path.join(outputDir, file);
                if (fs.existsSync(filePath)) {
                    fileTimestamps[file] = fs.statSync(filePath).mtime.getTime();
                }
            });
            console.log('File timestamps before:', fileTimestamps);
            
            await app.execute(url, mode);
            
            // Obtener lista de archivos después de la descarga
            const filesAfter = fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : [];
            console.log('Files after download:', filesAfter);
            
            // Encontrar archivos nuevos o modificados
            let detectedFile = null;
            
            // Primero buscar archivos completamente nuevos
            const newFiles = filesAfter.filter(file => !filesBefore.includes(file));
            console.log('New files found:', newFiles);
            
            if (newFiles.length > 0) {
                detectedFile = newFiles[0];
                console.log('Using new file:', detectedFile);
            } else {
                // Si no hay archivos nuevos, buscar archivos modificados
                for (const file of filesAfter) {
                    const filePath = path.join(outputDir, file);
                    if (fs.existsSync(filePath)) {
                        const currentTimestamp = fs.statSync(filePath).mtime.getTime();
                        const previousTimestamp = fileTimestamps[file];
                        
                        if (previousTimestamp && currentTimestamp > previousTimestamp) {
                            detectedFile = file;
                            console.log('Using modified file:', detectedFile);
                            break;
                        }
                    }
                }
            }
            
            // Si aún no se detectó ningún archivo, usar el último archivo PDF como fallback
            if (!detectedFile) {
                const pdfFiles = filesAfter.filter(file => file.toLowerCase().endsWith('.pdf'));
                if (pdfFiles.length > 0) {
                    // Ordenar por fecha de modificación y tomar el más reciente
                    const sortedPdfFiles = pdfFiles.map(file => {
                        const filePath = path.join(outputDir, file);
                        return {
                            name: file,
                            mtime: fs.statSync(filePath).mtime.getTime()
                        };
                    }).sort((a, b) => b.mtime - a.mtime);
                    
                    detectedFile = sortedPdfFiles[0].name;
                    console.log('Using most recent PDF as fallback:', detectedFile);
                }
            }
            
            console.log('Selected filename:', detectedFile);
            
            downloadProgress.set(downloadId, { 
                status: 'completed', 
                progress: 100, 
                message: 'Descarga completada',
                filename: detectedFile,
                downloadUrl: detectedFile ? `/api/files/${detectedFile}` : null
            });
            
            console.log('Download completed, set progress:', {
                filename: detectedFile,
                downloadUrl: detectedFile ? `/api/files/${detectedFile}` : null
            });
            
        } catch (error) {
            downloadProgress.set(downloadId, { 
                status: 'error', 
                error: error.message,
                progress: 0,
                message: 'Error en la descarga',
                filename: null,
                downloadUrl: null
            });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para verificar progreso
server.get('/api/download/:id/status', (req, res) => {
    const { id } = req.params;
    const progress = downloadProgress.get(id);
    
    if (!progress) {
        return res.status(404).json({ error: 'Download not found' });
    }
    
    res.json(progress);
});

// Endpoint para obtener configuración
server.get('/api/config', (req, res) => {
    try {
        const config = {
            output: getOutputDir(),
            filename: configLoader.load("DIRECTORY", "filename"),
            rendertime: configLoader.load("SCRIBD", "rendertime")
        };
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para actualizar configuración
server.put('/api/config', (req, res) => {
    try {
        // Aquí implementarías la lógica para actualizar config.ini
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para listar archivos descargados
server.get('/api/downloads', (req, res) => {
    try {
        const outputDir = getOutputDir();
        if (!fs.existsSync(outputDir)) {
            return res.json([]);
        }
        
        const files = fs.readdirSync(outputDir)
            .filter(file => fs.existsSync(path.join(outputDir, file))) // Filtrar archivos que realmente existen
            .map(file => {
                const filePath = path.join(outputDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: `/api/files/${file}`,
                    size: stats.size,
                    created: stats.ctime
                };
            });
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para limpiar archivos antiguos
server.delete('/api/downloads/cleanup', (req, res) => {
    try {
        const outputDir = getOutputDir();
        if (!fs.existsSync(outputDir)) {
            return res.json({ deleted: 0 });
        }
        
        const files = fs.readdirSync(outputDir);
        const now = new Date();
        let deletedCount = 0;
        
        files.forEach(file => {
            const filePath = path.join(outputDir, file);
            const stats = fs.statSync(filePath);
            // Eliminar archivos más antiguos de 1 hora
            const hourInMs = 60 * 60 * 1000;
            if (now - stats.ctime > hourInMs) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        });
        
        res.json({ deleted: deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para descargar archivos
server.get('/api/files/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const outputDir = getOutputDir();
        const filePath = path.join(outputDir, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Configurar headers para descarga del navegador
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'no-cache');
        
        // Enviar el archivo como stream
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        // Eliminar el archivo después de un tiempo prudencial
        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Archivo temporal eliminado: ${filename}`);
                }
            } catch (deleteErr) {
                console.error('Error al eliminar archivo temporal:', deleteErr);
            }
        }, 30000); // Esperar 30 segundos antes de eliminar
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Servir archivos estáticos del frontend en producción
const frontendPath = path.join(__dirname, '../../../frontend/dist');
if (fs.existsSync(frontendPath)) {
    server.use(express.static(frontendPath));
    
    // Manejar rutas del frontend (SPA)
    server.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
            res.sendFile(path.join(frontendPath, 'index.html'));
        }
    });
}

server.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
    if (fs.existsSync(frontendPath)) {
        console.log(`Frontend available at http://localhost:${PORT}`);
    }
    
    // Limpiar archivos temporales al iniciar
    cleanupTempFiles();
    
    // Programar limpieza automática cada 10 minutos
    setInterval(cleanupTempFiles, 10 * 60 * 1000);
});

// Función para limpiar archivos temporales
function cleanupTempFiles() {
    try {
        const outputDir = getOutputDir();
        if (!fs.existsSync(outputDir)) return;
        
        const files = fs.readdirSync(outputDir);
        const now = new Date();
        let deletedCount = 0;
        
        files.forEach(file => {
            const filePath = path.join(outputDir, file);
            const stats = fs.statSync(filePath);
            // Eliminar archivos más antiguos de 1 hora
            const hourInMs = 60 * 60 * 1000;
            if (now - stats.ctime > hourInMs) {
                try {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`Archivo temporal eliminado automáticamente: ${file}`);
                } catch (err) {
                    console.error(`Error al eliminar archivo temporal ${file}:`, err);
                }
            }
        });
        
        if (deletedCount > 0) {
            console.log(`Limpieza automática completada: ${deletedCount} archivos eliminados`);
        }
    } catch (error) {
        console.error('Error en limpieza automática:', error);
    }
}

export default server;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Link, FileText, Image, CheckCircle, AlertCircle, ExternalLink, History } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import HistoryPanel from '../components/HistoryPanel';
import { apiConfig } from '../utils/apiConfig';

const MainPage = () => {
    const [url, setUrl] = useState('');
    const [mode, setMode] = useState('/i');
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [downloadStatus, setDownloadStatus] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [filename, setFilename] = useState(null);
    const [showHistory, setShowHistory] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!url.trim()) return;

        setIsLoading(true);
        setProgress(0);
        setError(null);
        setSuccess(false);
        setDownloadUrl(null);
        setFilename(null);                        setDownloadStatus('Iniciando descarga...');

        try {
            // Iniciar descarga
            const response = await fetch(apiConfig.endpoints.download, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url.trim(),
                    mode
                }),
            });

            if (!response.ok) {
                throw new Error('Error al iniciar la descarga');
            }

            const { downloadId } = await response.json();

            // Polling para verificar progreso
            const pollProgress = setInterval(async () => {
                try {
                    const statusResponse = await fetch(apiConfig.endpoints.downloadStatus(downloadId));
                    const status = await statusResponse.json();

                    setProgress(status.progress);
                    setDownloadStatus(status.message || 'Descargando...');

                    if (status.status === 'completed') {
                        clearInterval(pollProgress);
                        setIsLoading(false);
                        setProgress(100);
                        setSuccess(true);
                        setDownloadUrl(status.downloadUrl);
                        setFilename(status.filename);
                        setDownloadStatus('¡Descarga completada!');
                        
                        // Debug: verificar valores
                        console.log('Download completed:', {
                            success: true,
                            downloadUrl: status.downloadUrl,
                            filename: status.filename
                        });
                        
                    } else if (status.status === 'error') {
                        clearInterval(pollProgress);
                        setIsLoading(false);
                        setError(status.error || 'Error desconocido');
                        setProgress(0);
                        setDownloadStatus('');
                    }
                } catch (err) {
                    clearInterval(pollProgress);
                    setIsLoading(false);
                    setError('Error al verificar el progreso');
                    setProgress(0);
                    setDownloadStatus('');
                }
            }, 1000);

            // Timeout después de 5 minutos
            setTimeout(() => {
                clearInterval(pollProgress);
                if (isLoading) {
                    setIsLoading(false);
                    setError('Timeout: La descarga tomó demasiado tiempo');
                    setProgress(0);
                    setDownloadStatus('');
                }
            }, 300000);

        } catch (err) {
            setIsLoading(false);
            setError(err.message || 'Error al iniciar la descarga');
            setProgress(0);
            setDownloadStatus('');
        }
    };

    const handleDownload = async () => {
        if (downloadUrl) {
            try {
                // Crear un enlace temporal para forzar la descarga
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename || 'documento.pdf';
                link.target = '_blank';
                
                // Agregar el enlace al DOM, hacer clic y eliminarlo
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Mostrar notificación de descarga iniciada
                setDownloadStatus('Descarga iniciada - Revisa tu carpeta de Descargas');
                
                // Limpiar el estado después de la descarga
                setTimeout(() => {
                    setSuccess(false);
                    setDownloadUrl(null);
                    setFilename(null);
                    setProgress(0);
                    setDownloadStatus('');
                }, 5000);
                
            } catch (error) {
                console.error('Error al iniciar descarga:', error);
                setError('Error al iniciar la descarga');
            }
        }
    };

    const resetForm = () => {
        setUrl('');
        setProgress(0);
        setSuccess(false);
        setDownloadUrl(null);
        setFilename(null);
        setDownloadStatus('');
        setError(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-8"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex-1"></div>
                        <div className="flex-1 text-center">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                Scribd Downloader
                            </h1>
                            <p className="text-gray-600">
                                Descarga documentos de Scribd, Slideshare y Everand
                            </p>
                        </div>
                        <div className="flex-1 flex justify-end">
                            <motion.button
                                onClick={() => setShowHistory(true)}
                                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="Ver historial"
                            >
                                <History className="w-6 h-6" />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Main Form */}
                <motion.form 
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="bg-white rounded-xl shadow-lg p-6 mb-6"
                >
                    {/* URL Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            URL del documento
                        </label>
                        <div className="relative">
                            <Link className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://www.scribd.com/document/..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white"
                                required
                            />
                        </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                                Modo de descarga
                            </label>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                PDF por imágenes
                            </span>
                        </div>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center">
                                <Image className="w-5 h-5 text-blue-600 mr-2" />
                                <span className="text-sm text-blue-800 font-medium">Descarga por imágenes</span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                                Genera un PDF de alta calidad capturando cada página como imagen
                            </p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        disabled={isLoading || !url.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center"
                        whileHover={!isLoading ? { scale: 1.02 } : {}}
                        whileTap={!isLoading ? { scale: 0.98 } : {}}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                Descargando...
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5 mr-2" />
                                Descargar
                            </>
                        )}
                    </motion.button>
                </motion.form>

                {/* Progress Section */}
                <AnimatePresence>
                    {(isLoading || progress > 0) && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-xl shadow-lg p-6 mb-6"
                        >
                            <ProgressBar 
                                progress={progress} 
                                message={downloadStatus}
                                isComplete={success}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Success Message with Download Button */}
                <AnimatePresence>
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                                    <div>
                                        <span className="text-green-800 font-medium block">
                                            ¡PDF generado exitosamente!
                                        </span>
                                        <span className="text-green-600 text-sm">
                                            {filename ? `Archivo: ${filename}` : 'Documento listo para descargar'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-green-700 text-sm">
                                        El archivo se descargará a tu carpeta de Descargas o podrás elegir dónde guardarlo
                                    </p>
                                    <div className="flex gap-2">
                                        {downloadUrl ? (
                                            <motion.button
                                                onClick={handleDownload}
                                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all flex items-center shadow-md hover:shadow-lg"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <Download className="w-5 h-5 mr-2" />
                                                Descargar PDF
                                            </motion.button>
                                        ) : (
                                            <div className="px-6 py-3 bg-gray-400 text-white rounded-lg font-medium flex items-center">
                                                <Download className="w-5 h-5 mr-2" />
                                                Preparando descarga...
                                            </div>
                                        )}
                                        <motion.button
                                            onClick={resetForm}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Nuevo
                                        </motion.button>
                                    </div>
                                </div>
                                {/* Debug info */}
                                <div className="text-xs text-gray-500 mt-2">
                                    Debug: success={success.toString()}, downloadUrl={downloadUrl || 'null'}, filename={filename || 'null'}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                                    <span className="text-red-800 font-medium">
                                        {error}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setError(null)}
                                    className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* History Panel */}
            <HistoryPanel
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
            />
        </div>
    );
};

export default MainPage;

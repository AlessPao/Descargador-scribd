import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Clock, Trash2, RefreshCw } from 'lucide-react';

const HistoryPanel = ({ isOpen, onClose }) => {
    const [downloads, setDownloads] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchDownloads();
        }
    }, [isOpen]);

    const fetchDownloads = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/downloads');
            const data = await response.json();
            setDownloads(data);
        } catch (error) {
            console.error('Error fetching downloads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (filename) => {
        const link = document.createElement('a');
        link.href = `/api/files/${filename}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Actualizar la lista después de un breve retraso para que el archivo se elimine del servidor
        setTimeout(() => {
            fetchDownloads();
        }, 2000);
    };

    const cleanupOldFiles = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/downloads/cleanup', {
                method: 'DELETE'
            });
            const data = await response.json();
            console.log(`Archivos antiguos eliminados: ${data.deleted}`);
            await fetchDownloads();
        } catch (error) {
            console.error('Error cleaning up files:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Historial de descargas</h2>
                        <div className="flex items-center gap-2">
                            <motion.button
                                onClick={cleanupOldFiles}
                                disabled={loading}
                                className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="Limpiar archivos antiguos"
                            >
                                <Trash2 className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                                onClick={fetchDownloads}
                                disabled={loading}
                                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </motion.button>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : downloads.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No hay descargas disponibles</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {downloads.map((download, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center flex-1">
                                            <FileText className="w-5 h-5 text-blue-600 mr-3" />
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900 truncate">
                                                    {download.name}
                                                </h3>
                                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                                    <Clock className="w-4 h-4 mr-1" />
                                                    <span>{formatDate(download.created)}</span>
                                                    <span className="mx-2">•</span>
                                                    <span>{formatFileSize(download.size)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <motion.button
                                            onClick={() => handleDownload(download.name)}
                                            className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Download className="w-4 h-4 mr-1" />
                                            Descargar
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default HistoryPanel;

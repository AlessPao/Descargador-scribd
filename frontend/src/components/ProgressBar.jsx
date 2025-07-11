import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Download } from 'lucide-react';

const ProgressBar = ({ progress = 0, message = '', isComplete = false }) => {
    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700 flex items-center">
                    {isComplete ? (
                        <>
                            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                            Descarga completada
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4 text-blue-600 mr-2" />
                            Descargando documento
                        </>
                    )}
                </span>
                <span className="text-sm font-bold text-gray-900">
                    {Math.round(progress)}%
                </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                <motion.div
                    className={`h-3 rounded-full ${
                        isComplete ? 'bg-green-500' : 'bg-blue-600'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ 
                        type: "spring", 
                        stiffness: 100, 
                        damping: 15,
                        duration: 0.5
                    }}
                />
            </div>
            
            {message && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-gray-500 flex items-center"
                >
                    {!isComplete && (
                        <div className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></div>
                    )}
                    {message}
                </motion.div>
            )}
            
            {progress > 0 && progress < 100 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2"
                >
                    <div className="w-full bg-blue-100 rounded-full h-1">
                        <motion.div
                            className="bg-blue-400 h-1 rounded-full"
                            animate={{ 
                                width: ['0%', '100%', '0%'] 
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default ProgressBar;

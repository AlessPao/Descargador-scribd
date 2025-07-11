// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiConfig = {
    baseURL: API_BASE_URL,
    endpoints: {
        download: `${API_BASE_URL}/api/download`,
        downloadStatus: (id) => `${API_BASE_URL}/api/download/${id}/status`,
        files: (filename) => `${API_BASE_URL}/api/files/${filename}`,
        downloads: `${API_BASE_URL}/api/downloads`,
        config: `${API_BASE_URL}/api/config`
    }
};

// Función helper para hacer requests
export const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
};

export default apiConfig;

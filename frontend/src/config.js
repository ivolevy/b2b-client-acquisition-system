// Configuración centralizada de la API
// En desarrollo: usa localhost
// En producción: usa la variable de entorno o el backend desplegado

const normalizeUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url.replace(/^\/+/, '')}`;
};

const getApiUrl = () => {
  // En producción, Vercel inyecta variables de entorno
  if (import.meta.env.VITE_API_URL) {
    return normalizeUrl(import.meta.env.VITE_API_URL);
  }
  
  // En desarrollo, usa localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }
  
  // Fallback: intenta detectar si estamos en producción
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Si no hay variable de entorno, asume que el backend está en el mismo dominio
    return window.location.origin.replace(/^https?:\/\/([^.]+)/, 'https://$1-api');
  }
  
  return 'http://localhost:8000';
};

export const API_URL = getApiUrl();


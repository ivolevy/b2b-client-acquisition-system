import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthWrapper from './AuthWrapper'
import './index.css'

import axios from 'axios';
import { authStorage } from './utils/storage';

// Configurar un interceptor global para axios
axios.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptar fetch globalmente para inyectar token en llamadas directas (ej. buscar-stream, history)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const urlString = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');
  
  // Solo inyectar si la petición es hacia nuestra API (Vercel o localhost)
  if (urlString.includes('api/') && (urlString.includes('localhost') || urlString.includes('vercel.app'))) {
    const token = authStorage.getToken();
    if (token) {
      config = config || {};
      config.headers = { ...config.headers };
      if (!config.headers.Authorization && !config.headers['Authorization']) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Si resource es un Request object (raro pero posible), necesitamos clonarlo o crear uno nuevo
      if (resource instanceof Request) {
        resource = new Request(resource, config);
      }
    }
  }
  
  return originalFetch(resource, config);
};

// Manejar errores de extensiones del navegador y mensajería asíncrona
window.addEventListener('error', (event) => {
  // Silenciar errores de extensiones del navegador relacionados con mensajería
  if (event.message?.includes('message channel closed') || 
      event.message?.includes('asynchronous response')) {
    event.preventDefault();
    return false;
  }
});

// Manejar promesas rechazadas no capturadas
window.addEventListener('unhandledrejection', (event) => {
  // Silenciar errores de extensiones del navegador relacionados con mensajería
  if (event.reason?.message?.includes('message channel closed') ||
      event.reason?.message?.includes('asynchronous response')) {
    event.preventDefault();
    return false;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthWrapper />
  </React.StrictMode>,
)


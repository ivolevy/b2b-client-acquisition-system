import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthWrapper from './AuthWrapper'
import './index.css'

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


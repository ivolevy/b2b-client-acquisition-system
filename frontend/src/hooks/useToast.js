import { useState, useCallback } from 'react';

// Duración por defecto: 5 segundos
const DEFAULT_DURATION = 5000;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = DEFAULT_DURATION) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration = DEFAULT_DURATION) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message, duration = DEFAULT_DURATION) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message, duration = DEFAULT_DURATION) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message, duration = DEFAULT_DURATION) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
};


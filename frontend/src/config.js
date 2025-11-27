// Configuración centralizada del endpoint API
const FALLBACK_API = 'http://localhost:8000';

const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return FALLBACK_API;
  }

  let normalized = value.trim();

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  // Quitar slash final para evitar dobles //
  normalized = normalized.replace(/\/+$/, '');

  return normalized;
};

export const API_URL = normalizeUrl(import.meta.env.VITE_API_URL || FALLBACK_API);

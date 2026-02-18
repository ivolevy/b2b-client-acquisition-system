// Configuración centralizada del endpoint API
const FALLBACK_API = 'https://b2b-client-acquisition-system-hlll.vercel.app';

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

// For local development, use 127.0.0.1 to avoid localhost DNS/IPv6 issues
export const API_URL = normalizeUrl(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000');
// export const API_URL = normalizeUrl(FALLBACK_API);

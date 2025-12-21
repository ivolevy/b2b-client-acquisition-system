// ============================================
// STORAGE SERVICE - Centralizado y optimizado
// ============================================
// Centraliza todo el acceso a localStorage/sessionStorage
// con cache en memoria para reducir accesos

const MEMORY_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

class StorageService {
  constructor() {
    // Limpiar cache periódicamente
    if (typeof window !== 'undefined') {
      setInterval(() => this.clearExpiredCache(), 60000); // Cada minuto
    }
  }

  // Obtener valor con cache
  getItem(key, useSession = false) {
    const cacheKey = `${key}_${useSession}`;
    const cached = MEMORY_CACHE.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.value;
    }

    try {
      const storage = useSession ? sessionStorage : localStorage;
      const value = storage.getItem(key);
      const parsed = value ? JSON.parse(value) : null;
      
      if (parsed !== null) {
        MEMORY_CACHE.set(cacheKey, {
          value: parsed,
          timestamp: Date.now()
        });
      }
      
      return parsed;
    } catch (error) {
      console.error(`[Storage] Error reading ${key}:`, error);
      return null;
    }
  }

  // Guardar valor y actualizar cache
  setItem(key, value, useSession = false) {
    const cacheKey = `${key}_${useSession}`;
    
    try {
      const storage = useSession ? sessionStorage : localStorage;
      const serialized = JSON.stringify(value);
      storage.setItem(key, serialized);
      
      MEMORY_CACHE.set(cacheKey, {
        value,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error(`[Storage] Error writing ${key}:`, error);
      // Si está lleno, intentar limpiar cache viejo
      if (error.name === 'QuotaExceededError') {
        this.clearExpiredCache();
        try {
          const storage = useSession ? sessionStorage : localStorage;
          storage.setItem(key, JSON.stringify(value));
          MEMORY_CACHE.set(cacheKey, { value, timestamp: Date.now() });
          return true;
        } catch (retryError) {
          console.error(`[Storage] Retry failed for ${key}:`, retryError);
          return false;
        }
      }
      return false;
    }
  }

  // Eliminar valor y cache
  removeItem(key, useSession = false) {
    const cacheKey = `${key}_${useSession}`;
    
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.removeItem(key);
      MEMORY_CACHE.delete(cacheKey);
      return true;
    } catch (error) {
      console.error(`[Storage] Error removing ${key}:`, error);
      return false;
    }
  }

  // Limpiar todo
  clear(useSession = false) {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.clear();
      
      // Limpiar cache relacionado
      for (const [key] of MEMORY_CACHE) {
        if (key.endsWith(`_${useSession}`)) {
          MEMORY_CACHE.delete(key);
        }
      }
      
      return true;
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
      return false;
    }
  }

  // Limpiar cache expirado
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, cached] of MEMORY_CACHE) {
      if (now - cached.timestamp >= CACHE_TTL) {
        MEMORY_CACHE.delete(key);
      }
    }
  }

  // Limpiar cache manualmente
  clearCache() {
    MEMORY_CACHE.clear();
  }
}

export const storage = new StorageService();

// Helpers específicos para el dominio
export const authStorage = {
  getAuth: () => storage.getItem('b2b_auth'),
  setAuth: (data) => storage.setItem('b2b_auth', data),
  removeAuth: () => storage.removeItem('b2b_auth'),
  
  getToken: () => storage.getItem('b2b_token'),
  setToken: (token) => storage.setItem('b2b_token', token),
  removeToken: () => storage.removeItem('b2b_token'),
  
  getPendingEmail: () => storage.getItem('pending_email_confirmation'),
  setPendingEmail: (email) => storage.setItem('pending_email_confirmation', email),
  removePendingEmail: () => storage.removeItem('pending_email_confirmation'),
  
  getDismissedPendingEmail: () => storage.getItem('dismissed_pending_email') === 'true',
  setDismissedPendingEmail: (value) => storage.setItem('dismissed_pending_email', value ? 'true' : 'false'),
  removeDismissedPendingEmail: () => storage.removeItem('dismissed_pending_email'),
  
  getDismissedPendingEmailTime: () => {
    const time = storage.getItem('dismissed_pending_email_time');
    return time ? parseInt(time) : null;
  },
  setDismissedPendingEmailTime: (timestamp) => storage.setItem('dismissed_pending_email_time', timestamp.toString()),
  removeDismissedPendingEmailTime: () => storage.removeItem('dismissed_pending_email_time'),
  
  clearAll: () => {
    storage.removeItem('b2b_auth');
    storage.removeItem('b2b_token');
    storage.removeItem('pending_email_confirmation');
    storage.removeItem('dismissed_pending_email');
    storage.removeItem('dismissed_pending_email_time');
  }
};


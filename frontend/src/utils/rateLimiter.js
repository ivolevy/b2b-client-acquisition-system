// ============================================
// RATE LIMITER - Prevenir spam y ataques
// ============================================

class RateLimiter {
  constructor() {
    this.attempts = new Map();
    this.locks = new Map();
  }

  // Verificar si una acción está permitida
  isAllowed(key, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    // Si la ventana expiró, resetear
    if (now > record.resetAt) {
      this.attempts.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    // Si excedió el límite, bloquear
    if (record.count >= maxAttempts) {
      const timeLeft = Math.ceil((record.resetAt - now) / 1000);
      return { 
        allowed: false, 
        remaining: 0,
        retryAfter: timeLeft,
        message: `Demasiados intentos. Espera ${timeLeft} segundos.`
      };
    }

    // Incrementar contador
    record.count++;
    return { 
      allowed: true, 
      remaining: maxAttempts - record.count 
    };
  }

  // Registrar un intento
  recordAttempt(key) {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { count: 1, resetAt: now + 60000 });
    } else {
      record.count++;
    }
  }

  // Limpiar intentos antiguos
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.attempts) {
      if (now > record.resetAt) {
        this.attempts.delete(key);
      }
    }
  }

  // Limpiar un key específico
  clear(key) {
    this.attempts.delete(key);
    this.locks.delete(key);
  }

  // Limpiar todo
  clearAll() {
    this.attempts.clear();
    this.locks.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Limpiar intentos antiguos cada minuto
if (typeof window !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 60000);
}

// Helper para debounce
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Helper para throttle
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}


// ============================================
// ERROR HANDLER - Manejo seguro de errores
// ============================================
// Evita exponer información sensible al usuario

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /credential/i,
  /auth/i,
  /sql/i,
  /database/i,
  /connection/i,
  /stack trace/i,
  /at \w+\.\w+/i, // Stack traces
];

const USER_FRIENDLY_MESSAGES = {
  'Invalid login': 'Credenciales incorrectas. Verifica tu email y contraseña.',
  'Email not confirmed': 'Debes confirmar tu email antes de iniciar sesión.',
  'already registered': 'Este email ya está registrado. Intenta iniciar sesión.',
  'Este email ya está registrado': 'Este email ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.',
  'already exists': 'Este email ya está registrado.',
  'Invalid email': 'El formato del email no es válido.',
  'Password should be at least': 'La contraseña es demasiado corta.',
  'User already registered': 'Este email ya está registrado.',
  'Email rate limit': 'Demasiados intentos. Espera unos minutos.',
  'Network error': 'Error de conexión. Verifica tu internet.',
  'Failed to fetch': 'Error de conexión. Intenta de nuevo.',
  'timeout': 'La solicitud tardó demasiado. Intenta de nuevo.',
  'QuotaExceededError': 'No hay espacio suficiente. Limpia tu navegador.',
};

// Sanitizar mensaje de error para el usuario
export function sanitizeError(error) {
  if (!error) {
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }

  // Si es un objeto Error, obtener el mensaje
  const errorMessage = error.message || error.toString() || '';

  // Verificar si contiene información sensible
  const containsSensitive = SENSITIVE_PATTERNS.some(pattern =>
    pattern.test(errorMessage)
  );

  if (containsSensitive) {
    // Buscar mensaje amigable
    for (const [key, message] of Object.entries(USER_FRIENDLY_MESSAGES)) {
      if (errorMessage.includes(key)) {
        return message;
      }
    }
    // Mensaje genérico si contiene información sensible
    return 'Ocurrió un error. Por favor, intenta de nuevo o contacta al soporte.';
  }

  // Buscar mensaje amigable
  for (const [key, message] of Object.entries(USER_FRIENDLY_MESSAGES)) {
    if (errorMessage.includes(key)) {
      return message;
    }
  }

  // Si no hay match, devolver mensaje genérico
  return 'Ocurrió un error. Intenta de nuevo.';
}

// Log error de forma segura (solo en desarrollo)
export function logError(error, context = '') {
  if (import.meta.env.DEV) {
    console.error(`[Error${context ? `: ${context}` : ''}]`, error);
  } else {
    // En producción, solo loggear información segura
    console.error(`[Error${context ? `: ${context}` : ''}]`, {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN',
      // No incluir stack traces ni información sensible
    });
  }
}

// Manejar error de forma completa
export function handleError(error, context = '') {
  const sanitized = sanitizeError(error);
  logError(error, context);
  return sanitized;
}


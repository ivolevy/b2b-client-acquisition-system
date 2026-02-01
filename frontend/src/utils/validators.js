/**
 * Unified validation rules for the application
 */

export const validateEmail = (email) => {
    if (!email || email.trim() === '') {
        return { isValid: false, message: 'El email es requerido' };
    }
    // User requested: "email si o si con arroba"
    if (!email.includes('@')) {
        return { isValid: false, message: 'El email debe contener un "@"' };
    }
    // Standard length check
    if (email.length > 255) {
        return { isValid: false, message: 'El email es demasiado largo (máximo 255 caracteres)' };
    }
    return { isValid: true, message: '' };
};

export const validateName = (name) => {
    if (!name || name.trim() === '') {
        return { isValid: false, message: 'El nombre es requerido' };
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
        return { isValid: false, message: 'El nombre debe tener al menos 2 caracteres' };
    }
    // User requested: "nombre de maximo 30 caracteres"
    if (trimmedName.length > 30) {
        return { isValid: false, message: 'El nombre es demasiado largo (máximo 30 caracteres)' };
    }
    // Basic character set check (letters, spaces, common accents)
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
    if (!nameRegex.test(trimmedName)) {
        return { isValid: false, message: 'El nombre solo puede contener letras y espacios' };
    }
    return { isValid: true, message: '' };
};

export const validatePhone = (phone, countryCode = '+54') => {
    // If empty, it's invalid because we want it mandatory in checkout and elsewhere
    if (!phone || phone.trim() === '') {
        return { isValid: false, message: 'El teléfono es requerido' };
    }

    // Extract only digits
    const cleanPhone = phone.replace(/[^\d]/g, '');

    if (cleanPhone.length === 0) {
        return { isValid: false, message: 'El teléfono debe contener números' };
    }

    // User requested: "numero de minimo 10 y maximo 11 numeros en arg, para el resto minimo 8 y maximo 14"
    if (countryCode === '+54') {
        if (cleanPhone.length < 10) {
            return { isValid: false, message: 'El teléfono en Argentina debe tener al menos 10 dígitos (ej: 11 1234-5678)' };
        }
        if (cleanPhone.length > 11) {
            return { isValid: false, message: 'El teléfono en Argentina no puede tener más de 11 dígitos' };
        }
    } else {
        if (cleanPhone.length < 8) {
            return { isValid: false, message: 'El teléfono debe tener al menos 8 dígitos' };
        }
        if (cleanPhone.length > 14) {
            return { isValid: false, message: 'El teléfono no puede tener más de 14 dígitos' };
        }
    }

    return { isValid: true, message: '' };
};

export const validatePassword = (password, requireComplexity = false) => {
    if (!password || password.trim() === '') {
        return { isValid: false, message: 'La contraseña es requerida' };
    }
    const minLength = 8;
    if (password.length < minLength) {
        return { isValid: false, message: `La contraseña debe tener al menos ${minLength} caracteres` };
    }
    if (password.length > 128) {
        return { isValid: false, message: 'La contraseña es demasiado larga (máximo 128 caracteres)' };
    }
    if (requireComplexity) {
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        if (!hasLetter || !hasNumber) {
            return { isValid: false, message: 'La contraseña debe contener al menos una letra y un número' };
        }
    }
    return { isValid: true, message: '' };
};

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './Login.css';
import { authService, supabase } from '../lib/supabase';
import { authStorage } from '../utils/storage';
import { rateLimiter, debounce } from '../utils/rateLimiter';
import { handleError } from '../utils/errorHandler';

// Credenciales de prueba (modo demo cuando Supabase no está configurado)
const DEMO_USERS = [
  {
    email: 'admin@admin.com',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin',
    plan: 'pro'
  },
  {
    email: 'user@dotasolutions.com',
    password: 'User2024!',
    name: 'Usuario',
    role: 'user',
    plan: 'free'
  }
];

// Verificar si Supabase está configurado
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && key && url !== '' && key !== '';
};

// Lista de países con prefijos telefónicos
const COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', prefix: '+54' },
  { code: 'MX', name: 'México', flag: '🇲🇽', prefix: '+52' },
  { code: 'ES', name: 'España', flag: '🇪🇸', prefix: '+34' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', prefix: '+57' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', prefix: '+56' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', prefix: '+51' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', prefix: '+58' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', prefix: '+593' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', prefix: '+502' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', prefix: '+53' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', prefix: '+591' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', prefix: '+1' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', prefix: '+504' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', prefix: '+595' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', prefix: '+503' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', prefix: '+505' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', prefix: '+506' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', prefix: '+507' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', prefix: '+598' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', prefix: '+1' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', prefix: '+55' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷', prefix: '+33' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪', prefix: '+49' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', prefix: '+39' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', prefix: '+44' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦', prefix: '+1' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', prefix: '+61' },
  { code: 'NZ', name: 'Nueva Zelanda', flag: '🇳🇿', prefix: '+64' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵', prefix: '+81' },
  { code: 'CN', name: 'China', flag: '🇨🇳', prefix: '+86' },
  { code: 'IN', name: 'India', flag: '🇮🇳', prefix: '+91' },
  { code: 'RU', name: 'Rusia', flag: '🇷🇺', prefix: '+7' },
  { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷', prefix: '+82' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', prefix: '+351' },
  { code: 'NL', name: 'Países Bajos', flag: '🇳🇱', prefix: '+31' },
  { code: 'BE', name: 'Bélgica', flag: '🇧🇪', prefix: '+32' },
  { code: 'CH', name: 'Suiza', flag: '🇨🇭', prefix: '+41' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', prefix: '+43' },
  { code: 'SE', name: 'Suecia', flag: '🇸🇪', prefix: '+46' },
  { code: 'NO', name: 'Noruega', flag: '🇳🇴', prefix: '+47' },
  { code: 'DK', name: 'Dinamarca', flag: '🇩🇰', prefix: '+45' },
  { code: 'FI', name: 'Finlandia', flag: '🇫🇮', prefix: '+358' },
  { code: 'PL', name: 'Polonia', flag: '🇵🇱', prefix: '+48' },
  { code: 'GR', name: 'Grecia', flag: '🇬🇷', prefix: '+30' },
  { code: 'TR', name: 'Turquía', flag: '🇹🇷', prefix: '+90' },
  { code: 'SA', name: 'Arabia Saudí', flag: '🇸🇦', prefix: '+966' },
  { code: 'AE', name: 'Emiratos Árabes', flag: '🇦🇪', prefix: '+971' },
  { code: 'ZA', name: 'Sudáfrica', flag: '🇿🇦', prefix: '+27' },
  { code: 'EG', name: 'Egipto', flag: '🇪🇬', prefix: '+20' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', prefix: '+972' },
  { code: 'SG', name: 'Singapur', flag: '🇸🇬', prefix: '+65' },
  { code: 'MY', name: 'Malasia', flag: '🇲🇾', prefix: '+60' },
  { code: 'TH', name: 'Tailandia', flag: '🇹🇭', prefix: '+66' },
  { code: 'PH', name: 'Filipinas', flag: '🇵🇭', prefix: '+63' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', prefix: '+62' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', prefix: '+84' },
];

// Funciones de validación
const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { isValid: false, message: 'El email es requerido' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, message: 'El formato del email no es válido' };
  }
  if (email.length > 255) {
    return { isValid: false, message: 'El email es demasiado largo (máximo 255 caracteres)' };
  }
  return { isValid: true, message: '' };
};

const validateName = (name) => {
  if (!name || name.trim() === '') {
    return { isValid: false, message: 'El nombre es requerido' };
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return { isValid: false, message: 'El nombre debe tener al menos 2 caracteres' };
  }
  if (trimmedName.length > 20) {
    return { isValid: false, message: 'El nombre es demasiado largo (máximo 20 caracteres)' };
  }
  // Permitir letras, espacios, acentos y caracteres especiales comunes
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { isValid: false, message: 'El nombre solo puede contener letras, espacios y guiones' };
  }
  return { isValid: true, message: '' };
};

const validatePhone = (phone) => {
  if (!phone || phone.trim() === '') {
    return { isValid: false, message: 'El teléfono es requerido' };
  }
  // Extraer solo los números del teléfono completo (incluyendo prefijo)
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Validar que solo contenga números después de limpiar
  if (cleanPhone.length === 0) {
    return { isValid: false, message: 'El teléfono debe contener al menos un número' };
  }
  
  // Validar longitud mínima (prefijo + número local, mínimo 10 dígitos totales)
  if (cleanPhone.length < 10) {
    return { isValid: false, message: 'El teléfono debe tener al menos 10 dígitos' };
  }
  if (cleanPhone.length > 15) {
    return { isValid: false, message: 'El teléfono es demasiado largo (máximo 15 dígitos)' };
  }
  return { isValid: true, message: '' };
};

const validatePassword = (password, mode) => {
  if (!password || password.trim() === '') {
    return { isValid: false, message: 'La contraseña es requerida' };
  }
  // Validar longitud mínima según el modo (register requiere más caracteres)
  const minLength = mode === 'register' ? 8 : 6;
  if (password.length < minLength) {
    return { isValid: false, message: `La contraseña debe tener al menos ${minLength} caracteres` };
  }
  if (password.length > 128) {
    return { isValid: false, message: 'La contraseña es demasiado larga (máximo 128 caracteres)' };
  }
  // Validar que tenga al menos una letra y un número (solo en modo registro)
  if (mode === 'register') {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasLetter || !hasNumber) {
      return { isValid: false, message: 'La contraseña debe contener al menos una letra y un número' };
    }
  }
  return { isValid: true, message: '' };
};

function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' o 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Argentina por defecto
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(() => {
    // Cargar email pendiente usando servicio centralizado
    return authStorage.getPendingEmail() || '';
  });
  const [resendingEmail, setResendingEmail] = useState(false);
  const [dismissedPendingEmail, setDismissedPendingEmail] = useState(() => {
    // Verificar si el usuario cerró el mensaje de email pendiente
    return authStorage.getDismissedPendingEmail();
  });
  
  // Estados de validación por campo
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [touched, setTouched] = useState({
    email: false,
    phone: false,
    password: false,
    name: false
  });
  
  const useSupabase = isSupabaseConfigured();
  
  // Verificar sesión al cargar y limpiar pendingEmail si el usuario ya está autenticado
  useEffect(() => {
    const checkSession = async () => {
      if (useSupabase && pendingEmail) {
        try {
          const { session } = await authService.getSession();
          
          // Si hay sesión activa, limpiar el email pendiente
          if (session?.user) {
            setPendingEmail('');
            setDismissedPendingEmail(false);
            authStorage.removePendingEmail();
            authStorage.removeDismissedPendingEmail();
            authStorage.removeDismissedPendingEmailTime();
            return;
          }
          
          // Si el usuario cerró el mensaje hace más de 7 días, limpiar el pendingEmail
          const dismissedTime = authStorage.getDismissedPendingEmailTime();
          if (dismissedTime) {
            const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed > 7) {
              setPendingEmail('');
              authStorage.removePendingEmail();
              authStorage.removeDismissedPendingEmail();
              authStorage.removeDismissedPendingEmailTime();
            }
          }
        } catch (error) {
          // Si hay error, simplemente no hacer nada (ya está manejado por errorHandler)
          handleError(error, 'Login - checkSession');
        }
      } else if (!useSupabase && pendingEmail) {
        // Si no se usa Supabase, limpiar el email pendiente
        setPendingEmail('');
        authStorage.removePendingEmail();
        authStorage.removeDismissedPendingEmail();
        authStorage.removeDismissedPendingEmailTime();
      }
    };
    
    checkSession();
  }, [useSupabase, pendingEmail]); // Incluir dependencias correctas
  
  // Validar formulario completo (función simple, sin memoizar para evitar problemas)
  const isFormValid = () => {
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password, mode);
    const phoneValidation = mode === 'register' ? validatePhone(phone) : { isValid: true };
    const nameValidation = mode === 'register' ? validateName(name) : { isValid: true };
    
    return emailValidation.isValid && passwordValidation.isValid && phoneValidation.isValid && nameValidation.isValid;
  };
  
  // Referencias para funciones debounced (estables entre renders)
  const debouncedEmailValidationRef = useRef(null);
  const debouncedPhoneValidationRef = useRef(null);
  const debouncedPasswordValidationRef = useRef(null);
  const debouncedNameValidationRef = useRef(null);
  const modeRef = useRef(mode);

  // Actualizar ref cuando cambie mode
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Crear funciones debounced una sola vez al montar
  useEffect(() => {
    debouncedEmailValidationRef.current = debounce((value) => {
      const validation = validateEmail(value);
      setEmailError(validation.message);
    }, 300);

    debouncedPhoneValidationRef.current = debounce((value) => {
      const validation = validatePhone(value);
      setPhoneError(validation.message);
    }, 300);

    debouncedPasswordValidationRef.current = debounce((value) => {
      const validation = validatePassword(value, modeRef.current);
      setPasswordError(validation.message);
    }, 300);

    debouncedNameValidationRef.current = debounce((value) => {
      const validation = validateName(value);
      setNameError(validation.message);
    }, 300);
  }, []); // Solo crear una vez al montar
  
  // Handlers de cambio con validación optimizada
  const handleEmailChange = useCallback((e) => {
    const value = e.target.value;
    
    // Si el usuario cambia el email y es diferente al pendingEmail, resetear el dismissed
    if (pendingEmail && value.trim().toLowerCase() !== pendingEmail.toLowerCase()) {
      setDismissedPendingEmail(false);
      authStorage.removeDismissedPendingEmail();
      authStorage.removeDismissedPendingEmailTime();
    }
    setEmail(value);
    
    // Validar solo si el campo fue tocado
    if (touched.email && debouncedEmailValidationRef.current) {
      debouncedEmailValidationRef.current(value);
    }
  }, [pendingEmail, touched.email]);
  
  const handleNameChange = useCallback((e) => {
    const value = e.target.value;
    setName(value);
    
    if (touched.name && debouncedNameValidationRef.current) {
      debouncedNameValidationRef.current(value);
    }
  }, [touched.name]);
  
  const handlePhoneChange = useCallback((e) => {
    // Solo permitir números
    const value = e.target.value.replace(/[^\d]/g, '');
    setPhone(value);
    
    if ((touched.phone || mode === 'register') && debouncedPhoneValidationRef.current) {
      // Validar con el prefijo incluido
      const fullPhone = `${selectedCountry.prefix}${value}`;
      debouncedPhoneValidationRef.current(fullPhone);
    }
  }, [touched.phone, mode, selectedCountry]);
  
  const handleCountrySelect = useCallback((country) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
    setCountrySearch('');
    // Revalidar el teléfono con el nuevo prefijo
    if (phone && (touched.phone || mode === 'register') && debouncedPhoneValidationRef.current) {
      const fullPhone = `${country.prefix}${phone}`;
      debouncedPhoneValidationRef.current(fullPhone);
    }
  }, [phone, touched.phone, mode]);
  
  // Filtrar países según búsqueda
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const search = countrySearch.toLowerCase();
    return COUNTRIES.filter(country => 
      country.name.toLowerCase().includes(search) ||
      country.prefix.includes(search) ||
      country.code.toLowerCase().includes(search)
    );
  }, [countrySearch]);
  
  const handlePasswordChange = useCallback((e) => {
    const value = e.target.value;
    setPassword(value);
    
    if (touched.password && debouncedPasswordValidationRef.current) {
      debouncedPasswordValidationRef.current(value);
    }
  }, [touched.password]);
  
  // Handlers de blur (cuando el usuario sale del campo)
  const handleEmailBlur = () => {
    setTouched({ ...touched, email: true });
    const validation = validateEmail(email);
    setEmailError(validation.message);
  };
  
  const handleNameBlur = () => {
    setTouched({ ...touched, name: true });
    const validation = validateName(name);
    setNameError(validation.message);
  };
  
  const handlePhoneBlur = () => {
    setTouched({ ...touched, phone: true });
    const fullPhone = `${selectedCountry.prefix}${phone}`;
    const validation = validatePhone(fullPhone);
    setPhoneError(validation.message);
  };
  
  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCountryDropdown && !event.target.closest('.phone-country-selector')) {
        setShowCountryDropdown(false);
      }
    };
    
    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCountryDropdown]);
  
  const handlePasswordBlur = () => {
    setTouched({ ...touched, password: true });
    const validation = validatePassword(password, mode);
    setPasswordError(validation.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Marcar todos los campos como touched para mostrar errores
    setTouched({ email: true, phone: true, password: true, name: true });
    
    // Validar todos los campos
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password, mode);
    const fullPhone = mode === 'register' ? `${selectedCountry.prefix}${phone}` : '';
    const phoneValidation = mode === 'register' ? validatePhone(fullPhone) : { isValid: true };
    const nameValidation = mode === 'register' ? validateName(name) : { isValid: true };
    
    setEmailError(emailValidation.message);
    setPasswordError(passwordValidation.message);
    setPhoneError(phoneValidation.message);
    setNameError(nameValidation.message);
    
    // Si hay errores de validación, no continuar
    if (!emailValidation.isValid || !passwordValidation.isValid || !phoneValidation.isValid || !nameValidation.isValid) {
      setError('Por favor, revisa y corrige los errores marcados en el formulario');
      return;
    }
    
    setLoading(true);

    const emailLimpio = email.trim().toLowerCase();
    const passwordLimpio = password.trim();

    try {
      // Verificar primero si son credenciales demo (siempre permitidas)
      const demoUser = DEMO_USERS.find(
        u => u.email.toLowerCase() === emailLimpio && u.password === passwordLimpio
      );

      if (demoUser && mode === 'login') {
        // Modo demo - siempre permitido, incluso con Supabase configurado
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const userData = {
          email: demoUser.email,
          name: demoUser.name || demoUser.email.split('@')[0],
          phone: demoUser.phone || '',
          role: demoUser.role,
          plan: demoUser.plan,
          loginTime: new Date().toISOString()
        };
        authStorage.setAuth(userData);
        authStorage.setToken('demo_token_' + Date.now());
        onLogin(userData);
        setLoading(false);
        return;
      }

      if (useSupabase) {
        // Modo Supabase
        if (mode === 'login') {
          // Rate limiting para login
          const rateLimitKey = `login_${emailLimpio}`;
          const rateCheck = rateLimiter.isAllowed(rateLimitKey, 5, 60000); // 5 intentos por minuto
          
          if (!rateCheck.allowed) {
            setError(rateCheck.message);
            setLoading(false);
            return;
          }

          rateLimiter.recordAttempt(rateLimitKey);
          const { data, error } = await authService.signIn(emailLimpio, passwordLimpio);
          
          if (error) {
            setError(handleError(error, 'Login - signIn'));
            setLoading(false);
            } else {
            // Limpiar rate limit en éxito
            rateLimiter.clear(rateLimitKey);
            
            // Si el usuario inicia sesión exitosamente, limpiar email pendiente
            if (pendingEmail && data.user.email === pendingEmail) {
              setPendingEmail('');
              setDismissedPendingEmail(false);
              authStorage.removePendingEmail();
              authStorage.removeDismissedPendingEmail();
            }
            
            const userData = authService.buildUserData(data.user, data.profile);
            authStorage.setAuth(userData);
            onLogin(userData);
          }
        } else {
          // Registro - Las validaciones ya se hicieron al inicio del handleSubmit
          // Rate limiting para registro
          const rateLimitKey = `signup_${emailLimpio}`;
          const rateCheck = rateLimiter.isAllowed(rateLimitKey, 3, 300000); // 3 intentos por 5 minutos
          
          if (!rateCheck.allowed) {
            setError(rateCheck.message);
            setLoading(false);
            return;
          }

          rateLimiter.recordAttempt(rateLimitKey);
          const { data, error, needsConfirmation } = await authService.signUp(emailLimpio, passwordLimpio, name.trim(), fullPhone);
          
          if (error) {
            setError(handleError(error, 'Login - signUp'));
            setLoading(false);
            } else {
            // Limpiar rate limit en éxito
            rateLimiter.clear(rateLimitKey);
            
            // Verificar si el email fue enviado
            if (needsConfirmation || (data?.user && !data.user.email_confirmed_at)) {
              setSuccess(`¡Cuenta creada exitosamente! Revisa tu bandeja de entrada (y spam) para confirmar tu email. El link de confirmación expira en 24 horas.`);
              setPendingEmail(emailLimpio);
              authStorage.setPendingEmail(emailLimpio);
            } else {
              setSuccess('¡Cuenta creada exitosamente!');
              setPendingEmail('');
              authStorage.removePendingEmail();
            }
            setMode('login');
            setPassword('');
            setPhone('');
            setName('');
          }
        }
      } else {
        // Modo demo (sin Supabase) - solo si no son credenciales demo
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (mode === 'login') {
          setError('Credenciales incorrectas. Usa las credenciales de demo.');
        } else {
          setError('El registro solo está disponible con Supabase configurado.');
        }
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
      console.error('Auth error:', err);
    }
    
    setLoading(false);
  };

  const toggleMode = () => {
    const newMode = mode === 'login' ? 'register' : 'login';
    setMode(newMode);
    setError('');
    setSuccess('');
    // Limpiar todos los campos al cambiar de modo
    setEmail('');
    setPassword('');
    setPhone('');
    setName('');
    // Limpiar errores de validación
    setEmailError('');
    setPhoneError('');
    setPasswordError('');
    setNameError('');
    setTouched({ email: false, phone: false, password: false, name: false });
    // No limpiar pendingEmail al cambiar de modo para mantener el estado
  };

  // Limpiar email pendiente cuando el usuario inicia sesión exitosamente
  useEffect(() => {
    // Si no hay pendingEmail, limpiar también el estado de dismissed
    if (!pendingEmail) {
      setDismissedPendingEmail(false);
      authStorage.removeDismissedPendingEmail();
    }
  }, [pendingEmail]);

  const handleResendConfirmation = useCallback(async () => {
    if (!pendingEmail) return;
    
    // Rate limiting para reenvío de email (máximo 3 por hora)
    const rateLimitKey = `resend_email_${pendingEmail}`;
    const rateCheck = rateLimiter.isAllowed(rateLimitKey, 3, 3600000);
    
    if (!rateCheck.allowed) {
      setError(rateCheck.message);
      return;
    }
    
    setResendingEmail(true);
    setError('');
    setSuccess('');
    
    try {
      rateLimiter.recordAttempt(rateLimitKey);
      const { error: resendError } = await authService.resendConfirmationEmail(pendingEmail);
      
      if (resendError) {
        if (resendError.message.includes('already confirmed')) {
          setError('Este email ya está confirmado. Puedes iniciar sesión.');
          setPendingEmail('');
          setDismissedPendingEmail(false);
          authStorage.removePendingEmail();
          authStorage.removeDismissedPendingEmail();
          rateLimiter.clear(rateLimitKey);
        } else {
          setError(handleError(resendError, 'Login - resendConfirmation'));
        }
      } else {
        setSuccess('Email de confirmación reenviado. Revisa tu bandeja de entrada (y spam).');
      }
    } catch (err) {
      setError(handleError(err, 'Login - resendConfirmation'));
    } finally {
      setResendingEmail(false);
    }
  }, [pendingEmail]);

  // Manejar clic en botón demo
  const handleDemoClick = (demoUser) => {
    // Cambiar a modo login si está en registro
    if (mode !== 'login') {
      setMode('login');
    }
    
    // Solo autocompletar campos, sin iniciar sesión automáticamente
    setEmail(demoUser.email);
    setPassword(demoUser.password);
    setError('');
    setSuccess('');
    
    // Enfocar el campo de contraseña para que el usuario pueda hacer clic en "Iniciar Sesión"
    setTimeout(() => {
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 100);
  };

  return (
    <div className="login-page">
      {/* Fondo animado */}
      <div className="login-background">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
        <div className="gradient-sphere sphere-3"></div>
        <div className="grid-overlay"></div>
      </div>

      <div className="login-container">
        {/* Panel izquierdo - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <div className="logo-container">
              <div className="logo-icon">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="40" height="40" rx="12" fill="url(#logo-gradient)"/>
                  <path d="M12 20L18 14L24 20L18 26L12 20Z" fill="white" fillOpacity="0.9"/>
                  <path d="M16 20L22 14L28 20L22 26L16 20Z" fill="white" fillOpacity="0.6"/>
                  <defs>
                    <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40">
                      <stop stopColor="#81D4FA"/>
                      <stop offset="1" stopColor="#4FC3F7"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1 className="logo-text">Smart Leads</h1>
            </div>
            
            <div className="branding-message">
              <h2>Sistema de Captación de Clientes</h2>
              <p>Encuentra empresas, valida contactos y automatiza tu prospección empresarial de manera inteligente.</p>
            </div>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <span>Búsqueda geolocalizada</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                </div>
                <span>Validación automática</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <span>Envío masivo de emails</span>
              </div>
            </div>

            {/* Botones de acceso demo */}
            <div className="demo-buttons-container">
              <h4>🔑 Acceso Rápido Demo</h4>
              <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '20px' }}>
                {useSupabase 
                  ? 'Acceso rápido sin crear cuenta'
                  : 'Usa estos botones para acceder'}
              </p>
              <div className="demo-buttons">
                <button
                  type="button"
                  className="demo-button demo-button-pro"
                  onClick={() => handleDemoClick(DEMO_USERS[0])}
                  disabled={loading}
                >
                  <div className="demo-button-content">
                    <span className="demo-button-badge pro">PRO</span>
                    <div className="demo-button-text">
                      <span className="demo-button-title">Administrador</span>
                      <span className="demo-button-subtitle">Acceso completo</span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </button>
                <button
                  type="button"
                  className="demo-button demo-button-free"
                  onClick={() => handleDemoClick(DEMO_USERS[1])}
                  disabled={loading}
                >
                  <div className="demo-button-content">
                    <span className="demo-button-badge free">FREE</span>
                    <div className="demo-button-text">
                      <span className="demo-button-title">Usuario</span>
                      <span className="demo-button-subtitle">Plan básico</span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"/>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          <div className="branding-footer">
            <p>Powered by <strong><a href="https://dotasolutions.agency" target="_blank" rel="noopener noreferrer">Dota Solutions</a></strong></p>
          </div>
        </div>

        {/* Panel derecho - Formulario */}
        <div className="login-form-panel">
          <div className="form-container">
            <div className="form-header">
            </div>

            {/* Tabs para cambiar entre login y registro */}
            {useSupabase && (
              <div className="auth-tabs">
                <button 
                  className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    if (mode !== 'login') {
                      setMode('login');
                      setError('');
                      setSuccess('');
                      setEmail('');
                      setPassword('');
                      setPhone('');
                      setName('');
                      setEmailError('');
                      setPhoneError('');
                      setPasswordError('');
                      setNameError('');
                      setTouched({ email: false, phone: false, password: false, name: false });
                    }
                  }}
                  type="button"
                >
                  Iniciar Sesión
                </button>
                <button 
                  className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    if (mode !== 'register') {
                      setMode('register');
                      setError('');
                      setSuccess('');
                      setEmail('');
                      setPassword('');
                      setPhone('');
                      setName('');
                      setEmailError('');
                      setPhoneError('');
                      setPasswordError('');
                      setNameError('');
                      setTouched({ email: false, phone: false, password: false, name: false });
                    }
                  }}
                  type="button"
                >
                  Registrarse
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div className="error-content">
                    <strong>Error</strong>
                  <span>{error}</span>
                  </div>
                </div>
              )}

              {success && (
                <div className="success-message-full">
                  <div className="success-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                  </div>
                  <div className="success-content">
                    <h3>¡Cuenta creada exitosamente!</h3>
                    <p>{success}</p>
                    
                    {pendingEmail && (
                      <>
                        <div className="email-troubleshooting">
                          <p className="troubleshooting-title">⚠️ ¿No recibiste el email?</p>
                          <ul className="troubleshooting-list">
                            <li>Revisa tu carpeta de <strong>spam</strong> o <strong>promociones</strong></li>
                            <li>Espera 1-2 minutos (puede haber delay)</li>
                            <li>Verifica que tu email sea correcto: <strong>{pendingEmail}</strong></li>
                            <li>Usa el botón de abajo para reenviar el email</li>
                            <li><strong>Tip:</strong> Puedes confirmar el email manualmente desde Supabase Dashboard → Users</li>
                          </ul>
                        </div>
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendingEmail}
                          className="resend-email-button"
                          aria-busy={resendingEmail}
                        >
                          {resendingEmail ? (
                            <>
                              <svg className="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                                <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round"/>
                              </svg>
                              Reenviando...
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '16px', height: '16px', marginRight: '8px'}}>
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                              </svg>
                              Reenviar email de confirmación
                            </>
                          )}
                      </button>
                        <div className="manual-confirm-hint">
                          <p>💡 <strong>Para desarrollo:</strong> Puedes confirmar el email manualmente desde Supabase Dashboard → Authentication → Users → Tu usuario → Confirm Email</p>
                        </div>
                      </>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSuccess('');
                        setError('');
                        setMode('login');
                        setEmail('');
                        setPassword('');
                        setPhone('');
                        setName('');
                      }}
                      className="back-to-login-button"
                    >
                      Volver a iniciar sesión
                    </button>
                  </div>
                </div>
              )}

              {!success && (
                <>
              {mode === 'register' && (
                <div className="form-group">
                  <label htmlFor="name">Nombre</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={handleNameChange}
                      onBlur={handleNameBlur}
                      placeholder="Tu nombre"
                      required={mode === 'register'}
                      autoComplete="name"
                      disabled={loading}
                      className={nameError ? 'input-error' : ''}
                      minLength={2}
                      maxLength={20}
                      inputMode="text"
                    />
                  </div>
                  {nameError && <span className="field-error">{nameError}</span>}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                    disabled={loading}
                    className={emailError ? 'input-error' : ''}
                    maxLength={255}
                    inputMode="email"
                  />
                </div>
                {emailError && <span className="field-error">{emailError}</span>}
              </div>

              {mode === 'register' && (
                <div className="form-group">
                  <label htmlFor="phone">Teléfono</label>
                  <div className="input-wrapper phone-country-selector">
                    <div className="country-selector-wrapper">
                      <button
                        type="button"
                        className="country-selector-button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        disabled={loading}
                      >
                        <span className="country-flag">{selectedCountry.flag}</span>
                        <span className="country-prefix">{selectedCountry.prefix}</span>
                        <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6,9 12,15 18,9"/>
                        </svg>
                      </button>
                      {showCountryDropdown && (
                        <div className="country-dropdown">
                          <div className="country-dropdown-search">
                            <input
                              type="text"
                              placeholder="Buscar país..."
                              className="country-search-input"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              onFocus={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="country-list">
                            {filteredCountries.length > 0 ? (
                              filteredCountries.map((country) => (
                                <button
                                  key={country.code}
                                  type="button"
                                  className={`country-option ${selectedCountry.code === country.code ? 'selected' : ''}`}
                                  onClick={() => handleCountrySelect(country)}
                                >
                                  <span className="country-flag">{country.flag}</span>
                                  <span className="country-name">{country.name}</span>
                                  <span className="country-prefix">{country.prefix}</span>
                                </button>
                              ))
                            ) : (
                              <div className="country-no-results">No se encontraron países</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={handlePhoneChange}
                      onBlur={handlePhoneBlur}
                      placeholder="1112345678"
                      required={mode === 'register'}
                      autoComplete="tel"
                      disabled={loading}
                      className={`phone-input ${phoneError ? 'input-error' : ''}`}
                      maxLength={20}
                      inputMode="numeric"
                    />
                  </div>
                  {phoneError && <span className="field-error">{phoneError}</span>}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    placeholder={mode === 'register' ? 'Mínimo 8 caracteres, letra y número' : 'Tu contraseña'}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    disabled={loading}
                    className={passwordError ? 'input-error' : ''}
                    maxLength={128}
                    minLength={mode === 'register' ? 8 : 6}
                    inputMode="text"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {passwordError && <span className="field-error">{passwordError}</span>}
                {mode === 'register' && !passwordError && password.length > 0 && (
                  <div className="password-requirements">
                    <span className={password.length >= 8 ? 'requirement-met' : 'requirement-unmet'}>
                      ✓ Mínimo 8 caracteres
                    </span>
                    <span className={/[a-zA-Z]/.test(password) ? 'requirement-met' : 'requirement-unmet'}>
                      ✓ Al menos una letra
                    </span>
                    <span className={/\d/.test(password) ? 'requirement-met' : 'requirement-unmet'}>
                      ✓ Al menos un número
                    </span>
                  </div>
                )}
              </div>

              {mode === 'login' && (
                <div className="form-options">
                  <label className="remember-me">
                    <input type="checkbox" />
                    <span className="checkmark"></span>
                    <span>Recordarme</span>
                  </label>
                  <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
                </div>
              )}

              {mode === 'login' && pendingEmail && !dismissedPendingEmail && email.trim().toLowerCase() === pendingEmail.toLowerCase() && (
                <div className="pending-email-warning">
                  <button
                    type="button"
                    className="dismiss-warning-button"
                    onClick={() => {
                      setDismissedPendingEmail(true);
                      authStorage.setDismissedPendingEmail(true);
                      authStorage.setDismissedPendingEmailTime(Date.now());
                    }}
                    aria-label="Cerrar advertencia"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                  <div className="warning-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div className="warning-content">
                    <p className="warning-title">Email pendiente de confirmación</p>
                    <p className="warning-text">
                      Tienes un email pendiente: <strong>{pendingEmail}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail}
                      className="resend-warning-button"
                      aria-busy={resendingEmail}
                    >
                      {resendingEmail ? (
                        <>
                          <svg className="spinner-icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                            <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round"/>
                          </svg>
                          Reenviando...
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '14px', height: '14px', marginRight: '6px', display: 'inline-block', verticalAlign: 'middle'}}>
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          Reenviar email
                        </>
                      )}
                  </button>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="login-button"
                disabled={loading || !isFormValid()}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <svg className="spinner-icon-button" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                      <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round"/>
                    </svg>
                    <span>{mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...'}</span>
                  </>
                ) : (
                  <>
                <span>{mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12,5 19,12 12,19"/>
                </svg>
                  </>
                )}
              </button>
                </>
              )}
            </form>

            <div className="form-footer">
              {useSupabase ? (
                <p>
                  {mode === 'login' 
                    ? '¿No tienes una cuenta? ' 
                    : '¿Ya tienes una cuenta? '}
                  <button type="button" className="link-button" onClick={toggleMode}>
                    {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                  </button>
                </p>
              ) : (
                <p>¿No tienes una cuenta? <a href="#">Contactar administrador</a></p>
              )}
            </div>
          </div>

          <div className="security-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Conexión segura SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './Login.css';
import { authService, supabase } from '../lib/supabase';
import { authStorage, storage } from '../utils/storage';
import { rateLimiter, debounce } from '../utils/rateLimiter';
import { handleError } from '../utils/errorHandler';
import { API_URL } from '../config';
import axios from 'axios';
import { validateEmail, validateName, validatePhone, validatePassword } from '../utils/validators';

// Credenciales de prueba (modo demo cuando Supabase no está configurado)
const DEMO_USERS = [
  {
    id: 'd6da6078-b335-43d3-8e06-4db0fb35fdb9', // Admin actual en la BD
    email: 'admin@admin.com',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin',
    plan: 'starter'
  },
  {
    id: 'user_demo_id',
    email: 'user@dotasolutions.com',
    password: 'User2024!',
    name: 'Usuario',
    role: 'user',
    plan: 'pro'
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

// Local implementation of validatePassword depends on mode, 
// so we'll wrap the unified validator inside the component or keep it here if needed.
// However, since we unified it, we can just use the import.

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
  const [loginMessage, setLoginMessage] = useState('');
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
  
  // Estados para recuperación de contraseña
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState('request'); // 'request', 'verify', 'reset'
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordCode, setForgotPasswordCode] = useState('');
  const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState('');
  const [forgotPasswordConfirmPassword, setForgotPasswordConfirmPassword] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordCodeSent, setForgotPasswordCodeSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0); // Countdown en segundos
  const [canResendCode, setCanResendCode] = useState(false);
  
  const [showAdminContactModal, setShowAdminContactModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  
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
  
  // Verificar si el email fue confirmado recientemente
  useEffect(() => {
    const emailConfirmed = storage.getItem('email_confirmed');
    if (emailConfirmed === 'true') {
      // Cambiar a modo login y mostrar mensaje de éxito
      setMode('login');
      setSuccess('¡Email confirmado exitosamente! Ahora podés iniciar sesión con tu cuenta.');
      // Limpiar el flag
      storage.removeItem('email_confirmed');
    }
  }, []);
  
  // Validar formulario completo (función simple, sin memoizar para evitar problemas)
  const isFormValid = () => {
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password, mode === 'register');
    // Validar solo el número local (sin el prefijo)
    const phoneValidation = mode === 'register' ? validatePhone(phone, selectedCountry.prefix) : { isValid: true };
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

    debouncedPhoneValidationRef.current = debounce((phoneNumber, prefix) => {
      // Validar solo el número local (sin el prefijo)
      const validation = validatePhone(phoneNumber, prefix || '');
      setPhoneError(validation.message);
    }, 300);

    debouncedPasswordValidationRef.current = debounce((value) => {
      const validation = validatePassword(value, modeRef.current === 'register');
      setPasswordError(validation.message);
    }, 300);

    debouncedNameValidationRef.current = debounce((value) => {
      const validation = validateName(value);
      setNameError(validation.message);
    }, 300);
  }, []); // Solo crear una vez al montar

  // Countdown para reenviar código de recuperación de contraseña
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && forgotPasswordCodeSent) {
      setCanResendCode(true);
    }
  }, [resendCountdown, forgotPasswordCodeSent]);
  
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
    
    // Solo validar si hay contenido (el teléfono es opcional)
    if (value && (touched.phone || mode === 'register') && debouncedPhoneValidationRef.current) {
      // Validar solo el número local (sin el prefijo)
      debouncedPhoneValidationRef.current(value, selectedCountry.prefix);
    } else if (!value) {
      // Si está vacío, limpiar el error (es opcional)
      setPhoneError('');
    }
  }, [touched.phone, mode, selectedCountry]);
  
  const handleCountrySelect = useCallback((country) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
    setCountrySearch('');
    // Revalidar el teléfono con el nuevo prefijo (solo el número local)
    if (phone && (touched.phone || mode === 'register') && debouncedPhoneValidationRef.current) {
      debouncedPhoneValidationRef.current(phone, country.prefix);
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
    // Solo validar si el teléfono tiene algún valor (es opcional)
    if (phone && phone.trim() !== '') {
      // Validar solo el número local (sin el prefijo)
      const validation = validatePhone(phone, selectedCountry.prefix);
      setPhoneError(validation.message);
    } else {
      // Si está vacío, no mostrar error (es opcional)
      setPhoneError('');
    }
  };
  
  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    if (!showCountryDropdown) return;
    
    const handleClickOutside = (event) => {
      try {
        if (showCountryDropdown && !event.target.closest('.phone-country-selector')) {
          setShowCountryDropdown(false);
        }
      } catch (error) {
        // Silenciar errores de extensiones del navegador
        if (!error.message?.includes('message channel closed')) {
          console.warn('Error en handleClickOutside:', error);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    return () => {
      try {
        document.removeEventListener('mousedown', handleClickOutside);
      } catch (error) {
        // Silenciar errores de limpieza
        if (!error.message?.includes('message channel closed')) {
          console.warn('Error al limpiar listener:', error);
        }
      }
    };
  }, [showCountryDropdown]);
  
  const handlePasswordBlur = () => {
    setTouched({ ...touched, password: true });
    const validation = validatePassword(password, mode === 'register');
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
    const passwordValidation = validatePassword(password, mode === 'register');
    const fullPhone = mode === 'register' ? `${selectedCountry.prefix}${phone}` : '';
    // Validar solo el número local (sin el prefijo)
    const phoneValidation = mode === 'register' ? validatePhone(phone, selectedCountry.prefix) : { isValid: true };
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
          id: demoUser.id,
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
          // Rate limiting para registro (Desactivado a pedido del usuario)
          // const rateLimitKey = `signup_${emailLimpio}`;
          // const rateCheck = rateLimiter.isAllowed(rateLimitKey, 10, 60000); // Aumentado a 10 por minuto y reducido tiempo
          
          // if (!rateCheck.allowed) {
          //   setError(rateCheck.message);
          //   setLoading(false);
          //   return;
          // }

          // rateLimiter.recordAttempt(rateLimitKey);
          const { data, error, needsConfirmation } = await authService.signUp(emailLimpio, passwordLimpio, name.trim(), fullPhone);
          
          if (error) {
            setError(handleError(error, 'Login - signUp'));
            setLoading(false);
            } else {
            // Limpiar rate limit en éxito
            // rateLimiter.clear(rateLimitKey);
            
            // Verificar si el email fue enviado
            if (needsConfirmation || (data?.user && !data.user.email_confirmed_at)) {
              setSuccess(`Revisa tu bandeja de entrada (y spam) para confirmar tu email. El link de confirmación expira en 24 horas.`);
              setPendingEmail(emailLimpio);
              authStorage.setPendingEmail(emailLimpio);
            } else {
              setSuccess('');
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
              <h2>La nueva era de las ventas.</h2>
            </div>

            <div className="features-list">
              <div className="feature-item">
                <span>Basta de perseguir clientes.</span>
              </div>
              <div className="feature-item">
                <span>Prospectos calificados en segundos.</span>
              </div>
              <div className="feature-item">
                <span>Contacto masivo sin spam.</span>
              </div>
              <div className="feature-item">
                <span>Ganá tiempo, ganá dinero.</span>
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

            {/* Tabs removidos para ocultar registro */}
            {/*
            {useSupabase && (
              <div className="auth-tabs">
                 ... (register content hidden) ...
              </div>
            )}
            */}
            {/* Tabs removidos para ocultar registro */}
            <div className="auth-header-simple">
              <h2>Iniciar Sesión</h2>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {loginMessage && (
                <div className="error-message" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981', color: '#10b981' }}>
                  <div className="error-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <div className="error-content">
                    <strong style={{ color: '#10b981' }}>¡Éxito!</strong>
                    <span style={{ color: '#10b981' }}>{loginMessage}</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="error-message minimalist">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span className="error-text">{error}</span>
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
                  <label htmlFor="phone">
                    Teléfono
                    <span className="optional-badge">Opcional</span>
                  </label>
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
                      autoComplete="tel"
                      disabled={loading}
                      className={`phone-input ${phoneError ? 'input-error' : ''}`}
                      maxLength={12}
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
                  <a 
                    href="#" 
                    className="forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowForgotPasswordModal(true);
                      setForgotPasswordStep('request');
                      setForgotPasswordEmail(email); // Pre-llenar con el email del login si existe
                      setForgotPasswordCode('');
                      setForgotPasswordNewPassword('');
                      setForgotPasswordConfirmPassword('');
                      setForgotPasswordError('');
                      setForgotPasswordCodeSent(false);
                      setResendCountdown(0);
                      setCanResendCode(false);
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
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
              <p>
                ¿No tienes una cuenta?{' '}
                <a 
                  href="#" 
                  className="contact-admin-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowAdminContactModal(true);
                  }}
                >
                  Contactar administrador
                </a>
              </p>
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

      {/* Modal de recuperación de contraseña */}
      {showForgotPasswordModal && (
        <div className="forgot-password-modal-overlay" onClick={() => {
          if (!forgotPasswordLoading) {
            setShowForgotPasswordModal(false);
            setForgotPasswordStep('request');
            setForgotPasswordEmail('');
            setForgotPasswordCode('');
            setForgotPasswordNewPassword('');
            setForgotPasswordConfirmPassword('');
            setForgotPasswordError('');
            setForgotPasswordCodeSent(false);
            setResendCountdown(0);
            setCanResendCode(false);
          }
        }}>
          <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="forgot-password-modal-header">
              <h3>Recuperar contraseña</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  if (!forgotPasswordLoading) {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordStep('request');
                    setForgotPasswordEmail('');
                    setForgotPasswordCode('');
                    setForgotPasswordNewPassword('');
                    setForgotPasswordConfirmPassword('');
                    setForgotPasswordError('');
                    setForgotPasswordCodeSent(false);
                    setResendCountdown(0);
                    setCanResendCode(false);
                  }
                }}
                disabled={forgotPasswordLoading}
              >
                ×
              </button>
    </div>
            
            <div className="forgot-password-modal-body">
              {forgotPasswordError && (
                <div className="forgot-password-error">
                  {forgotPasswordError}
                </div>
              )}

              {forgotPasswordStep === 'request' && (
                <>
                  <p style={{ marginBottom: '20px', color: '#666' }}>
                    Ingresá tu email y te enviaremos un código de verificación para recuperar tu contraseña.
                  </p>
                  <div className="forgot-password-input-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="Ingresá tu email"
                      disabled={forgotPasswordLoading}
                      autoFocus
                    />
                  </div>
                </>
              )}

              {forgotPasswordStep === 'verify' && (
                <>
                  {forgotPasswordCodeSent && (
                    <div style={{ 
                      background: '#d4edda', 
                      border: '1px solid #c3e6cb', 
                      borderRadius: '8px', 
                      padding: '12px', 
                      marginBottom: '20px',
                      color: '#155724'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        ✓ Código enviado a {forgotPasswordEmail}. Revisá tu bandeja de entrada.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordStep('request');
                          setForgotPasswordCode('');
                          setForgotPasswordCodeSent(false);
                          setForgotPasswordError('');
                          setResendCountdown(0);
                          setCanResendCode(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#155724',
                          cursor: 'pointer',
                          fontSize: '12px',
                          textDecoration: 'underline',
                          padding: 0,
                          opacity: 0.8
                        }}
                        title="Cambiar email"
                      >
                        Email equivocado?
                      </button>
                    </div>
                  )}
                  <div className="forgot-password-input-group">
                    <label>Código de validación</label>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                          key={index}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={forgotPasswordCode[index] || ''}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const numericValue = inputValue.replace(/\D/g, '');
                            
                            // Crear array de 6 elementos
                            const codeArray = forgotPasswordCode.split('');
                            while (codeArray.length < 6) {
                              codeArray.push('');
                            }
                            
                            if (numericValue.length > 0) {
                              // Si hay un valor numérico, actualizar solo el último dígito ingresado
                              codeArray[index] = numericValue.slice(-1);
                              setForgotPasswordCode(codeArray.join(''));
                              
                              // Mover al siguiente input si hay valor y no es el último
                              if (index < 5) {
                                setTimeout(() => {
                                  const nextInput = e.target.parentElement?.children[index + 1];
                                  if (nextInput) {
                                    nextInput.focus();
                                  }
                                }, 0);
                              }
                            } else {
                              // Si está vacío, borrar este dígito
                              codeArray[index] = '';
                              setForgotPasswordCode(codeArray.join(''));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              e.preventDefault();
                              
                              // Crear array de 6 elementos
                              const codeArray = forgotPasswordCode.split('');
                              while (codeArray.length < 6) {
                                codeArray.push('');
                              }
                              
                              if (codeArray[index] && codeArray[index] !== '') {
                                // Si hay un valor en el campo actual, borrarlo
                                codeArray[index] = '';
                                setForgotPasswordCode(codeArray.join(''));
                                // Mantener el foco en el mismo campo
                              } else if (index > 0) {
                                // Si el campo está vacío, ir al anterior y borrarlo
                                codeArray[index - 1] = '';
                                setForgotPasswordCode(codeArray.join(''));
                                
                                setTimeout(() => {
                                  const prevInput = e.target.parentElement?.children[index - 1];
                                  if (prevInput) {
                                    prevInput.focus();
                                    // Seleccionar el contenido para que se pueda borrar fácilmente
                                    prevInput.select();
                                  }
                                }, 0);
                              }
                            } else if (e.key === 'Delete') {
                              e.preventDefault();
                              const codeArray = forgotPasswordCode.split('');
                              while (codeArray.length < 6) {
                                codeArray.push('');
                              }
                              codeArray[index] = '';
                              setForgotPasswordCode(codeArray.join(''));
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                            setForgotPasswordCode(pastedData);
                            if (pastedData.length === 6) {
                              const lastInput = e.target.parentElement?.children[5];
                              if (lastInput) {
                                lastInput.focus();
                              }
                            }
                          }}
                          disabled={forgotPasswordLoading}
                          autoFocus={index === 0}
                          style={{ 
                            width: '48px',
                            height: '56px',
                            textAlign: 'center', 
                            fontSize: '24px', 
                            fontFamily: 'monospace',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#81D4FA';
                            e.target.style.boxShadow = '0 0 0 3px rgba(129, 212, 250, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e5e7eb';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                        El código expira en 10 minutos
                      </p>
                      {canResendCode ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!forgotPasswordEmail) {
                              setForgotPasswordError('Ingresá tu email');
                              return;
                            }

                            setForgotPasswordLoading(true);
                            setForgotPasswordError('');
                            setCanResendCode(false);

                            try {
                              const response = await axios.post(`${API_URL}/auth/solicitar-codigo-reset-password`, {
                                email: forgotPasswordEmail
                              });

                              if (response.data.success) {
                                setForgotPasswordCodeSent(true);
                                setForgotPasswordCode(''); // Limpiar código anterior
                                setResendCountdown(60); // Reiniciar countdown a 60 segundos
                                setForgotPasswordError('');
                              } else {
                                setForgotPasswordError(response.data.message || 'Error al solicitar el código');
                                setCanResendCode(true);
                              }
                            } catch (error) {
                              const errorMsg = error.response?.data?.detail || error.message || 'Error al solicitar el código';
                              setForgotPasswordError(errorMsg);
                              setCanResendCode(true);
                            } finally {
                              setForgotPasswordLoading(false);
                            }
                          }}
                          disabled={forgotPasswordLoading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#81D4FA',
                            cursor: 'pointer',
                            fontSize: '12px',
                            textDecoration: 'underline',
                            padding: 0,
                            margin: 0
                          }}
                        >
                          Reenviar código
                        </button>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                          Reenviar código en {resendCountdown}s
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {forgotPasswordStep === 'reset' && (
                <>
                  <div style={{ 
                    background: '#d4edda', 
                    border: '1px solid #c3e6cb', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    marginBottom: '20px',
                    color: '#155724'
                  }}>
                    ✓ Código verificado correctamente. Ingresá tu nueva contraseña.
                  </div>
                  <div className="forgot-password-input-group">
                    <label>Nueva contraseña</label>
                    <input
                      type="password"
                      value={forgotPasswordNewPassword}
                      onChange={(e) => setForgotPasswordNewPassword(e.target.value)}
                      placeholder="Ingresá tu nueva contraseña (8-16 caracteres)"
                      disabled={forgotPasswordLoading}
                      autoFocus
                      minLength={8}
                      maxLength={16}
                    />
                    {forgotPasswordNewPassword && (
                      <p style={{ 
                        fontSize: '12px', 
                        marginTop: '4px',
                        color: forgotPasswordNewPassword.length >= 8 && forgotPasswordNewPassword.length <= 16 ? '#10b981' : '#ef4444'
                      }}>
                        {forgotPasswordNewPassword.length < 8 
                          ? `Mínimo 8 caracteres (${forgotPasswordNewPassword.length}/8)`
                          : forgotPasswordNewPassword.length > 16
                          ? `Máximo 16 caracteres (${forgotPasswordNewPassword.length}/16)`
                          : `✓ Longitud válida (${forgotPasswordNewPassword.length} caracteres)`
                        }
                      </p>
                    )}
                  </div>

                  <div className="forgot-password-input-group">
                    <label>Confirmar nueva contraseña</label>
                    <input
                      type="password"
                      value={forgotPasswordConfirmPassword}
                      onChange={(e) => setForgotPasswordConfirmPassword(e.target.value)}
                      placeholder="Confirmá tu nueva contraseña"
                      disabled={forgotPasswordLoading}
                      minLength={8}
                      maxLength={16}
                    />
                    {forgotPasswordConfirmPassword && forgotPasswordNewPassword && (
                      <p style={{ 
                        fontSize: '12px', 
                        marginTop: '4px',
                        color: forgotPasswordNewPassword === forgotPasswordConfirmPassword ? '#10b981' : '#ef4444'
                      }}>
                        {forgotPasswordNewPassword === forgotPasswordConfirmPassword 
                          ? '✓ Las contraseñas coinciden'
                          : '✗ Las contraseñas no coinciden'
                        }
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="forgot-password-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  if (!forgotPasswordLoading) {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordStep('request');
                    setForgotPasswordEmail('');
                    setForgotPasswordCode('');
                    setForgotPasswordNewPassword('');
                    setForgotPasswordConfirmPassword('');
                    setForgotPasswordError('');
                    setForgotPasswordCodeSent(false);
                    setResendCountdown(0);
                    setCanResendCode(false);
                  }
                }}
                disabled={forgotPasswordLoading}
              >
                Cancelar
              </button>
              {forgotPasswordStep === 'request' && (
                <button 
                  className="forgot-password-save-btn"
                  onClick={async () => {
                    if (!forgotPasswordEmail) {
                      setForgotPasswordError('Ingresá tu email');
                      return;
                    }

                    setForgotPasswordLoading(true);
                    setForgotPasswordError('');

                    try {
                      const response = await axios.post(`${API_URL}/auth/solicitar-codigo-reset-password`, {
                        email: forgotPasswordEmail
                      });

                      if (response.data.success) {
                        setForgotPasswordCodeSent(true);
                        setForgotPasswordStep('verify');
                        setResendCountdown(60); // Iniciar countdown de 60 segundos
                        setCanResendCode(false);
                        setForgotPasswordError('');
                      } else {
                        setForgotPasswordError(response.data.message || 'Error al solicitar el código');
                      }
                    } catch (error) {
                      const errorMsg = error.response?.data?.detail || error.message || 'Error al solicitar el código';
                      setForgotPasswordError(errorMsg);
                    } finally {
                      setForgotPasswordLoading(false);
                    }
                  }}
                  disabled={forgotPasswordLoading || !forgotPasswordEmail}
                >
                  {forgotPasswordLoading ? 'Enviando...' : 'Enviar código'}
                </button>
              )}
              {forgotPasswordStep === 'verify' && (
                <button 
                  className="forgot-password-save-btn"
                  onClick={async () => {
                    if (!forgotPasswordCode || forgotPasswordCode.length !== 6) {
                      setForgotPasswordError('Ingresá el código de 6 dígitos');
                      return;
                    }

                    setForgotPasswordLoading(true);
                    setForgotPasswordError('');

                    try {
                      const response = await axios.post(`${API_URL}/auth/reset-password`, {
                        email: forgotPasswordEmail,
                        codigo: forgotPasswordCode
                      });

                      if (response.data.success && response.data.valid) {
                        setForgotPasswordStep('reset');
                        setForgotPasswordError('');
                      } else {
                        setForgotPasswordError('Código de validación incorrecto');
                      }
                    } catch (error) {
                      const errorMsg = error.response?.data?.detail || error.message || 'Error al validar el código';
                      setForgotPasswordError(errorMsg);
                    } finally {
                      setForgotPasswordLoading(false);
                    }
                  }}
                  disabled={forgotPasswordLoading || forgotPasswordCode.length !== 6}
                >
                  {forgotPasswordLoading ? 'Verificando...' : 'Verificar código'}
                </button>
              )}
              {forgotPasswordStep === 'reset' && (
                <button 
                  className="forgot-password-save-btn"
                  onClick={async () => {
                    // Validaciones
                    if (!forgotPasswordNewPassword || !forgotPasswordConfirmPassword) {
                      setForgotPasswordError('Completá todos los campos');
                      return;
                    }

                    if (forgotPasswordNewPassword !== forgotPasswordConfirmPassword) {
                      setForgotPasswordError('Las contraseñas no coinciden');
                      return;
                    }

                    if (forgotPasswordNewPassword.length < 8 || forgotPasswordNewPassword.length > 16) {
                      setForgotPasswordError('La contraseña debe tener entre 8 y 16 caracteres');
                      return;
                    }

                    if (!forgotPasswordCode || forgotPasswordCode.length !== 6) {
                      setForgotPasswordError('El código de verificación es requerido');
                      return;
                    }

                    if (!forgotPasswordEmail) {
                      setForgotPasswordError('El email es requerido');
                      return;
                    }

                    setForgotPasswordLoading(true);
                    setForgotPasswordError('');

                    try {
                      console.log('Actualizando contraseña con:', {
                        email: forgotPasswordEmail,
                        codigo: forgotPasswordCode,
                        passwordLength: forgotPasswordNewPassword.length
                      });

                      // Llamar al endpoint que actualiza la contraseña
                      const response = await axios.post(`${API_URL}/auth/actualizar-password-reset`, {
                        email: forgotPasswordEmail,
                        codigo: forgotPasswordCode,
                        new_password: forgotPasswordNewPassword
                      });

                      console.log('Respuesta del servidor:', response.data);

                      if (response.data && response.data.success === true) {
                        // Éxito - contraseña actualizada
                        setSuccess(''); // No mostrar pantalla de éxito de creación de cuenta
                        setLoginMessage('Tu contraseña ha sido actualizada correctamente. Podés iniciar sesión con tu nueva contraseña.');
                        setMode('login'); // Asegurar redirección al login
                        setPassword(''); // Limpiar contraseña anterior del formulario
                        
                        // Limpiar todo
                        setShowForgotPasswordModal(false);
                        setForgotPasswordStep('request');
                        setForgotPasswordEmail('');
                        setForgotPasswordCode('');
                        setForgotPasswordNewPassword('');
                        setForgotPasswordConfirmPassword('');
                        setForgotPasswordError('');
                        setForgotPasswordCodeSent(false);
                        setResendCountdown(0);
                        setCanResendCode(false);
                        setForgotPasswordLoading(false);
                      } else {
                        // Error del servidor
                        const errorMsg = response.data?.message || 'Error al actualizar la contraseña';
                        setForgotPasswordError(errorMsg);
                        setForgotPasswordLoading(false);
                      }
                    } catch (error) {
                      console.error('Error completo:', error);
                      console.error('Error response:', error.response?.data);
                      
                      const errorMsg = error.response?.data?.detail || 
                                     error.response?.data?.message || 
                                     error.message || 
                                     'Error al cambiar la contraseña. Por favor, intentá nuevamente.';
                      
                      setForgotPasswordError(errorMsg);
                      setForgotPasswordLoading(false);
                    }
                  }}
                  disabled={forgotPasswordLoading || !forgotPasswordCode || forgotPasswordCode.length !== 6}
                >
                  {forgotPasswordLoading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal de Contacto para Administrador */}
      {showAdminContactModal && (
        <div className="contact-modal-overlay" onClick={() => setShowAdminContactModal(false)}>
          <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAdminContactModal(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="modal-header">
              <h2>Soporte y Cuentas</h2>
              <p>Contactate directamente con el administrador del sistema.</p>
            </div>
            <div className="contact-options">
              <div 
                className="contact-option-card"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  navigator.clipboard.writeText("solutionsdota@gmail.com");
                  setEmailCopied(true);
                  setTimeout(() => setEmailCopied(false), 2000);
                }}
              >
                <div className="contact-option-icon email">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <div className="contact-option-info">
                  <strong>Email</strong>
                  <span>{emailCopied ? '¡Copiado!' : 'solutionsdota@gmail.com'}</span>
                </div>
                {emailCopied && (
                  <div className="copy-feedback-bubble">✓ Copiado</div>
                )}
              </div>
              <a href="https://linkedin.com/in/ivolevy" target="_blank" rel="noopener noreferrer" className="contact-option-card">
                <div className="contact-option-icon linkedin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                </div>
                <div className="contact-option-info">
                  <strong>LinkedIn</strong>
                  <span>Ivo Levy</span>
                </div>
              </a>
              <a href="https://wa.me/541138240929" target="_blank" rel="noopener noreferrer" className="contact-option-card">
                <div className="contact-option-icon whatsapp">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"></path></svg>
                </div>
                <div className="contact-option-info">
                  <strong>Celular / WhatsApp</strong>
                  <span>+54 11 3824-0929</span>
                </div>
              </a>
            </div>
            <div className="modal-footer">
              <p>Atención 24/7, ¡tu consulta no molesta!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;

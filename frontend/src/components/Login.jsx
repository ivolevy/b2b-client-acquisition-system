import React, { useState, useEffect } from 'react';
import './Login.css';
import { authService, supabase } from '../lib/supabase';

// Credenciales de prueba (modo demo cuando Supabase no está configurado)
const DEMO_USERS = [
  {
    email: 'admin@dotasolutions.com',
    password: 'Dota2024!',
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
  // Permitir solo números, espacios, guiones y paréntesis
  const phoneRegex = /^[\d\s\-\(\)]+$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  if (!phoneRegex.test(phone)) {
    return { isValid: false, message: 'El teléfono solo puede contener números, espacios, guiones y paréntesis' };
  }
  if (cleanPhone.length < 8) {
    return { isValid: false, message: 'El teléfono debe tener al menos 8 dígitos' };
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
  if (password.length < 6) {
    return { isValid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
  }
  if (password.length > 128) {
    return { isValid: false, message: 'La contraseña es demasiado larga (máximo 128 caracteres)' };
  }
  if (mode === 'register' && password.length < 8) {
    return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
  }
  // Validar que tenga al menos una letra y un número (opcional pero recomendado)
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(() => {
    // Cargar email pendiente de localStorage
    return localStorage.getItem('pending_email_confirmation') || '';
  });
  const [resendingEmail, setResendingEmail] = useState(false);
  const [dismissedPendingEmail, setDismissedPendingEmail] = useState(() => {
    // Verificar si el usuario cerró el mensaje de email pendiente
    return localStorage.getItem('dismissed_pending_email') === 'true';
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
            localStorage.removeItem('pending_email_confirmation');
            localStorage.removeItem('dismissed_pending_email');
            localStorage.removeItem('dismissed_pending_email_time');
            return;
          }
          
          // Si el usuario cerró el mensaje hace más de 7 días, limpiar el pendingEmail
          const dismissedTime = localStorage.getItem('dismissed_pending_email_time');
          if (dismissedTime) {
            const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed > 7) {
              setPendingEmail('');
              localStorage.removeItem('pending_email_confirmation');
              localStorage.removeItem('dismissed_pending_email');
              localStorage.removeItem('dismissed_pending_email_time');
            }
          }
        } catch (error) {
          // Si hay error, simplemente no hacer nada
          console.log('[Login] Error verificando sesión:', error);
        }
      } else if (!useSupabase && pendingEmail) {
        // Si no se usa Supabase, limpiar el email pendiente
        setPendingEmail('');
        localStorage.removeItem('pending_email_confirmation');
        localStorage.removeItem('dismissed_pending_email');
        localStorage.removeItem('dismissed_pending_email_time');
      }
    };
    
    checkSession();
  }, []); // Solo ejecutar una vez al montar el componente
  
  // Validar formulario completo
  const isFormValid = () => {
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password, mode);
    const phoneValidation = mode === 'register' ? validatePhone(phone) : { isValid: true };
    const nameValidation = mode === 'register' ? validateName(name) : { isValid: true };
    
    return emailValidation.isValid && passwordValidation.isValid && phoneValidation.isValid && nameValidation.isValid;
  };
  
  // Handlers de cambio con validación en tiempo real
  const handleEmailChange = (e) => {
    const value = e.target.value;
    
    // Si el usuario cambia el email y es diferente al pendingEmail, resetear el dismissed
    if (pendingEmail && value.trim().toLowerCase() !== pendingEmail.toLowerCase()) {
      setDismissedPendingEmail(false);
      localStorage.removeItem('dismissed_pending_email');
      localStorage.removeItem('dismissed_pending_email_time');
    }
    setEmail(value);
    if (touched.email) {
      const validation = validateEmail(value);
      setEmailError(validation.message);
    }
  };
  
  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (touched.name) {
      const validation = validateName(value);
      setNameError(validation.message);
    }
  };
  
  const handlePhoneChange = (e) => {
    // Solo permitir números, espacios, guiones y paréntesis
    const value = e.target.value.replace(/[^\d\s\-\(\)]/g, '');
    setPhone(value);
    if (touched.phone) {
      const validation = validatePhone(value);
      setPhoneError(validation.message);
    }
  };
  
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) {
      const validation = validatePassword(value, mode);
      setPasswordError(validation.message);
    }
  };
  
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
    const validation = validatePhone(phone);
    setPhoneError(validation.message);
  };
  
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
    const phoneValidation = mode === 'register' ? validatePhone(phone) : { isValid: true };
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
        localStorage.setItem('b2b_auth', JSON.stringify(userData));
        localStorage.setItem('b2b_token', 'demo_token_' + Date.now());
        onLogin(userData);
        setLoading(false);
        return;
      }

      if (useSupabase) {
        // Modo Supabase
        if (mode === 'login') {
          const { data, error } = await authService.signIn(emailLimpio, passwordLimpio);
          
          if (error) {
            if (error.message.includes('Invalid login')) {
              setError('Credenciales incorrectas. Verifica tu email y contraseña.');
            } else if (error.message.includes('Email not confirmed')) {
              setError('Debes confirmar tu email antes de iniciar sesión.');
            } else {
              setError(error.message);
            }
          } else {
            // Si el usuario inicia sesión exitosamente, limpiar email pendiente
            if (pendingEmail && data.user.email === pendingEmail) {
              setPendingEmail('');
              setDismissedPendingEmail(false);
              localStorage.removeItem('pending_email_confirmation');
              localStorage.removeItem('dismissed_pending_email');
            }
            
            const userData = {
              id: data.user.id,
              email: data.user.email,
              name: data.profile?.name || data.user.email.split('@')[0],
              phone: data.profile?.phone || '',
              plan: data.profile?.plan || 'free',
              role: data.profile?.plan === 'pro' ? 'admin' : 'user',
              loginTime: new Date().toISOString()
            };
            localStorage.setItem('b2b_auth', JSON.stringify(userData));
            onLogin(userData);
          }
        } else {
          // Registro - Validaciones adicionales antes de enviar
          const phoneValidation = validatePhone(phone.trim());
          if (!phoneValidation.isValid) {
            setError(phoneValidation.message);
            setLoading(false);
            return;
          }

          const { data, error, needsConfirmation } = await authService.signUp(emailLimpio, passwordLimpio, name.trim(), phone.trim());
          
          if (error) {
            if (error.message.includes('already registered') || error.message.includes('already exists')) {
              setError('Este email ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.');
            } else if (error.message.includes('Invalid email')) {
              setError('El formato del email no es válido.');
            } else {
              setError(error.message || 'Error al crear la cuenta. Intenta de nuevo.');
            }
          } else {
            // Verificar si el email fue enviado
            if (needsConfirmation || (data?.user && !data.user.email_confirmed_at)) {
              setSuccess(`¡Cuenta creada exitosamente! Revisa tu bandeja de entrada (y spam) para confirmar tu email. El link de confirmación expira en 24 horas.`);
              setPendingEmail(emailLimpio); // Guardar email para permitir reenvío
              localStorage.setItem('pending_email_confirmation', emailLimpio);
              
              // Log para depuración
              console.log('[Auth] Usuario creado, necesita confirmar email:', emailLimpio);
              console.log('[Auth] Si no recibes el email, verifica:');
              console.log('[Auth] 1. Settings → Auth → Email Auth → "Enable email confirmations" está activado');
              console.log('[Auth] 2. Settings → Auth → URL Configuration → URL de redirección configurada');
              console.log('[Auth] 3. Settings → Auth → SMTP Settings → SMTP configurado (opcional pero recomendado)');
            } else {
              setSuccess('¡Cuenta creada exitosamente!');
              setPendingEmail('');
              localStorage.removeItem('pending_email_confirmation');
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
      localStorage.removeItem('dismissed_pending_email');
    }
  }, [pendingEmail]);

  const handleResendConfirmation = async () => {
    if (!pendingEmail) return;
    
    setResendingEmail(true);
    setError('');
    setSuccess('');
    
    try {
      const { error: resendError } = await authService.resendConfirmationEmail(pendingEmail);
      
      if (resendError) {
        if (resendError.message.includes('already confirmed')) {
          setError('Este email ya está confirmado. Puedes iniciar sesión.');
          setPendingEmail('');
          setDismissedPendingEmail(false);
          localStorage.removeItem('pending_email_confirmation');
          localStorage.removeItem('dismissed_pending_email');
        } else {
          setError(`Error al reenviar email: ${resendError.message}`);
        }
      } else {
        setSuccess('Email de confirmación reenviado. Revisa tu bandeja de entrada (y spam).');
      }
    } catch (err) {
      setError('Error al reenviar email. Intenta de nuevo.');
      console.error('Error reenviando email:', err);
    }
    
    setResendingEmail(false);
  };

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
                      <stop stopColor="#FF69B4"/>
                      <stop offset="1" stopColor="#FF1493"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1 className="logo-text">B2B Acquisition</h1>
            </div>
            
            <div className="branding-message">
              <h2>Sistema de Captación de Clientes</h2>
              <p>Encuentra empresas, valida contactos y automatiza tu prospección B2B de manera inteligente.</p>
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
            <p>Powered by <strong>Dota Solutions</strong></p>
          </div>
        </div>

        {/* Panel derecho - Formulario */}
        <div className="login-form-panel">
          <div className="form-container">
            <div className="form-header">
              <h2>{mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
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
                        >
                          {resendingEmail ? 'Reenviando...' : 'Reenviar email de confirmación'}
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

              {!success && !error && (
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
                  />
                </div>
                {emailError && <span className="field-error">{emailError}</span>}
              </div>

              {mode === 'register' && (
                <div className="form-group">
                  <label htmlFor="phone">Teléfono</label>
                  <div className="input-wrapper">
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={handlePhoneChange}
                      onBlur={handlePhoneBlur}
                      placeholder="+54 11 1234-5678"
                      required={mode === 'register'}
                      autoComplete="tel"
                      disabled={loading}
                      className={phoneError ? 'input-error' : ''}
                      maxLength={20}
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
                      localStorage.setItem('dismissed_pending_email', 'true');
                      localStorage.setItem('dismissed_pending_email_time', Date.now().toString());
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
                    >
                      {resendingEmail ? 'Reenviando...' : 'Reenviar email'}
                    </button>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="login-button"
                disabled={loading || !isFormValid()}
              >
                <span>{mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12,5 19,12 12,19"/>
                </svg>
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

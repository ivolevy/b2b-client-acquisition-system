import React, { useState, useEffect } from 'react';
import './Login.css';
import { authService } from '../lib/supabase';

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

function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' o 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
  
  const useSupabase = isSupabaseConfigured();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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
          name: demoUser.name,
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
              localStorage.removeItem('pending_email_confirmation');
            }
            
            const userData = {
              id: data.user.id,
              email: data.user.email,
              name: data.profile?.name || data.user.email.split('@')[0],
              plan: data.profile?.plan || 'free',
              role: data.profile?.plan === 'pro' ? 'admin' : 'user',
              loginTime: new Date().toISOString()
            };
            localStorage.setItem('b2b_auth', JSON.stringify(userData));
            onLogin(userData);
          }
        } else {
          // Registro
          if (passwordLimpio.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            setLoading(false);
            return;
          }

          const { data, error, needsConfirmation } = await authService.signUp(emailLimpio, passwordLimpio, name.trim());
          
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
            } else {
              setSuccess('¡Cuenta creada exitosamente!');
              setPendingEmail('');
              localStorage.removeItem('pending_email_confirmation');
            }
            setMode('login');
            setPassword('');
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
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setSuccess('');
    // No limpiar pendingEmail al cambiar de modo para mantener el estado
  };

  // Limpiar email pendiente cuando el usuario inicia sesión exitosamente
  useEffect(() => {
    // Verificar si el usuario confirmó su email al iniciar sesión
    if (mode === 'login' && pendingEmail) {
      // El usuario puede haber confirmado su email, pero no lo verificamos aquí
      // Se limpiará cuando inicie sesión exitosamente
    }
  }, [mode, pendingEmail]);

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
          localStorage.removeItem('pending_email_confirmation');
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
              <p>Encuentra empresas, valida contactos y automatiza tu prospección B2B.</p>
            </div>

            {/* Mostrar info de modo demo (siempre disponible) */}
            <div className="demo-info">
              <h4>🔑 Credenciales de Demo</h4>
              <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '12px' }}>
                {useSupabase 
                  ? 'También puedes usar estas credenciales para acceso rápido sin crear cuenta'
                  : 'Usa estas credenciales para acceder'}
              </p>
              <div className="demo-credentials">
                <div className="demo-user">
                  <span className="demo-badge pro">PRO</span>
                  <code>admin@dotasolutions.com</code>
                  <code>Dota2024!</code>
                </div>
                <div className="demo-user">
                  <span className="demo-badge free">FREE</span>
                  <code>user@dotasolutions.com</code>
                  <code>User2024!</code>
                </div>
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
              <p>{mode === 'login' ? 'Ingresa tus credenciales para acceder' : 'Completa el formulario para registrarte'}</p>
            </div>

            {/* Tabs para cambiar entre login y registro */}
            {useSupabase && (
              <div className="auth-tabs">
                <button 
                  className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => setMode('login')}
                  type="button"
                >
                  Iniciar Sesión
                </button>
                <button 
                  className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => setMode('register')}
                  type="button"
                >
                  Registrarse
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="success-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <span>{success}</span>
                    {pendingEmail && mode === 'login' && (
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendingEmail}
                        style={{
                          marginTop: '8px',
                          padding: '8px 16px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          color: 'white',
                          cursor: resendingEmail ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          opacity: resendingEmail ? 0.6 : 1,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!resendingEmail) {
                            e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                      >
                        {resendingEmail ? 'Reenviando...' : 'Reenviar email de confirmación'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div className="form-group">
                  <label htmlFor="name">Nombre</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      required={mode === 'register'}
                      autoComplete="name"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    disabled={loading}
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

              {mode === 'login' && pendingEmail && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#ffc107',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    ⚠️ Tienes un email pendiente de confirmación: <strong>{pendingEmail}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255, 193, 7, 0.2)',
                      border: '1px solid rgba(255, 193, 7, 0.4)',
                      borderRadius: '6px',
                      color: '#ffc107',
                      cursor: resendingEmail ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      opacity: resendingEmail ? 0.6 : 1
                    }}
                  >
                    {resendingEmail ? 'Reenviando...' : 'Reenviar email de confirmación'}
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                className={`login-button ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>{mode === 'login' ? 'Verificando...' : 'Creando cuenta...'}</span>
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

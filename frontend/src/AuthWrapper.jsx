import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AppB2B from './App_B2B';
import UserProfile from './components/UserProfile';
import Navbar from './components/Navbar';
import ProBackground from './components/ProBackground';
import ProWelcome from './components/ProWelcome';
import { supabase, authService, userService } from './lib/supabase';

// Contexto de autenticación
const AuthContext = createContext(null);

// Hook para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

// Credenciales de demo (fallback cuando Supabase no está configurado)
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

// Verificar sesión local (modo demo)
const checkLocalAuth = () => {
  try {
    const authData = localStorage.getItem('b2b_auth');
    const token = localStorage.getItem('b2b_token');
    
    if (authData && token) {
      const userData = JSON.parse(authData);
      const loginTime = new Date(userData.loginTime);
      const now = new Date();
      const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        return userData;
      }
      localStorage.removeItem('b2b_auth');
      localStorage.removeItem('b2b_token');
    }
  } catch (error) {
    console.error('Error verificando autenticación local:', error);
    localStorage.removeItem('b2b_auth');
    localStorage.removeItem('b2b_token');
  }
  return null;
};

function AuthWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProWelcome, setShowProWelcome] = useState(false);
  const [useSupabase] = useState(isSupabaseConfigured());

  useEffect(() => {
    const initAuth = async () => {
      // Primero verificar si hay sesión demo (siempre disponible)
      const demoUserData = checkLocalAuth();
      if (demoUserData) {
        // Verificar si es un usuario demo válido
        const isDemoUser = DEMO_USERS.some(u => u.email === demoUserData.email);
        if (isDemoUser) {
          setUser(demoUserData);
          setLoading(false);
          return;
        }
      }

      if (useSupabase) {
        // Modo Supabase
        try {
          // Manejar callback de confirmación de email
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const type = hashParams.get('type');
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (type === 'signup' && accessToken && refreshToken) {
            // El usuario viene de confirmar su email
            const { data: { session }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (session?.user) {
              // Limpiar la URL
              window.history.replaceState({}, document.title, window.location.pathname);
              
              const { data: profile, error: profileError } = await userService.getProfile(session.user.id);
              
              if (!profileError && profile) {
                const userData = {
                  id: session.user.id,
                  email: session.user.email,
                  phone: profile?.phone || '',
                  plan: profile?.plan || 'free',
                  role: profile?.plan === 'pro' ? 'admin' : 'user',
                  ...profile
                };
                setUser(userData);
                
                if (userData.plan === 'pro') {
                  setShowProWelcome(true);
                }
                
                setLoading(false);
                return;
              }
            }
          }
          
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const { data: profile, error: profileError } = await userService.getProfile(session.user.id);
            
            // CRÍTICO: Si no hay perfil, el usuario fue eliminado - cerrar sesión inmediatamente
            if (profileError || !profile) {
              console.warn('[AuthWrapper] Usuario sin perfil detectado - cerrando sesión');
              await supabase.auth.signOut();
              localStorage.removeItem('b2b_auth');
              localStorage.removeItem('b2b_token');
              sessionStorage.clear();
              setUser(null);
              setLoading(false);
              return;
            }
            
            setUser({
              id: session.user.id,
              email: session.user.email,
              phone: profile?.phone || '',
              plan: profile?.plan || 'free',
              role: profile?.plan === 'pro' ? 'admin' : 'user',
              ...profile
            });
          }
        } catch (error) {
          console.error('Error inicializando auth con Supabase:', error);
          // En caso de error, cerrar sesión por seguridad
          await supabase.auth.signOut();
          localStorage.removeItem('b2b_auth');
          localStorage.removeItem('b2b_token');
          sessionStorage.clear();
        }

        // Listener para cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const { data: profile, error: profileError } = await userService.getProfile(session.user.id);
              
              // CRÍTICO: Si no hay perfil, el usuario fue eliminado - cerrar sesión inmediatamente
              if (profileError || !profile) {
                console.warn('[AuthWrapper] Usuario sin perfil detectado en SIGNED_IN - cerrando sesión');
                await supabase.auth.signOut();
                localStorage.removeItem('b2b_auth');
                localStorage.removeItem('b2b_token');
                sessionStorage.clear();
                setUser(null);
                return;
              }
              
              const userData = {
                id: session.user.id,
                email: session.user.email,
                phone: profile?.phone || '',
                plan: profile?.plan || 'free',
                role: profile?.plan === 'pro' ? 'admin' : 'user',
                ...profile
              };
              setUser(userData);
              
              if (userData.plan === 'pro') {
                setShowProWelcome(true);
              }
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
            }
          }
        );

        setLoading(false);
        return () => subscription.unsubscribe();
      } else {
        // Modo demo (sin Supabase)
        const userData = checkLocalAuth();
        setUser(userData);
        setLoading(false);
      }
    };

    initAuth();
  }, [useSupabase]);

  // Login con Supabase
  const handleSupabaseLogin = async (email, password) => {
    const { data, error } = await authService.signIn(email, password);
    
    if (error) {
      throw error;
    }

    const userData = {
      id: data.user.id,
      email: data.user.email,
      phone: data.profile?.phone || '',
      plan: data.profile?.plan || 'free',
      role: data.profile?.plan === 'pro' ? 'admin' : 'user',
      ...data.profile
    };

    setUser(userData);
    
    if (userData.plan === 'pro') {
      setShowProWelcome(true);
    }

    return userData;
  };

  // Registro con Supabase
  const handleSupabaseSignUp = async (email, password, name) => {
    const { data, error } = await authService.signUp(email, password, name);
    
    if (error) {
      throw error;
    }

    return { 
      success: true, 
      message: 'Cuenta creada. Revisa tu email para confirmar.',
      needsConfirmation: true
    };
  };

  // Login demo (siempre disponible, incluso con Supabase)
  const handleDemoLogin = (userData) => {
    // Verificar si es un usuario demo válido
    const isDemoUser = DEMO_USERS.some(u => u.email === userData.email);
    if (isDemoUser) {
      // Guardar en localStorage para persistencia
      localStorage.setItem('b2b_auth', JSON.stringify(userData));
      localStorage.setItem('b2b_token', 'demo_token_' + Date.now());
    }
    
    if (userData.plan === 'pro') {
      setShowProWelcome(true);
    }
    setUser(userData);
  };

  const handleProWelcomeComplete = () => {
    setShowProWelcome(false);
  };

  // Logout - Instantáneo
  const handleLogout = () => {
    // Limpiar todo inmediatamente
    localStorage.removeItem('b2b_auth');
    localStorage.removeItem('b2b_token');
    localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
    sessionStorage.clear();
    
    // Logout de Supabase en background (no esperamos)
    if (useSupabase) {
      authService.signOut().catch(() => {});
    }
    
    // Redirigir inmediatamente
    window.location.replace('/');
  };

  // Actualizar plan del usuario
  const updateUserPlan = async (plan) => {
    if (useSupabase && user?.id) {
      await userService.updateProfile(user.id, { plan });
      setUser(prev => ({ ...prev, plan }));
    }
  };

  // Pantalla de carga
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a1a 50%, #0a0a0f 100%)',
        color: 'white',
        fontFamily: 'Inter, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(255, 105, 180, 0.2)',
            borderTopColor: '#FF69B4',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ opacity: 0.7 }}>Verificando sesión...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Valor del contexto
  const authValue = {
    user,
    isAuthenticated: !!user,
    isPro: user?.plan === 'pro',
    useSupabase,
    login: useSupabase ? handleSupabaseLogin : handleDemoLogin,
    signUp: useSupabase ? handleSupabaseSignUp : null,
    logout: handleLogout,
    updateUserPlan,
    demoUsers: DEMO_USERS // Siempre disponible
  };

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        {showProWelcome && <ProWelcome onComplete={handleProWelcomeComplete} />}
        {user ? (
          <Routes>
            <Route path="/profile" element={
              <div className={`app ${user?.plan === 'pro' ? 'pro-theme' : ''}`}>
                {user?.plan === 'pro' && <ProBackground />}
                <Navbar />
                <main className="main-content">
                  <UserProfile />
                </main>
              </div>
            } />
            <Route path="/*" element={<AppB2B />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/*" element={<Login onLogin={handleDemoLogin} />} />
          </Routes>
        )}
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default AuthWrapper;

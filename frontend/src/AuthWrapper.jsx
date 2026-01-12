import React, { useState, useEffect, createContext, useContext, lazy, Suspense, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, authService, userService, adminService } from './lib/supabase';
import { authStorage, storage } from './utils/storage';
import { handleError } from './utils/errorHandler';

// Lazy loading de componentes pesados
const Login = lazy(() => import('./components/Login'));
const AppB2B = lazy(() => import('./App_B2B'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const Navbar = lazy(() => import('./components/Navbar'));
const ProBackground = lazy(() => import('./components/ProBackground'));
const BackButton = lazy(() => import('./components/BackButton'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./components/admin/AdminUsers'));
const AdminUserDetail = lazy(() => import('./components/admin/AdminUserDetail'));
const AdminPromoCodes = lazy(() => import('./components/admin/AdminPromoCodes'));

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

// Verificar sesión local (modo demo) - usando servicio centralizado
const checkLocalAuth = () => {
  try {
    const authData = authStorage.getAuth();
    const token = authStorage.getToken();
    
    if (authData && token) {
      const loginTime = new Date(authData.loginTime);
      const now = new Date();
      const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        return authData;
      }
      authStorage.removeAuth();
      authStorage.removeToken();
    }
  } catch (error) {
    handleError(error, 'AuthWrapper - checkLocalAuth');
    authStorage.removeAuth();
    authStorage.removeToken();
  }
  return null;
};

function AuthWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // useSupabase es constante durante la ejecución, no necesita memoización
  const useSupabase = isSupabaseConfigured();

  useEffect(() => {
    const initAuth = async () => {
      // Safety timeout to prevent infinite loading
      const safetyTimeout = setTimeout(() => {
        if (loading) {
          console.warn('⚠️ Auth check timed out - forcing loading completion');
          setLoading(false);
          // Only show error if we're still stuck
          handleError(new Error('Session verification timed out'), 'AuthWrapper - timeout');
        }
      }, 7000); // 7 seconds max wait

      try {
        console.log('🔄 Starting auth check...');
        
        // Primero verificar si hay sesión demo (siempre disponible)
        const demoUserData = checkLocalAuth();
        if (demoUserData) {
          // Verificar si es un usuario demo válido
          const isDemoUser = DEMO_USERS.some(u => u.email === demoUserData.email);
          if (isDemoUser) {
            console.log('✅ Demo session found');
            setUser(demoUserData);
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
              console.log('📧 Email confirmation detected');
              // El usuario viene de confirmar su email
              // NO loguear automáticamente, solo limpiar la URL y redirigir a login
              window.history.replaceState({}, document.title, window.location.pathname);
              
              // Limpiar email pendiente de confirmación ya que el usuario acaba de confirmar
              authStorage.removePendingEmail();
              authStorage.removeDismissedPendingEmail();
              
              // Guardar un flag para mostrar mensaje de éxito en Login
              storage.setItem('email_confirmed', 'true');
              
              // NO establecer sesión, dejar que el usuario inicie sesión manualmente
              return;
            }
            
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) throw sessionError;
            
            if (session?.user) {
              console.log('👤 Supabase session found', session.user.id);
              const { data: profile, error: profileError } = await userService.getProfile(session.user.id);
              
              // CRÍTICO: Si no hay perfil, el usuario fue eliminado - cerrar sesión inmediatamente
              if (profileError || !profile) {
                console.error('❌ User has session but no profile - forcing logout');
                await supabase.auth.signOut();
                authStorage.clearAll();
                sessionStorage.clear();
                setUser(null);
                return;
              }
              
              const userData = authService.buildUserData(session.user, profile);
              setUser(userData);
            } else {
              console.log('⚪ No active session');
            }
          } catch (error) {
            console.error('Authentication error:', error);
            // En caso de error, cerrar sesión por seguridad
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.warn('Error signing out after auth failure:', signOutError);
            }
            authStorage.clearAll();
            sessionStorage.clear();
          }

          // Listener para cambios de autenticación
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log(`Auth event: ${event}`);
              if (event === 'SIGNED_IN' && session?.user) {
                try {
                  const { data: profile, error: profileError } = await userService.getProfile(session.user.id);
                  
                  // CRÍTICO: Si no hay perfil, el usuario fue eliminado - cerrar sesión inmediatamente
                  if (profileError || !profile) {
                    await supabase.auth.signOut();
                    authStorage.clearAll();
                    sessionStorage.clear();
                    setUser(null);
                    return;
                  }
                  
                  const userData = authService.buildUserData(session.user, profile);
                  setUser(userData);
                } catch (err) {
                  console.error('Error in auth state change:', err);
                }
              } else if (event === 'SIGNED_OUT') {
                setUser(null);
              }
            }
          );

          // Return listener cleanup
          // NOTE: We're not returning it from useEffect because we need to clear loading first
          // This creates a small leak but it's acceptable for the root component
        } else {
          // Modo demo (sin Supabase)
          console.log('⚠️ Supabase not configured - Demo mode only');
          const userData = checkLocalAuth();
          setUser(userData);
        }
      } catch (fatalError) {
        console.error('Fatal auth error:', fatalError);
        setUser(null);
      } finally {
        // ALWAYS clear loading state
        clearTimeout(safetyTimeout);
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

    const userData = authService.buildUserData(data.user, data.profile);
    setUser(userData);

    return userData;
  };

  // Registro con Supabase (memoizado)
  const handleSupabaseSignUp = useCallback(async (email, password, name) => {
    const { data, error } = await authService.signUp(email, password, name);
    
    if (error) {
      throw error;
    }

    return { 
      success: true, 
      message: 'Cuenta creada. Revisa tu email para confirmar.',
      needsConfirmation: true
    };
  }, []);

  // Login demo (siempre disponible, incluso con Supabase) - memoizado
  const handleDemoLogin = useCallback((userData) => {
    // Verificar si es un usuario demo válido
    const isDemoUser = DEMO_USERS.some(u => u.email === userData.email);
    if (isDemoUser) {
      // Guardar usando servicio centralizado
      authStorage.setAuth(userData);
      authStorage.setToken('demo_token_' + Date.now());
    }
    
    setUser(userData);
  }, []);


  // Logout - Instantáneo (memoizado)
  const handleLogout = useCallback(() => {
    console.log('handleLogout ejecutándose');
    try {
    // Limpiar todo inmediatamente usando servicio centralizado
    authStorage.clearAll();
    sessionStorage.clear();
      localStorage.clear();
    
    // Logout de Supabase en background (no esperamos)
    if (useSupabase) {
        authService.signOut().catch((err) => {
          console.error('Error en signOut:', err);
        });
    }
      
      // Limpiar estado del usuario
      setUser(null);
    
    // Redirigir inmediatamente
      window.location.href = '/';
    } catch (error) {
      console.error('Error en handleLogout:', error);
      // Aún así, intentar redirigir
      window.location.href = '/';
    }
  }, [useSupabase]);

  // Actualizar plan del usuario (memoizado)
  const updateUserPlan = useCallback(async (plan) => {
    if (useSupabase && user?.id) {
      await userService.updateProfile(user.id, { plan });
      setUser(prev => ({ ...prev, plan }));
    }
  }, [useSupabase, user?.id]);

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
            borderTopColor: '#81D4FA',
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

  // Valor del contexto - simplificado sin useMemo para evitar problemas con dependencias
  // Las funciones ya están memoizadas con useCallback, así que el objeto se recrea pero las funciones son estables
  const loginFn = useSupabase ? handleSupabaseLogin : handleDemoLogin;
  const signUpFn = useSupabase ? handleSupabaseSignUp : null;
  
  const authValue = {
    user,
    isAuthenticated: !!user,
    isPro: user?.plan === 'pro',
    useSupabase,
    login: loginFn,
    signUp: signUpFn,
    logout: handleLogout,
    updateUserPlan,
    demoUsers: DEMO_USERS // Siempre disponible
  };

  // Componente de carga para Suspense
  const LoadingFallback = () => (
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
          borderTopColor: '#81D4FA',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ opacity: 0.7 }}>Cargando...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
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
            <Route path="/backoffice" element={
              <div className="app">
                <AdminLayout />
              </div>
            }>
                <Route index element={<Navigate to="/backoffice/users" replace />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:id" element={<AdminUserDetail />} />
                <Route path="promo-codes" element={<AdminPromoCodes />} />
              </Route>
            <Route path="/*" element={<AppB2B />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/*" element={<Login onLogin={handleDemoLogin} />} />
          </Routes>
        )}
        </Suspense>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default AuthWrapper;

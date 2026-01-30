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
const LandingPage = lazy(() => import('./components/LandingPage'));
const ApiUsageDashboard = lazy(() => import('./components/admin/ApiUsageDashboard'));
const NotFound = lazy(() => import('./components/NotFound'));
const OAuthCallback = lazy(() => import('./components/OAuthCallback'));
const PaymentPage = lazy(() => import('./components/PaymentPage'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage'));
const PaymentSuccessPage = lazy(() => import('./components/PaymentSuccessPage'));
import LandingSkeleton from './components/LandingSkeleton'; // Eager load for instant feedback

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
    plan: 'pro'
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
            // NO loguear automáticamente, solo limpiar la URL y redirigir a login
            window.history.replaceState({}, document.title, window.location.pathname);

            // Limpiar email pendiente de confirmación ya que el usuario acaba de confirmar
            authStorage.removePendingEmail();
            authStorage.removeDismissedPendingEmail();

            // Guardar un flag para mostrar mensaje de éxito en Login
            storage.setItem('email_confirmed', 'true');

            // NO establecer sesión, dejar que el usuario inicie sesión manualmente
            setLoading(false);
            return;
          }

          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const { data: profile, error: profileError } = await userService.getProfile(session.user.id);

            // CRÍTICO: Si no hay perfil, el usuario fue eliminado - cerrar sesión inmediatamente
            if (profileError || !profile) {
              handleError(new Error('Usuario sin perfil detectado'), 'AuthWrapper - initAuth');
              await supabase.auth.signOut();
              authStorage.clearAll();
              sessionStorage.clear();
              setUser(null);
              setLoading(false);
              return;
            }

            const userData = authService.buildUserData(session.user, profile);
            setUser(userData);
          }
        } catch (error) {
          handleError(error, 'AuthWrapper - initAuth');
          // En caso de error, cerrar sesión por seguridad
          try {
            await supabase.auth.signOut();
            authStorage.clearAll();
            sessionStorage.clear();
          } catch (signOutError) {
            console.error('Error during signOut on init failure:', signOutError);
          }
          setLoading(false);
          return;
        }

        // Listener para cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const { data: profile, error: profileError } = await userService.getProfile(session.user.id);

              // CRÍTICO: Si no hay perfil, el usuario fue eliminado - cerrar sesión inmediatamente
              if (profileError || !profile) {
                handleError(new Error('Usuario sin perfil detectado'), 'AuthWrapper - SIGNED_IN');
                await supabase.auth.signOut();
                authStorage.clearAll();
                sessionStorage.clear();
                setUser(null);
                return;
              }

              const userData = authService.buildUserData(session.user, profile);
              setUser(userData);
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

    // Seguridad: Timeout de 10 segundos para la carga inicial
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization timed out, forcing loading=false');
        setLoading(false);
      }
    }, 10000);

    initAuth();

    return () => {
      clearTimeout(safetyTimeout);
    };
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



  // Pantalla de carga (no mostrar en landing para LCP rápido)
  const isLanding = window.location.pathname === '/landing';

  if (loading && !isLanding) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white',
        fontFamily: 'Inter, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#ffffff',
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
    isPro: true,
    useSupabase,
    login: loginFn,
    signUp: signUpFn,
    logout: handleLogout,
    demoUsers: DEMO_USERS // Siempre disponible
  };

  // Componente de carga para Suspense
  const LoadingFallback = () => {
    // Show Skeleton only for landing page
    if (window.location.pathname === '/landing') {
      return <LandingSkeleton />;
    }

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white',
        fontFamily: 'Inter, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#ffffff',
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
  };

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* PUBLIC ROUTES (Accessible to everyone) */}
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/auth/:provider/callback" element={<OAuthCallback />} />

            {/* AUTHENTICATED ROUTES */}
            {user ? (
              <>
                <Route path="/profile" element={
                  <div className="app pro-theme">
                    <ProBackground />
                    <Navbar />
                    <main className="main-content">
                      <UserProfile />
                    </main>
                  </div>
                } />
                <Route path="/backoffice" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/backoffice/users" replace />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="users/:id" element={<AdminUserDetail />} />
                  <Route path="api-usage" element={<ApiUsageDashboard />} />
                </Route>
                {/* Main App Route - Only matches root */}
                <Route path="/" element={<AppB2B />} />
              </>
            ) : (
              /* GUEST ROUTES */
              <>
                <Route path="/" element={<Login onLogin={handleDemoLogin} />} />
              </>
            )}

            {/* 404 Route - Catch all unknown */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default AuthWrapper;

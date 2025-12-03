import React, { useState, useEffect, createContext, useContext } from 'react';
import Login from './components/Login';
import AppB2B from './App_B2B';

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

// Verificar si hay una sesión válida
const checkAuth = () => {
  try {
    const authData = localStorage.getItem('b2b_auth');
    const token = localStorage.getItem('b2b_token');
    
    if (authData && token) {
      const userData = JSON.parse(authData);
      // Verificar que la sesión no haya expirado (24 horas)
      const loginTime = new Date(userData.loginTime);
      const now = new Date();
      const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        return userData;
      }
      // Sesión expirada, limpiar
      localStorage.removeItem('b2b_auth');
      localStorage.removeItem('b2b_token');
    }
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    localStorage.removeItem('b2b_auth');
    localStorage.removeItem('b2b_token');
  }
  return null;
};

function AuthWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar autenticación al cargar
    const userData = checkAuth();
    setUser(userData);
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('b2b_auth');
    localStorage.removeItem('b2b_token');
    setUser(null);
  };

  // Mostrar pantalla de carga mientras verificamos la autenticación
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f1a',
        color: 'white',
        fontFamily: 'Inter, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(102, 126, 234, 0.2)',
            borderTopColor: '#667eea',
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
    login: handleLogin,
    logout: handleLogout
  };

  return (
    <AuthContext.Provider value={authValue}>
      {user ? <AppB2B /> : <Login onLogin={handleLogin} />}
    </AuthContext.Provider>
  );
}

export default AuthWrapper;


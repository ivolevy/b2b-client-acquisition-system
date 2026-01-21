import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthWrapper';
import { adminService } from '../../lib/supabase';
import './AdminLayout.css';

function AdminLayout() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    setLoading(true);
    
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Primero verificar el role del usuario del contexto (más rápido)
    if (user.role === 'admin') {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    // Si no tiene role admin en el contexto, verificar en la base de datos
    try {
      // Agregar timeout para evitar que se quede colgado
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout verificando admin')), 10000);
      });
      
      const adminStatus = await Promise.race([
        adminService.isAdmin(),
        timeoutPromise
      ]);
      
      setIsAdmin(adminStatus);
      
      // Si es admin en la BD pero no en el contexto, recargar la página para actualizar
      if (adminStatus && user.role !== 'admin') {
        console.log('Usuario es admin en BD pero no en contexto. Recargando...');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      // Si hay error, asumir que no es admin para evitar pantalla gris
    } finally {
      setLoading(false);
    }
  };

  // Check admin status logic remains the same...
  
  if (loading) {
    return (
      <div className="admin-loading-screen">
        <div className="spinner"></div>
        <p>Verificando permisos...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="admin-access-denied-screen">
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para acceder al panel de administración.</p>
        <button onClick={() => window.history.back()}>Volver</button>
      </div>
    );
  }

  const isUsersPage = location.pathname.includes('/users');
  const isApiUsagePage = location.pathname.includes('/api-usage');

  return (
    <div className="backoffice-layout">
      <aside className="backoffice-sidebar">
        <div className="backoffice-brand">
          <h2>Backoffice</h2>
        </div>
        
        <nav className="backoffice-nav">
          <button 
            className={`backoffice-nav-item ${isUsersPage ? 'active' : ''}`}
            onClick={() => navigate('/backoffice/users')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Usuarios
          </button>
          
          <button 
            className={`backoffice-nav-item ${isApiUsagePage ? 'active' : ''}`}
            onClick={() => navigate('/backoffice/api-usage')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10"></path>
              <path d="M12 20V4"></path>
              <path d="M6 20v-6"></path>
            </svg>
            Métricas API
          </button>
        </nav>

        <div className="backoffice-sidebar-footer">
          <button 
            className="backoffice-exit-btn"
            onClick={() => navigate('/')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Volver al Sistema
          </button>
        </div>
      </aside>

      <main className="backoffice-main">
        <div className="backoffice-content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;


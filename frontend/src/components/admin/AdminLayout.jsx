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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

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
    <div className={`backoffice-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Dynamic Overlay */}
      {isSidebarOpen && <div className="backoffice-overlay" onClick={closeSidebar}></div>}

      {/* Mobile Top Header */}
      <header className="backoffice-mobile-header">
        <button className="hamburger-menu" onClick={toggleSidebar} aria-label="Toggle Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isSidebarOpen ? (
              <path d="M18 6L6 18M6 6l12 12"></path>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </>
            )}
          </svg>
        </button>
        <div className="mobile-brand">Backoffice</div>
      </header>

      <aside className={`backoffice-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="backoffice-brand">
          <h2 className="brand-text">Backoffice</h2>
          <button className="sidebar-close-btn" onClick={closeSidebar}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <nav className="backoffice-nav">
          <button 
            className={`backoffice-nav-item ${isUsersPage ? 'active' : ''}`}
            onClick={() => {
              navigate('/backoffice/users');
              closeSidebar();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Usuarios</span>
          </button>

          <button 
            className={`backoffice-nav-item ${location.pathname.includes('/email') ? 'active' : ''}`}
            onClick={() => {
              navigate('/backoffice/email');
              closeSidebar();
            }}
          >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span>Email Marketing</span>
          </button>

          <button 
            className={`backoffice-nav-item ${location.pathname.includes('/whatsapp') ? 'active' : ''}`}
            onClick={() => {
              navigate('/backoffice/whatsapp');
              closeSidebar();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>WhatsApp Marketing</span>
          </button>
          
          <button 
            className={`backoffice-nav-item ${isApiUsagePage ? 'active' : ''}`}
            onClick={() => {
              navigate('/backoffice/api-usage');
              closeSidebar();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10"></path>
              <path d="M12 20V4"></path>
              <path d="M6 20v-6"></path>
            </svg>
            <span>Métricas API</span>
          </button>

          <button 
            className={`backoffice-nav-item ${location.pathname.includes('/financials') ? 'active' : ''}`}
            onClick={() => {
              navigate('/backoffice/financials');
              closeSidebar();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span>Finanzas</span>
          </button>
        </nav>

        <div className="backoffice-sidebar-footer">
          <button 
            className="backoffice-exit-btn"
            onClick={() => {
              navigate('/');
              closeSidebar();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Volver al Sistema</span>
          </button>
        </div>
      </aside>

      <main className="backoffice-main">
        <div className={`backoffice-content-wrapper ${isApiUsagePage ? 'dark-theme-wrapper' : ''}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;


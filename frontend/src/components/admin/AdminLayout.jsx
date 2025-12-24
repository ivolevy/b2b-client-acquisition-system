import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthWrapper';
import { adminService } from '../../lib/supabase';
import ProBackground from '../ProBackground';
import Navbar from '../Navbar';
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
      const adminStatus = await adminService.isAdmin();
      setIsAdmin(adminStatus);
      
      // Si es admin en la BD pero no en el contexto, recargar la página para actualizar
      if (adminStatus && user.role !== 'admin') {
        console.log('Usuario es admin en BD pero no en contexto. Recargando...');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <ProBackground />
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Verificando permisos...</p>
        </div>
      </>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return (
      <>
        <ProBackground />
        <div className="admin-access-denied">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder al panel de administración.</p>
          <button onClick={() => window.history.back()}>Volver</button>
        </div>
      </>
    );
  }

  const isUsersPage = location.pathname.includes('/users');
  const isPromoCodesPage = location.pathname.includes('/promo-codes');

  return (
    <>
      <ProBackground />
      <Navbar />
      <main className="main-content">
        <div className="admin-header-container">
          <div className="admin-header-content">
            <button 
              className="admin-back-btn"
              onClick={() => navigate('/')}
              title="Volver al inicio"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h2 className="admin-header-title">Panel de Administración</h2>
          </div>
          {(isUsersPage || isPromoCodesPage) && (
            <div className="admin-nav">
              <button 
                className={`admin-nav-btn ${isUsersPage ? 'active' : ''}`}
                onClick={() => navigate('/backoffice/users')}
              >
                Usuarios
              </button>
              <button 
                className={`admin-nav-btn ${isPromoCodesPage ? 'active' : ''}`}
                onClick={() => navigate('/backoffice/promo-codes')}
              >
                Códigos Promocionales
              </button>
            </div>
          )}
        </div>
        <Outlet />
      </main>
    </>
  );
}

export default AdminLayout;


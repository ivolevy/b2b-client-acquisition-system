import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../AuthWrapper';
import { adminService } from '../../lib/supabase';
import ProBackground from '../ProBackground';
import './AdminLayout.css';

function AdminLayout() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="admin-layout">
        <ProBackground />
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="admin-layout">
        <ProBackground />
        <div className="admin-access-denied">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder al panel de administración.</p>
          <button onClick={() => window.history.back()}>Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <ProBackground />
      <div className="admin-container">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;


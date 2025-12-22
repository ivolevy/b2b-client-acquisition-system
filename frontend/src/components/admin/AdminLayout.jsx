import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../AuthWrapper';
import { adminService } from '../../lib/supabase';
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

    try {
      const adminStatus = await adminService.isAdmin();
      setIsAdmin(adminStatus);
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
      <div className="admin-container">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;


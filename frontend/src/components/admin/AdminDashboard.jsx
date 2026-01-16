import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import './AdminLayout.css';

function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard">
      <div className="admin-welcome">
        <h1>Panel de Administración</h1>
        <p>Selecciona una opción para comenzar</p>
      </div>

      {/* Menu Grid */}
      <div className="admin-menu-grid">
        <div 
          className="admin-menu-card"
          onClick={() => navigate('/backoffice/users')}
        >
          <div className="menu-card-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2>Usuarios</h2>
          <p>Gestiona usuarios, edita perfiles y administra permisos</p>
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;

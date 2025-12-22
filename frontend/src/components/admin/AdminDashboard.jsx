import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import './AdminLayout.css';

function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <div className="admin-nav">
          <button 
            className="admin-nav-btn active"
            onClick={() => navigate('/backoffice')}
          >
            Dashboard
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/backoffice/users')}
          >
            Usuarios
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/backoffice/promo-codes')}
          >
            Códigos Promocionales
          </button>
        </div>
      </div>

      <div className="admin-menu-grid">
        <div 
          className="admin-menu-card"
          onClick={() => navigate('/backoffice/users')}
        >
          <h2>Usuarios</h2>
          <p>Gestiona usuarios, edita perfiles y administra permisos</p>
        </div>

        <div 
          className="admin-menu-card"
          onClick={() => navigate('/backoffice/promo-codes')}
        >
          <h2>Códigos Promocionales</h2>
          <p>Crea y gestiona códigos promocionales para suscripciones</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;


import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard">
      <h1>Panel de Administración</h1>
      
      <div className="admin-menu">
        <button 
          className="admin-menu-card"
          onClick={() => navigate('/backoffice/users')}
        >
          <h2>Usuarios</h2>
          <p>Gestionar usuarios del sistema</p>
        </button>
        
        <button 
          className="admin-menu-card"
          onClick={() => navigate('/backoffice/promo-codes')}
        >
          <h2>Códigos Promocionales</h2>
          <p>Crear y gestionar códigos promo</p>
        </button>
      </div>
    </div>
  );
}

export default AdminDashboard;

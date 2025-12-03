import React, { useState } from 'react';
import './Navbar.css';
import HelpModal from './HelpModal';
import { useAuth } from '../AuthWrapper';

function Navbar() {
  const [showHelp, setShowHelp] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      logout();
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1>B2B Client Acquisition System</h1>
          </div>
          
          {/* Sección de usuario */}
          <div className="navbar-user">
            {user && (
              <>
                <div className="user-info">
                  <div className="user-avatar">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="user-details">
                    <span className="user-name">{user.name || 'Usuario'}</span>
                    <span className="user-email">{user.email}</span>
                  </div>
                </div>
                <button 
                  className="logout-btn"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span>Salir</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Botón de ayuda flotante */}
      <button
        className="floating-help-btn"
        onClick={() => setShowHelp(true)}
        title="Ayuda"
      >
        Ayuda
      </button>
    </>
  );
}

export default Navbar;


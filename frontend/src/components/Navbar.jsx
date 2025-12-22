import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';
import HelpModal from './HelpModal';
import { useAuth } from '../AuthWrapper';

function Navbar({ onNavigateToProfile }) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { user, logout } = useAuth();

  const handleLogoutClick = () => {
    setShowUserMenu(false);
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    // Cerrar sesión inmediatamente - la función redirige sola
    logout();
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
                <div 
                  className="user-info"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="user-details">
                    <div className="user-name-row">
                      <span className="user-name">{user.name || user.email || 'Usuario'}</span>
                      {user.plan === 'pro' && (
                        <span className="pro-badge-small">PRO</span>
                      )}
                    </div>
                    <span className="user-email">{user.email}</span>
                  </div>
                  <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </div>

                {/* Menú desplegable */}
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-plan-row">
                        <span className={`dropdown-plan ${user.plan}`}>
                          {user.plan === 'pro' ? '⚡ Plan PRO' : 'Plan Free'}
                        </span>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    {user.role === 'admin' && (
                      <>
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate('/backoffice');
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <line x1="3" y1="9" x2="21" y2="9"/>
                            <line x1="9" y1="21" x2="9" y2="9"/>
                          </svg>
                          Panel Admin
                        </button>
                        <div className="dropdown-divider"></div>
                      </>
                    )}
                    <button 
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/profile');
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      Mi Perfil
                    </button>
                    <button 
                      className="dropdown-item"
                      onClick={handleLogoutClick}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16,17 21,12 16,7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                )}

                {/* Overlay para cerrar menú */}
                {showUserMenu && (
                  <div 
                    className="dropdown-overlay"
                    onClick={() => setShowUserMenu(false)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Modal de confirmación de logout */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <div className="logout-modal-header">
              <div className="logout-modal-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <h3>Cerrar sesión</h3>
            </div>
            
            <div className="logout-modal-body">
              <p>¿Estás seguro de que deseas cerrar sesión?</p>
              <p className="logout-hint">Tendrás que volver a iniciar sesión para acceder a tu cuenta.</p>
            </div>
            
            <div className="logout-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="logout-confirm-btn"
                onClick={handleLogoutConfirm}
              >
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

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

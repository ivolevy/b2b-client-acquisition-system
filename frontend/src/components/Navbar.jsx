import React, { useState } from 'react';
import './Navbar.css';
import HelpModal from './HelpModal';
import { useAuth } from '../AuthWrapper';
import { authService, supabase } from '../lib/supabase';

// Token secreto para PRO
const PRO_TOKEN = '3329';

function Navbar() {
  const [showHelp, setShowHelp] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [proTokenInput, setProTokenInput] = useState('');
  const [upgradeError, setUpgradeError] = useState('');
  const { user, logout, useSupabase } = useAuth();

  const handleLogoutClick = () => {
    setShowUserMenu(false);
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    // Cerrar sesión inmediatamente - la función redirige sola
    logout();
  };

  const handleUpgradeToPro = async () => {
    if (proTokenInput.trim() !== PRO_TOKEN) {
      setUpgradeError('Token incorrecto. Verificá e intentá de nuevo.');
      return;
    }

    setUpgradeLoading(true);
    setUpgradeError('');

    try {
      if (useSupabase && user?.id) {
        const { error } = await supabase
          .from('users')
          .update({ plan: 'pro' })
          .eq('id', user.id);

        if (error) {
          setUpgradeError('Error al actualizar: ' + error.message);
          setUpgradeLoading(false);
          return;
        }
      }

      // Actualizar localStorage
      const authData = JSON.parse(localStorage.getItem('b2b_auth') || '{}');
      authData.plan = 'pro';
      localStorage.setItem('b2b_auth', JSON.stringify(authData));

      // Cerrar modal y recargar para aplicar cambios
      setShowUpgradeModal(false);
      setProTokenInput('');
      window.location.reload();
    } catch (error) {
      setUpgradeError('Error al procesar el upgrade');
      setUpgradeLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      return;
    }

    setDeleteLoading(true);
    
    try {
      if (useSupabase) {
        const { success, error } = await authService.deleteAccount();
        if (error) {
          alert('Error al eliminar la cuenta: ' + error.message);
          setDeleteLoading(false);
          return;
        }
      }
      
      // Limpiar todo el localStorage
      localStorage.removeItem('b2b_auth');
      localStorage.removeItem('b2b_token');
      sessionStorage.clear();
      
      // Limpiar cookies de Supabase si existen
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      alert('Tu cuenta ha sido eliminada exitosamente.');
      
      // Redirigir al login
      window.location.replace('/');
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      alert('Error al eliminar la cuenta. Por favor, intenta de nuevo.');
      setDeleteLoading(false);
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
                <div 
                  className="user-info"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="user-avatar">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="user-details">
                    <div className="user-name-row">
                      <span className="user-name">{user.name || 'Usuario'}</span>
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
                      <span className="dropdown-email">{user.email}</span>
                      <div className="dropdown-plan-row">
                        <span className={`dropdown-plan ${user.plan}`}>
                          {user.plan === 'pro' ? '⚡ Plan PRO' : 'Plan Free'}
                        </span>
                        {user.plan !== 'pro' && (
                          <button
                            className="upgrade-btn-small"
                            onClick={() => {
                              setShowUserMenu(false);
                              setShowUpgradeModal(true);
                            }}
                          >
                            Cambiar a PRO
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
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
                    <button 
                      className="dropdown-item danger"
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowDeleteModal(true);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                      Eliminar cuenta
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

      {/* Modal de confirmación para eliminar cuenta */}
      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-header">
              <div className="delete-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h3>Eliminar cuenta</h3>
            </div>
            
            <div className="delete-modal-body">
              <p className="delete-warning">
                <strong>⚠️ Esta acción es irreversible.</strong>
              </p>
              <p>Se eliminarán permanentemente:</p>
              <ul>
                <li>Tu cuenta y perfil</li>
                <li>Historial de búsquedas</li>
                <li>Empresas guardadas</li>
                <li>Templates de email</li>
                <li>Todos tus datos</li>
              </ul>
              
              <div className="confirm-input">
                <label>Escribe <strong>ELIMINAR</strong> para confirmar:</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="ELIMINAR"
                  disabled={deleteLoading}
                />
              </div>
            </div>
            
            <div className="delete-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button 
                className="delete-btn"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'ELIMINAR' || deleteLoading}
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar mi cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para upgrade a PRO */}
      {showUpgradeModal && (
        <div className="upgrade-modal-overlay">
          <div className="upgrade-modal">
            <div className="upgrade-modal-header">
              <div className="upgrade-icon">⚡</div>
              <h3>Activar Plan PRO</h3>
              <p>Desbloquea todas las funcionalidades premium</p>
            </div>
            
            <div className="upgrade-modal-body">
              <div className="pro-features">
                <div className="pro-feature">
                  <span className="feature-check">✓</span>
                  <span>Búsquedas ilimitadas</span>
                </div>
                <div className="pro-feature">
                  <span className="feature-check">✓</span>
                  <span>Guardar historial de búsquedas</span>
                </div>
                <div className="pro-feature">
                  <span className="feature-check">✓</span>
                  <span>Guardar empresas favoritas</span>
                </div>
                <div className="pro-feature">
                  <span className="feature-check">✓</span>
                  <span>Emails ilimitados</span>
                </div>
                <div className="pro-feature">
                  <span className="feature-check">✓</span>
                  <span>Fondo animado premium</span>
                </div>
              </div>

              {upgradeError && (
                <div className="upgrade-error">
                  {upgradeError}
                </div>
              )}
              
              <div className="token-input-group">
                <label>Ingresá tu token PRO:</label>
                <input
                  type="text"
                  value={proTokenInput}
                  onChange={(e) => {
                    setProTokenInput(e.target.value);
                    setUpgradeError('');
                  }}
                  placeholder="Token PRO"
                  disabled={upgradeLoading}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="upgrade-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowUpgradeModal(false);
                  setProTokenInput('');
                  setUpgradeError('');
                }}
                disabled={upgradeLoading}
              >
                Cancelar
              </button>
              <button 
                className="upgrade-btn"
                onClick={handleUpgradeToPro}
                disabled={!proTokenInput.trim() || upgradeLoading}
              >
                {upgradeLoading ? 'Activando...' : '⚡ Activar PRO'}
              </button>
            </div>
          </div>
        </div>
      )}

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

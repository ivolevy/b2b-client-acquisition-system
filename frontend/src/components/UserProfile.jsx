import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthWrapper';
import { authService, supabase } from '../lib/supabase';
import './UserProfile.css';

function UserProfile() {
  const navigate = useNavigate();
  const { user, logout, useSupabase } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [proTokenInput, setProTokenInput] = useState('');
  const [upgradeError, setUpgradeError] = useState('');

  const PRO_TOKEN = '3329';

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
        if (!success || error) {
          const errorMessage = error?.message || 'No se pudo eliminar la cuenta. Por favor, intenta de nuevo.';
          alert('Error al eliminar la cuenta: ' + errorMessage);
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
    <div className="user-profile-container">
      <div className="user-profile-header">
        <div className="profile-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
            Volver al inicio
          </button>
          <h2>Mi Perfil</h2>
        </div>
      </div>

      <div className="user-profile-content">
        {/* Información del usuario - Card principal */}
        <div className="profile-card profile-card-main">
          <div className="profile-card-header">
            <div className="profile-avatar-large">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="profile-header-info">
              <h3 className="profile-name">{user?.name || 'Usuario'}</h3>
              <p className="profile-email">{user?.email}</p>
            </div>
            <div className="profile-plan-badge-large">
              <span className={`plan-badge-large ${user?.plan || 'free'}`}>
                {user?.plan === 'pro' ? '⚡ PRO' : 'Free'}
              </span>
            </div>
          </div>
        </div>

        {/* Upgrade a PRO */}
        {user?.plan !== 'pro' && (
          <div className="profile-card profile-card-upgrade">
            <div className="upgrade-card-content">
              <div className="upgrade-icon-large">⚡</div>
              <div className="upgrade-text-content">
                <h3>Desbloquea el Plan PRO</h3>
                <p>Accede a todas las funcionalidades premium y potencia tu búsqueda de clientes</p>
                <ul className="upgrade-features-list">
                  <li>Búsquedas ilimitadas</li>
                  <li>Historial de búsquedas</li>
                  <li>Empresas favoritas</li>
                  <li>Emails ilimitados</li>
                  <li>Fondo animado premium</li>
                </ul>
              </div>
              <button 
                className="btn-upgrade-profile"
                onClick={() => setShowUpgradeModal(true)}
              >
                <span>⚡</span>
                <span>Activar Plan PRO</span>
              </button>
            </div>
          </div>
        )}

        {/* Zona de peligro */}
        <div className="profile-card profile-card-danger">
          <div className="danger-card-header">
            <svg className="danger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
            <h3>Zona de peligro</h3>
          </div>
          <div className="danger-card-content">
            <p>Una vez que elimines tu cuenta, no podrás recuperarla. Esta acción es permanente y eliminará todos tus datos.</p>
            <button 
              className="btn-delete-account"
              onClick={() => setShowDeleteModal(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Eliminar cuenta
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
}

export default UserProfile;


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
        <h2>Mi Perfil</h2>
        <button className="close-btn" onClick={() => navigate('/')}>×</button>
      </div>

      <div className="user-profile-content">
        {/* Información del usuario */}
        <div className="profile-section">
          <h3>Información de la cuenta</h3>
          <div className="profile-info-grid">
            <div className="profile-info-item">
              <label>Nombre</label>
              <div className="profile-value">{user?.name || 'Usuario'}</div>
            </div>
            <div className="profile-info-item">
              <label>Email</label>
              <div className="profile-value">{user?.email}</div>
            </div>
            <div className="profile-info-item">
              <label>Plan</label>
              <div className="profile-value">
                <span className={`plan-badge ${user?.plan || 'free'}`}>
                  {user?.plan === 'pro' ? '⚡ PRO' : 'Free'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade a PRO */}
        {user?.plan !== 'pro' && (
          <div className="profile-section">
            <h3>Mejorar plan</h3>
            <div className="upgrade-section">
              <p>Desbloquea todas las funcionalidades premium con el plan PRO</p>
              <button 
                className="btn-upgrade-profile"
                onClick={() => setShowUpgradeModal(true)}
              >
                ⚡ Cambiar a PRO
              </button>
            </div>
          </div>
        )}

        {/* Zona de peligro */}
        <div className="profile-section danger-section">
          <h3>Zona de peligro</h3>
          <div className="danger-content">
            <p>Una vez que elimines tu cuenta, no podrás recuperarla. Esta acción es permanente.</p>
            <button 
              className="btn-delete-account"
              onClick={() => setShowDeleteModal(true)}
            >
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


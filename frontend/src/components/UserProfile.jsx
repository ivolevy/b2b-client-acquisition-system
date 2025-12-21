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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Completá todos los campos');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');

    try {
      if (useSupabase) {
        // Primero verificar la contraseña actual intentando iniciar sesión
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email,
          password: passwordForm.currentPassword
        });

        if (signInError) {
          setPasswordError('Contraseña actual incorrecta');
          setPasswordLoading(false);
          return;
        }

        // Si la contraseña actual es correcta, actualizar a la nueva
        const { error: updateError } = await supabase.auth.updateUser({
          password: passwordForm.newPassword
        });

        if (updateError) {
          setPasswordError('Error al actualizar la contraseña: ' + updateError.message);
          setPasswordLoading(false);
          return;
        }

        // Éxito
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        alert('Contraseña actualizada exitosamente');
      } else {
        setPasswordError('Cambio de contraseña no disponible en modo demo');
      }
      setPasswordLoading(false);
    } catch (error) {
      setPasswordError('Error al cambiar la contraseña');
      setPasswordLoading(false);
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
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          Volver al inicio
        </button>
        <h2>Mi Perfil</h2>
      </div>

      <div className="user-profile-content">
        <div className="profile-content-grid">
          {/* Columna izquierda */}
          <div className="profile-column">
            <h3 className="profile-section-title">Información básica</h3>
            <div className="profile-field">
              <label className="profile-field-label">Nombre</label>
              <div className="profile-field-value">{user?.name || 'Usuario'}</div>
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Teléfono</label>
              <div className="profile-field-value">{user?.phone || 'No especificado'}</div>
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Email</label>
              <div className="profile-field-value">{user?.email}</div>
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Contraseña</label>
              <div className="profile-field-value">
                <button 
                  className="profile-change-password-btn"
                  onClick={() => setShowPasswordModal(true)}
                >
                  Cambiar contraseña
                </button>
              </div>
            </div>
          </div>

          {/* Línea divisoria */}
          <div className="profile-divider"></div>

          {/* Columna derecha */}
          <div className="profile-column">
            <h3 className="profile-section-title">Información de cuenta</h3>
            <div className="account-info-card">
              <div className="account-plan-section">
                <div className="account-plan-label">Plan actual</div>
                <div className="account-plan-content">
                  <span className={`plan-badge-large ${user?.plan || 'free'}`}>
                    {user?.plan === 'pro' ? 'PRO' : 'Free'}
                  </span>
                </div>
                <div className="account-plan-actions">
                  {user?.plan !== 'pro' ? (
                    <button 
                      className="account-upgrade-btn"
                      onClick={() => setShowUpgradeModal(true)}
                    >
                      Actualizar a PRO
                    </button>
                  ) : (
                    <button 
                      className="account-change-plan-btn"
                      onClick={() => {/* Aquí puedes agregar lógica para cambiar plan */}}
                    >
                      Cambiar plan
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="account-danger-section">
              <div className="account-danger-label">Zona de peligro</div>
              <div className="account-danger-content">
                <p className="account-danger-text">Esta acción es permanente y no se puede deshacer.</p>
                <button 
                  className="btn-delete-account"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Eliminar cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar cuenta */}
      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-header">
              <h3>Eliminar cuenta</h3>
              <p className="delete-modal-subtitle">Esta acción es permanente y no se puede deshacer</p>
            </div>
            
            <div className="delete-modal-body">
              <div className="delete-warning-box">
                <p className="delete-warning-title">Se eliminarán permanentemente:</p>
                <ul className="delete-warning-list">
                  <li>Tu cuenta y perfil</li>
                  <li>Historial de búsquedas</li>
                  <li>Empresas guardadas</li>
                  <li>Templates de email</li>
                  <li>Todos tus datos</li>
                </ul>
              </div>
              
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
                {deleteLoading ? 'Eliminando...' : 'Eliminar cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar contraseña */}
      {showPasswordModal && (
        <div className="password-modal-overlay">
          <div className="password-modal">
            <div className="password-modal-header">
              <h3>Cambiar contraseña</h3>
            </div>
            
            <div className="password-modal-body">
              {passwordError && (
                <div className="password-error">
                  {passwordError}
                </div>
              )}
              
              <div className="password-input-group">
                <label>Contraseña actual</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Ingresá tu contraseña actual"
                  disabled={passwordLoading}
                  autoFocus
                />
              </div>

              <div className="password-input-group">
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Ingresá tu nueva contraseña"
                  disabled={passwordLoading}
                />
              </div>

              <div className="password-input-group">
                <label>Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirmá tu nueva contraseña"
                  disabled={passwordLoading}
                />
              </div>
            </div>
            
            <div className="password-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError('');
                }}
                disabled={passwordLoading}
              >
                Cancelar
              </button>
              <button 
                className="password-save-btn"
                onClick={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Guardando...' : 'Guardar contraseña'}
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





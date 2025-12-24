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
  const [showCancelPlanModal, setShowCancelPlanModal] = useState(false);
  const [cancelPlanLoading, setCancelPlanLoading] = useState(false);
  const [cancelPlanError, setCancelPlanError] = useState('');
  const [cancelConfirmText, setCancelConfirmText] = useState('');

  const handleUpgradeToPro = async () => {
    if (!proTokenInput.trim()) {
      setUpgradeError('Por favor, ingresa un código promocional.');
      return;
    }

    setUpgradeLoading(true);
    setUpgradeError('');

    try {
      if (!useSupabase || !user?.id) {
        setUpgradeError('No se puede validar el código promocional. Supabase no está configurado o no hay sesión activa.');
        setUpgradeLoading(false);
        return;
      }

      // Usar la función RPC para activar suscripción con código
      const { data, error: rpcError } = await supabase.rpc('activate_subscription_with_code', {
        p_user_id: user.id,
        p_code: proTokenInput.trim().toUpperCase()
      });

      if (rpcError) {
        setUpgradeError(rpcError.message || 'Código promocional inválido o expirado.');
        setUpgradeLoading(false);
        return;
      }

      if (!data || !data.success) {
        setUpgradeError(data?.error || 'Código promocional inválido o expirado.');
        setUpgradeLoading(false);
        return;
      }

      // Actualizar localStorage
      const authData = JSON.parse(localStorage.getItem('b2b_auth') || '{}');
      authData.plan = 'pro';
      authData.plan_expires_at = data.expires_at;
      localStorage.setItem('b2b_auth', JSON.stringify(authData));

      // Cerrar modal y recargar para aplicar cambios
      setShowUpgradeModal(false);
      setProTokenInput('');
      window.location.reload();
    } catch (error) {
      console.error('Error upgrading to PRO:', error);
      setUpgradeError('Error al procesar el upgrade: ' + (error.message || 'Error desconocido'));
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

  const handleCancelPlan = async () => {
    if (cancelConfirmText !== 'CANCELAR') {
      return;
    }

    setCancelPlanLoading(true);
    setCancelPlanError('');
    
    try {
      if (!useSupabase || !user?.id) {
        setCancelPlanError('No se puede cancelar el plan. Supabase no está configurado o no hay sesión activa.');
        setCancelPlanLoading(false);
        return;
      }

      // 1. Cancelar suscripciones activas
      const { error: cancelSubError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      if (cancelSubError) {
        console.error('Error cancelando suscripciones:', cancelSubError);
        setCancelPlanError('Error al cancelar las suscripciones: ' + cancelSubError.message);
        setCancelPlanLoading(false);
        return;
      }

      // 2. Actualizar plan del usuario a 'free'
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ 
          plan: 'free',
          plan_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateUserError) {
        console.error('Error actualizando usuario:', updateUserError);
        setCancelPlanError('Error al actualizar el plan: ' + updateUserError.message);
        setCancelPlanLoading(false);
        return;
      }

      // 3. Actualizar localStorage
      const authData = JSON.parse(localStorage.getItem('b2b_auth') || '{}');
      authData.plan = 'free';
      authData.plan_expires_at = null;
      localStorage.setItem('b2b_auth', JSON.stringify(authData));

      // 4. Cerrar modal y recargar para aplicar cambios
      setShowCancelPlanModal(false);
      setCancelConfirmText('');
      alert('Tu plan PRO ha sido cancelado exitosamente. Ahora tienes plan Free.');
      window.location.reload();
    } catch (error) {
      console.error('Error al cancelar plan:', error);
      setCancelPlanError('Error al cancelar el plan: ' + (error.message || 'Error desconocido'));
      setCancelPlanLoading(false);
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
                      onClick={() => setShowCancelPlanModal(true)}
                    >
                      Cancelar plan
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
                <label>Ingresá tu código promocional:</label>
                <input
                  type="text"
                  value={proTokenInput}
                  onChange={(e) => {
                    setProTokenInput(e.target.value.toUpperCase());
                    setUpgradeError('');
                  }}
                  placeholder="Código promocional"
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

      {/* Modal para cancelar plan PRO */}
      {showCancelPlanModal && (
        <div className="cancel-plan-modal-overlay">
          <div className="cancel-plan-modal">
            <div className="cancel-plan-modal-header">
              <h3>Cancelar Plan PRO</h3>
              <p className="cancel-plan-modal-subtitle">¿Estás seguro de que deseas cancelar tu plan PRO?</p>
            </div>
            
            <div className="cancel-plan-modal-body">
              <div className="cancel-plan-warning-box">
                <p className="cancel-plan-warning-title">Al cancelar tu plan PRO:</p>
                <ul className="cancel-plan-warning-list">
                  <li>Perderás acceso a búsquedas ilimitadas</li>
                  <li>No podrás guardar historial de búsquedas</li>
                  <li>No podrás guardar empresas favoritas</li>
                  <li>Perderás el fondo animado premium</li>
                  <li>Tu plan cambiará a Free inmediatamente</li>
                </ul>
              </div>
              
              {cancelPlanError && (
                <div className="cancel-plan-error">
                  {cancelPlanError}
                </div>
              )}
              
              <div className="confirm-input">
                <label>Escribe <strong>CANCELAR</strong> para confirmar:</label>
                <input
                  type="text"
                  value={cancelConfirmText}
                  onChange={(e) => setCancelConfirmText(e.target.value.toUpperCase())}
                  placeholder="CANCELAR"
                  disabled={cancelPlanLoading}
                />
              </div>
            </div>
            
            <div className="cancel-plan-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowCancelPlanModal(false);
                  setCancelConfirmText('');
                  setCancelPlanError('');
                }}
                disabled={cancelPlanLoading}
              >
                Volver
              </button>
              <button 
                className="cancel-plan-btn"
                onClick={handleCancelPlan}
                disabled={cancelConfirmText !== 'CANCELAR' || cancelPlanLoading}
              >
                {cancelPlanLoading ? 'Cancelando...' : 'Cancelar Plan PRO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;





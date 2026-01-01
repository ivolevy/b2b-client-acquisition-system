import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthWrapper';
import { authService, supabase } from '../lib/supabase';
import { API_URL } from '../config';
import axios from 'axios';
import './UserProfile.css';

function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, useSupabase } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
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
  const [passwordStep, setPasswordStep] = useState('request'); // 'request', 'verify', 'change'
  const [verificationCode, setVerificationCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0); // Countdown en segundos
  const [canResendCode, setCanResendCode] = useState(false);
  const [passwordChangeEmail, setPasswordChangeEmail] = useState('');
  const [showCancelPlanModal, setShowCancelPlanModal] = useState(false);
  const [showCancelPlanSuccessModal, setShowCancelPlanSuccessModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [cancelPlanLoading, setCancelPlanLoading] = useState(false);
  const [cancelPlanError, setCancelPlanError] = useState('');
  const [cancelConfirmText, setCancelConfirmText] = useState('');
  const [showUpgradeSuccessModal, setShowUpgradeSuccessModal] = useState(false);

  // Bloquear scroll del body cuando cualquier modal está abierto
  useEffect(() => {
    const hasModalOpen = showDeleteModal || showUpgradeModal || showPasswordModal || showCancelPlanModal || showCancelPlanSuccessModal || showDeleteSuccessModal || showUpgradeSuccessModal;
    
    if (hasModalOpen) {
      // Guardar el scroll actual
      const scrollY = window.scrollY;
      document.body.classList.add('modal-open');
      document.body.style.top = `-${scrollY}px`;
    } else {
      // Restaurar el scroll
      const scrollY = document.body.style.top;
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
    };
  }, [showDeleteModal, showUpgradeModal, showPasswordModal, showCancelPlanModal, showCancelPlanSuccessModal, showDeleteSuccessModal, showUpgradeSuccessModal]);


  // Countdown para reenviar código de cambio de contraseña
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && codeSent) {
      setCanResendCode(true);
    }
  }, [resendCountdown, codeSent]);

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

      // Usar endpoint del backend en lugar de RPC directo
      const response = await axios.post(`${API_URL}/admin/activate-pro`, {
        user_id: user.id,
        code: proTokenInput.trim().toUpperCase()
      });

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Error al activar el plan.');
      }

      // Actualizar localStorage
      const authData = JSON.parse(localStorage.getItem('b2b_auth') || '{}');
      authData.plan = 'pro';
      authData.plan_expires_at = response.data.expires_at;
      localStorage.setItem('b2b_auth', JSON.stringify(authData));

      // Forzar actualización del perfil en el cliente si es posible
      if (user) {
         user.plan = 'pro';
      }

      // Cerrar modal y mostrar éxito (o recargar)
      setShowUpgradeModal(false);
      setProTokenInput('');
      
      // Mostrar modal de éxito
      setShowUpgradeSuccessModal(true);
      
    } catch (error) {
      console.error('Error upgrading to PRO:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Error desconocido al activar.';
      setUpgradeError(errorMsg);
      setUpgradeLoading(false);
    }
  };

  const handleRequestCode = async () => {
    const emailToUse = passwordChangeEmail || user?.email;
    
    if (!emailToUse) {
      setPasswordError('Por favor, ingresá un email');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) {
      setPasswordError('Por favor, ingresá un email válido');
      return;
    }

    setCodeLoading(true);
    setPasswordError('');

    try {
      const response = await axios.post(`${API_URL}/auth/solicitar-codigo-cambio-password`, {
        email: emailToUse,
        user_id: user.id
      });

      if (response.data.success) {
        setCodeSent(true);
        setPasswordStep('verify');
        setResendCountdown(60); // Iniciar countdown de 60 segundos
        setCanResendCode(false);
        setPasswordError('');
      } else {
        setPasswordError(response.data.message || 'Error al solicitar el código');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Error al solicitar el código';
      setPasswordError(errorMsg);
    } finally {
      setCodeLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setPasswordError('Ingresá el código de 6 dígitos');
      return;
    }

    const emailToUse = passwordChangeEmail || user?.email;
    if (!emailToUse) {
      setPasswordError('No se encontró el email');
      return;
    }

    setCodeLoading(true);
    setPasswordError('');

    try {
      const response = await axios.post(`${API_URL}/auth/validar-codigo-cambio-password`, {
        email: emailToUse,
        codigo: verificationCode
      });

      if (response.data.success && response.data.valid) {
        setPasswordStep('change');
        setPasswordError('');
      } else {
        setPasswordError('Código de validación incorrecto');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Error al validar el código';
      setPasswordError(errorMsg);
    } finally {
      setCodeLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Completá todos los campos');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (passwordForm.newPassword.length > 16) {
      setPasswordError('La contraseña no puede tener más de 16 caracteres');
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      setPasswordError('El código de verificación es requerido');
      return;
    }

    const emailToUse = passwordChangeEmail || user?.email;
    if (!emailToUse) {
      setPasswordError('No se encontró el email');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');

    try {
      // Validar el código y actualizar la contraseña en un solo paso usando el endpoint del backend
      const resetResponse = await axios.post(`${API_URL}/auth/actualizar-password-reset`, {
        email: emailToUse,
        codigo: verificationCode,
        new_password: passwordForm.newPassword
      });

      if (resetResponse.data.success) {
        // Éxito - contraseña actualizada directamente por el backend
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordStep('request');
        setPasswordChangeEmail(user?.email || '');
        setVerificationCode('');
        setCodeSent(false);
        setResendCountdown(0);
        setCanResendCode(false);
        alert(resetResponse.data.message || 'Tu contraseña ha sido actualizada correctamente. Podés iniciar sesión con tu nueva contraseña.');
      } else {
        // Si falla, verificar si requiere reset desde el frontend
        if (resetResponse.data.requires_frontend_reset) {
          // Intentar usar el método de Supabase como último recurso
          try {
            if (useSupabase) {
              // Verificar que haya una sesión activa
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();

              if (sessionError || !session) {
                setPasswordError('No hay una sesión activa. Por favor, iniciá sesión nuevamente.');
          setPasswordLoading(false);
          return;
        }

              // Actualizar la contraseña directamente
              const { data, error: updateError } = await supabase.auth.updateUser({
          password: passwordForm.newPassword
        });

        if (updateError) {
          setPasswordError('Error al actualizar la contraseña: ' + updateError.message);
          setPasswordLoading(false);
          return;
        }

              if (!data || !data.user) {
                setPasswordError('No se pudo actualizar la contraseña. Por favor, intentá nuevamente.');
                setPasswordLoading(false);
                return;
              }

        // Éxito
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setPasswordStep('request');
              setPasswordChangeEmail(user?.email || '');
              setVerificationCode('');
              setCodeSent(false);
              setResendCountdown(0);
              setCanResendCode(false);
              alert('Tu contraseña ha sido actualizada correctamente. Podés iniciar sesión con tu nueva contraseña.');
      } else {
        setPasswordError('Cambio de contraseña no disponible en modo demo');
              setPasswordLoading(false);
            }
          } catch (frontendError) {
            setPasswordError('Error al actualizar la contraseña. Por favor, intentá nuevamente.');
            setPasswordLoading(false);
          }
        } else {
          setPasswordError(resetResponse.data.message || 'Error al actualizar la contraseña');
      setPasswordLoading(false);
        }
      }
    } catch (error) {
      console.error('Error en handleChangePassword:', error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || 'Error al cambiar la contraseña';
      setPasswordError(errorMsg);
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

      // 1. Cancelar suscripciones activas en Supabase
      const { data: cancelledSubs, error: cancelSubError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .select();
      
      if (cancelSubError) {
        console.error('Error cancelando suscripciones:', cancelSubError);
        setCancelPlanError('Error al cancelar las suscripciones: ' + cancelSubError.message);
        setCancelPlanLoading(false);
        return;
      }

      console.log(`[CancelPlan] ${cancelledSubs?.length || 0} suscripción(es) cancelada(s)`);

      // 2. Actualizar plan del usuario a 'free' en Supabase
      const { data: updatedUser, error: updateUserError } = await supabase
        .from('users')
        .update({ 
          plan: 'free',
          plan_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateUserError) {
        console.error('Error actualizando usuario:', updateUserError);
        setCancelPlanError('Error al actualizar el plan: ' + updateUserError.message);
        setCancelPlanLoading(false);
        return;
      }

      // Verificar que la actualización se haya realizado correctamente
      if (!updatedUser || updatedUser.plan !== 'free') {
        console.error('Error: El plan no se actualizó correctamente', updatedUser);
        setCancelPlanError('Error: El plan no se actualizó correctamente en la base de datos.');
        setCancelPlanLoading(false);
        return;
      }

      console.log('[CancelPlan] Usuario actualizado en Supabase:', updatedUser);

      // 3. Actualizar localStorage
      const authData = JSON.parse(localStorage.getItem('b2b_auth') || '{}');
      authData.plan = 'free';
      authData.plan_expires_at = null;
      localStorage.setItem('b2b_auth', JSON.stringify(authData));

      // 4. Cerrar modal de confirmación y mostrar modal de éxito
      setShowCancelPlanModal(false);
      setCancelConfirmText('');
      setShowCancelPlanSuccessModal(true);
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
          setDeleteLoading(false);
          setDeleteError(errorMessage);
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
      
      // Cerrar el modal de confirmación y mostrar el modal de éxito
      setShowDeleteModal(false);
      setDeleteLoading(false);
      setShowDeleteSuccessModal(true);
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
      window.location.replace('/');
      }, 2000);
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      setDeleteLoading(false);
      setDeleteError('Error al eliminar la cuenta. Por favor, intenta de nuevo.');
    }
  };

  return (
    <div className="user-profile-container">
      <div className="user-profile-header">
        <div className="profile-header-content">
          <button 
            className="profile-back-btn"
            onClick={() => navigate('/')}
            title="Volver al inicio"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        <h2>Mi Perfil</h2>
        </div>
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
                  onClick={() => {
                    setShowPasswordModal(true);
                    setPasswordStep('request');
                    setPasswordChangeEmail(user?.email || '');
                    setVerificationCode('');
                    setCodeSent(false);
                    setPasswordError('');
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  Cambiar contraseña
                </button>
              </div>
            </div>
          </div>

          {/* Línea divisoria */}
          <div className="profile-divider"></div>

          {/* Columna derecha */}
          {user?.role !== 'admin' && (
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
          )}
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
                  onChange={(e) => {
                    setDeleteConfirmText(e.target.value.toUpperCase());
                    setDeleteError(''); // Limpiar error al escribir
                  }}
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
                  setDeleteError('');
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
              
              {passwordStep === 'request' && (
                <>
                  <p style={{ marginBottom: '20px', color: '#666' }}>
                    Para cambiar tu contraseña, necesitamos verificar tu identidad. 
                    Te enviaremos un código de validación a tu email.
                  </p>
              <div className="password-input-group">
                    <label>Email</label>
                <input
                      type="email"
                      value={passwordChangeEmail || user?.email || ''}
                      onChange={(e) => setPasswordChangeEmail(e.target.value)}
                      placeholder="Ingresá tu email"
                      disabled={codeLoading}
                  autoFocus
                />
              </div>
                </>
              )}

              {passwordStep === 'verify' && (
                <>
                  {codeSent && (
                    <div style={{ 
                      background: '#d4edda', 
                      border: '1px solid #c3e6cb', 
                      borderRadius: '8px', 
                      padding: '12px', 
                      marginBottom: '20px',
                      color: '#155724'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        ✓ Código enviado a {passwordChangeEmail || user?.email}. Revisá tu bandeja de entrada.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordStep('request');
                          setVerificationCode('');
                          setCodeSent(false);
                          setPasswordError('');
                          setResendCountdown(0);
                          setCanResendCode(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#155724',
                          cursor: 'pointer',
                          fontSize: '12px',
                          textDecoration: 'underline',
                          padding: 0,
                          opacity: 0.8
                        }}
                        title="Cambiar email"
                      >
                        Email equivocado?
                      </button>
                    </div>
                  )}
                  <div className="password-input-group">
                    <label>Código de validación</label>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                          key={index}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={verificationCode[index] || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value) {
                              const newCode = verificationCode.split('');
                              newCode[index] = value;
                              const updatedCode = newCode.join('').slice(0, 6);
                              setVerificationCode(updatedCode);
                              
                              // Mover al siguiente input si hay valor
                              if (index < 5 && value) {
                                const nextInput = e.target.parentElement?.children[index + 1];
                                if (nextInput) {
                                  nextInput.focus();
                                }
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              e.preventDefault();
                              const newCode = verificationCode.split('');
                              
                              if (newCode[index]) {
                                // Si hay un valor en el campo actual, borrarlo
                                newCode[index] = '';
                                setVerificationCode(newCode.join(''));
                              } else if (index > 0) {
                                // Si el campo está vacío, ir al anterior y borrarlo
                                newCode[index - 1] = '';
                                setVerificationCode(newCode.join(''));
                                const prevInput = e.target.parentElement?.children[index - 1];
                                if (prevInput) {
                                  prevInput.focus();
                                }
                              }
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                            setVerificationCode(pastedData);
                            if (pastedData.length === 6) {
                              const lastInput = e.target.parentElement?.children[5];
                              if (lastInput) {
                                lastInput.focus();
                              }
                            }
                          }}
                          disabled={codeLoading}
                          autoFocus={index === 0}
                          style={{ 
                            width: '48px',
                            height: '56px',
                            textAlign: 'center', 
                            fontSize: '24px', 
                            fontFamily: 'monospace',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#81D4FA';
                            e.target.style.boxShadow = '0 0 0 3px rgba(129, 212, 250, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e5e7eb';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                        El código expira en 10 minutos
                      </p>
                      {canResendCode ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!user?.email) {
                              setPasswordError('No se encontró el email del usuario');
                              return;
                            }

                            setCodeLoading(true);
                            setPasswordError('');
                            setCanResendCode(false);

                            try {
                              const emailToUse = passwordChangeEmail || user?.email;
                              if (!emailToUse) {
                                setPasswordError('Por favor, ingresá un email');
                                setCodeLoading(false);
                                return;
                              }

                              const response = await axios.post(`${API_URL}/auth/solicitar-codigo-cambio-password`, {
                                email: emailToUse,
                                user_id: user.id
                              });

                              if (response.data.success) {
                                setCodeSent(true);
                                setVerificationCode(''); // Limpiar código anterior
                                setResendCountdown(60); // Reiniciar countdown a 60 segundos
                                setPasswordError('');
                              } else {
                                setPasswordError(response.data.message || 'Error al solicitar el código');
                                setCanResendCode(true);
                              }
                            } catch (error) {
                              const errorMsg = error.response?.data?.detail || error.message || 'Error al solicitar el código';
                              setPasswordError(errorMsg);
                              setCanResendCode(true);
                            } finally {
                              setCodeLoading(false);
                            }
                          }}
                          disabled={codeLoading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#81D4FA',
                            cursor: 'pointer',
                            fontSize: '12px',
                            textDecoration: 'underline',
                            padding: 0,
                            margin: 0
                          }}
                        >
                          Reenviar código
                        </button>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                          Reenviar código en {resendCountdown}s
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {passwordStep === 'change' && (
                <>
                  <div style={{ 
                    background: '#d4edda', 
                    border: '1px solid #c3e6cb', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    marginBottom: '20px',
                    color: '#155724'
                  }}>
                    ✓ Código verificado correctamente. Ahora podés cambiar tu contraseña.
                  </div>
              <div className="password-input-group">
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Ingresá tu nueva contraseña"
                  disabled={passwordLoading}
                      autoFocus
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
                </>
              )}
            </div>
            
            <div className="password-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordStep('request');
                  setVerificationCode('');
                  setCodeSent(false);
                  setPasswordError('');
                  setResendCountdown(0);
                  setCanResendCode(false);
                }}
                disabled={passwordLoading || codeLoading}
              >
                Cancelar
              </button>
              {passwordStep === 'request' && (
                <button 
                  className="password-save-btn"
                  onClick={handleRequestCode}
                  disabled={codeLoading}
                >
                  {codeLoading ? 'Enviando...' : 'Enviar código'}
                </button>
              )}
              {passwordStep === 'verify' && (
                <button 
                  className="password-save-btn"
                  onClick={handleVerifyCode}
                  disabled={codeLoading || verificationCode.length !== 6}
                >
                  {codeLoading ? 'Verificando...' : 'Verificar código'}
                </button>
              )}
              {passwordStep === 'change' && (
              <button 
                className="password-save-btn"
                onClick={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
              )}
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

      {/* Modal de éxito al cancelar plan PRO */}
      {showCancelPlanSuccessModal && (
        <div className="cancel-plan-success-modal-overlay">
          <div className="cancel-plan-success-modal">
            <div className="cancel-plan-success-modal-header">
              <div className="cancel-plan-success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3>Plan Cancelado Exitosamente</h3>
            </div>
            
            <div className="cancel-plan-success-modal-body">
              <p className="cancel-plan-success-message">
                Tu plan PRO ha sido cancelado exitosamente.
              </p>
              <p className="cancel-plan-success-submessage">
                Ahora tienes plan <strong>Free</strong>. Podés actualizar a PRO nuevamente cuando lo desees.
              </p>
            </div>
            
            <div className="cancel-plan-success-modal-footer">
              <button 
                className="cancel-plan-success-btn"
                onClick={() => {
                  setShowCancelPlanSuccessModal(false);
                  // Recargar la página para que AuthWrapper cargue los datos actualizados de Supabase
                  window.location.reload();
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito al eliminar cuenta */}
      {showDeleteSuccessModal && (
        <div className="cancel-plan-success-modal-overlay">
          <div className="cancel-plan-success-modal">
            <div className="cancel-plan-success-modal-header">
              <div className="cancel-plan-success-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#10b981' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3>Cuenta Eliminada Exitosamente</h3>
            </div>
            
            <div className="cancel-plan-success-modal-body">
              <p className="cancel-plan-success-message">
                Tu cuenta ha sido eliminada exitosamente.
              </p>
              <p className="cancel-plan-success-submessage">
                Todos tus datos han sido eliminados permanentemente. Serás redirigido al inicio de sesión.
              </p>
            </div>
            
            <div className="cancel-plan-success-modal-footer">
              <button 
                className="cancel-plan-success-btn"
                onClick={() => {
                  window.location.replace('/');
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito al activar PRO */}
      {showUpgradeSuccessModal && (
        <div className="cancel-plan-success-modal-overlay">
          <div className="cancel-plan-success-modal">
            <div className="cancel-plan-success-modal-header">
              <div className="upgrade-success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h3>¡Plan PRO Activado!</h3>
            </div>
            
            <div className="cancel-plan-success-modal-body">
              <p className="cancel-plan-success-message">
                Has activado tu suscripción PRO correctamente.
              </p>
              <p className="cancel-plan-success-submessage">
                Ahora tenés acceso ilimitado a todas las herramientas premium. ¡Disfrutalo!
              </p>
            </div>
            
            <div className="cancel-plan-success-modal-footer">
              <button 
                className="cancel-plan-success-btn"
                style={{ background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' }}
                onClick={() => {
                  setShowUpgradeSuccessModal(false);
                  window.location.reload();
                }}
              >
                Comenzar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;





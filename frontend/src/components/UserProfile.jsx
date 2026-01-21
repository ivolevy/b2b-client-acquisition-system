import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthWrapper';
import { authService, supabase } from '../lib/supabase';
import { API_URL } from '../config';
import axios from 'axios';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './UserProfile.css';

function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, useSupabase } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    document.body.classList.add('profile-page-active');
    return () => document.body.classList.remove('profile-page-active');
  }, []);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'rubros', 'danger'
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStep, setPasswordStep] = useState('request'); // 'request', 'verify', 'change'
  const { success: toastSuccess, error: toastError, warning: toastWarning, removeToast, toasts } = useToast();
  const [rubrosSaved, setRubrosSaved] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0); // Countdown en segundos
  const [canResendCode, setCanResendCode] = useState(false);
  const [passwordChangeEmail, setPasswordChangeEmail] = useState('');
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [authStatus, setAuthStatus] = useState({ google: { connected: false }, outlook: { connected: false } });
  const [authLoading, setAuthLoading] = useState(false);
  
  // Custom Rubros State
  const [availableRubros, setAvailableRubros] = useState({});
  const [selectedRubros, setSelectedRubros] = useState([]);
  const [rubrosLoading, setRubrosLoading] = useState(false);
  const [savingRubros, setSavingRubros] = useState(false);
  const [rubrosError, setRubrosError] = useState('');

  // Bloquear scroll del body cuando cualquier modal está abierto
  useEffect(() => {
    const hasModalOpen = showDeleteModal || showPasswordModal || showDeleteSuccessModal;
    
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
  }, [showDeleteModal, showPasswordModal, showDeleteSuccessModal]);


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

  // Fetch rubros del usuario
  useEffect(() => {
    if (user?.id) {
      fetchUserRubros();
      fetchAuthStatus();
    }
  }, [user?.id]);

  const fetchAuthStatus = async () => {
    if (!user?.id) return;
    setAuthLoading(true);
    try {
      const response = await axios.get(`${API_URL}/auth/status/${user.id}`);
      if (response.data) {
        setAuthStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching auth status:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      // Generar un state simple (user_id)
      const state = user.id;
      const response = await axios.post(`${API_URL}/auth/google/url`, { state });
      if (response.data.success) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error connecting Google:', error);
      toastError?.('Error al iniciar conexión con Gmail');
    }
  };

  const handleConnectOutlook = async () => {
    try {
      const state = user.id;
      const response = await axios.post(`${API_URL}/auth/outlook/url`, { state });
      if (response.data.success) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error connecting Outlook:', error);
      toastError?.('Error al iniciar conexión con Outlook');
    }
  };

  const handleDisconnectProvider = async (provider) => {
    if (!confirm(`¿Estás seguro de desconectar ${provider}?`)) return;
    try {
      const response = await axios.post(`${API_URL}/auth/${provider}/disconnect`, { user_id: user.id });
      if (response.data.success) {
        toastSuccess?.(`${provider === 'google' ? 'Gmail' : 'Outlook'} desconectado`);
        fetchAuthStatus();
      }
    } catch (error) {
      console.error(`Error disconnecting ${provider}:`, error);
      toastError?.(`Error al desconectar ${provider}`);
    }
  };

  const fetchUserRubros = async () => {
    if (!user?.id) return;
    
    setRubrosLoading(true);
    setRubrosError('');
    try {
      console.log('Fetching rubros for user:', user.id);
      const response = await axios.get(`${API_URL}/users/${user.id}/rubros?t=${Date.now()}`);
      console.log('Rubros response:', response.data);
      
      if (response.data.success) {
        let all = response.data.all_rubros;
        const selected = response.data.selected_rubros || [];
        
        // Fallback: si no viene all_rubros, intentar pedirlo del endpoint general
        if (!all || Object.keys(all).length === 0) {
          console.warn('all_rubros empty in user endpoint, falling back to /rubros');
          const fallbackRes = await axios.get(`${API_URL}/rubros`);
          if (fallbackRes.data && fallbackRes.data.rubros) {
            all = fallbackRes.data.rubros;
          }
        }
        
        const rubrosDict = all || {};
        setAvailableRubros(rubrosDict);
        
        // Si no hay nada guardado, por defecto seleccionamos todos
        if (selected.length === 0 && Object.keys(rubrosDict).length > 0) {
          setSelectedRubros(Object.keys(rubrosDict));
        } else {
          setSelectedRubros(selected);
        }
      }
    } catch (err) {
      console.error('Error fetching user rubros:', err);
      // Último intento: cargar rubros generales si falla el endpoint de usuario
      try {
        const fallbackRes = await axios.get(`${API_URL}/rubros`);
        if (fallbackRes.data && fallbackRes.data.rubros) {
          setAvailableRubros(fallbackRes.data.rubros);
          setSelectedRubros(Object.keys(fallbackRes.data.rubros));
          return;
        }
      } catch (e) {
        console.error('Final fallback failed:', e);
      }
      setRubrosError('No se pudieron cargar tus rubros preferidos.');
    } finally {
      setRubrosLoading(false);
    }
  };

  const handleSaveRubros = async () => {
    setSavingRubros(true);
    setRubrosError('');
    if (selectedRubros.length === 0) {
      toastWarning?.(
        <>
          <strong>Selección requerida</strong>
          <p>Debes elegir al menos un rubro para poder buscar empresas.</p>
        </>
      );
      setSavingRubros(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/users/rubros`, {
        user_id: user.id,
        rubro_keys: selectedRubros
      });
      if (response.data.success) {
        setRubrosSaved(true);
        toastSuccess?.("Preferencias de rubros guardadas correctamente.");
        setTimeout(() => setRubrosSaved(false), 3000);
      }
    } catch (err) {
      console.error('Error saving rubros:', err);
      setRubrosError('Error al guardar tus preferencias.');
    } finally {
      setSavingRubros(false);
    }
  };

  const toggleRubro = (key) => {
    setSelectedRubros(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key) 
        : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelectedRubros(Object.keys(availableRubros));
  };

  const handleDeselectAll = () => {
    // Dejamos el primero o simplemente vaciamos y validamos al guardar
    // El usuario pidió "mínimo 1", así que al guardar validaremos.
    setSelectedRubros([]);
    toastWarning?.(
      <>
        <strong>Selección vacía</strong>
        <p>Recuerda que debes tener al menos un rubro seleccionado para guardar.</p>
      </>
    );
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
          <h2>Configuración de Perfil</h2>
        </div>
      </div>

      <div className="user-profile-layout">
        {/* Sidebar */}
        <aside className="profile-sidebar">
          <nav className="profile-nav">
            <button 
              className={`profile-nav-item ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Información básica</span>
            </button>
            <button 
              className={`profile-nav-item ${activeTab === 'rubros' ? 'active' : ''}`}
              onClick={() => setActiveTab('rubros')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Mis Rubros</span>
            </button>
            <button 
              className={`profile-nav-item danger ${activeTab === 'danger' ? 'active' : ''}`}
              onClick={() => setActiveTab('danger')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span>Zona de Peligro</span>
            </button>
          </nav>

          <div className="profile-sidebar-footer">
            <button className="profile-logout-btn" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Contenido Principal */}
        <main className="profile-main-content">
          {activeTab === 'info' && (
            <div className="profile-section-fade-in">
              <h3 className="profile-section-title">Información de la cuenta</h3>
              <div className="profile-info-grid">
                <div className="profile-field">
                  <label className="profile-field-label">Nombre</label>
                  <div className="profile-field-value">{user?.name || 'Usuario'}</div>
                </div>
                <div className="profile-field">
                  <label className="profile-field-label">Email</label>
                  <div className="profile-field-value">{user?.email}</div>
                </div>
                <div className="profile-field">
                  <label className="profile-field-label">Teléfono</label>
                  <div className="profile-field-value">
                    {user?.phone && user.phone.length > 6 ? user.phone : <span className="text-muted">No especificado</span>}
                  </div>
                </div>
                <div className="profile-field">
                  <label className="profile-field-label">Contraseña</label>
                  <div className="profile-field-value">
                    <button 
                      className="profile-inline-link"
                      onClick={() => {
                        setShowPasswordModal(true);
                        setPasswordStep('request');
                        setPasswordChangeEmail(user?.email || '');
                        setVerificationCode('');
                        setCodeSent(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                    >
                      Cambiar contraseña
                    </button>
                  </div>
                </div>
              </div>

              <div className="profile-divider"></div>
              
              <h3 className="profile-section-title">Integraciones de Email</h3>
              <p className="profile-section-subtitle">Conectá tus cuentas para enviar emails directamente desde la plataforma.</p>
              
              <div className="integrations-grid">
                {/* Gmail Card */}
                <div className={`integration-card ${authStatus.google.connected ? 'connected' : ''}`}>
                  <div className="card-header">
                    <div className="provider-info">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="#EA4335"/>
                      </svg>
                      <div className="provider-text">
                        <h4>Gmail</h4>
                        {authStatus.google.connected && (
                          <span className="status-badge">● Conectado</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {authStatus.google.connected ? (
                    <div className="card-footer connected">
                      <span className="email-address">
                        {authStatus.google.email}
                      </span>
                      <button 
                        onClick={() => handleDisconnectProvider('google')}
                        className="btn-disconnect"
                      >
                        Desconectar
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleConnectGoogle}
                      className="btn-connect gmail"
                    >
                      Conectar Gmail
                    </button>
                  )}
                </div>

                {/* Outlook Card */}
                <div className={`integration-card ${authStatus.outlook.connected ? 'connected' : ''}`}>
                  <div className="card-header">
                    <div className="provider-info">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 18L10.2 21.3V2.7L1 6V18ZM23 7.3V16.7L11.5 19.8V4.2L23 7.3ZM23 18.2L11 22V19.2L23 16.7V18.2ZM11 2V4.8L23 7.3V5.8L11 2Z" fill="#0078D4"/>
                      </svg>
                      <div className="provider-text">
                        <h4>Outlook</h4>
                        {authStatus.outlook.connected && (
                          <span className="status-badge">● Conectado</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {authStatus.outlook.connected ? (
                    <div className="card-footer connected">
                      <span className="email-address">
                        {authStatus.outlook.email}
                      </span>
                      <button 
                        onClick={() => handleDisconnectProvider('outlook')}
                        className="btn-disconnect"
                      >
                        Desconectar
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleConnectOutlook}
                      className="btn-connect outlook"
                    >
                      Conectar Outlook
                    </button>
                  )}
                </div>
              </div>

              {/* Eliminada la sección de gestión de planes */}
            </div>
          )}

          {activeTab === 'rubros' && (
            <div className="profile-section-fade-in">
              <h3 className="profile-section-title">Mis Rubros Preferidos</h3>
              <p className="profile-section-subtitle">Seleccioná los rubros que querés que aparezcan en tu buscador. Por defecto todos están activos.</p>
              
              {rubrosError && <div className="rubros-error-msg">{rubrosError}</div>}
              
              {rubrosLoading ? (
                <div className="rubros-loading-spinner">
                  <div className="spinner"></div>
                  <span>Cargando tus preferencias...</span>
                </div>
              ) : (
                <div className="rubros-selection-wrapper">
                  <div className="rubros-selection-actions">
                    <button type="button" className="btn-rubros-action" onClick={handleSelectAll}>
                      Seleccionar todos
                    </button>
                    <button type="button" className="btn-rubros-action" onClick={handleDeselectAll}>
                      Deseleccionar todos
                    </button>
                  </div>

                  <div className="rubros-modern-grid">
                    {Object.entries(availableRubros).map(([key, nombre]) => (
                      <div 
                        key={key} 
                        className={`rubro-selection-card ${selectedRubros.includes(key) ? 'selected' : ''}`}
                        onClick={() => toggleRubro(key)}
                      >
                        <div className="rubro-card-checkbox">
                          {selectedRubros.includes(key) && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span className="rubro-card-name">{nombre}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="rubros-sticky-footer">
                    <button 
                      className={`btn-save-rubros-modern ${rubrosSaved ? 'saved' : ''}`} 
                      onClick={handleSaveRubros}
                      disabled={savingRubros}
                    >
                      {savingRubros ? 'Guardando...' : rubrosSaved ? '✓ Guardado' : 'Guardar Preferencias'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="profile-section-fade-in">
              <h3 className="profile-section-title text-danger">Zona de Peligro</h3>
              <div className="danger-zone-card">
                <div className="danger-card-content">
                  <h4>¿Deseas eliminar tu cuenta?</h4>
                  <p>Al eliminar tu cuenta, perderás el acceso a todas tus búsquedas guardadas, plantillas y configuraciones. Esta acción es irreversible.</p>
                  <button 
                    className="btn-delete-account-modern"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Eliminar mi cuenta permanentemente
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
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

              {deleteError && (
                <div style={{ 
                  backgroundColor: '#fee2e2', 
                  color: '#991b1b', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  marginBottom: '16px',
                  fontSize: '14px',
                  border: '1px solid #fca5a5'
                }}>
                  {deleteError}
                </div>
              )}
              
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

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default UserProfile;





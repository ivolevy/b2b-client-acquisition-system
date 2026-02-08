import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService, supabase } from '../lib/supabase';
import { API_URL } from '../config';
import axios from 'axios';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './UserProfile.css';
import { validatePhone } from '../utils/validators';
import { FiActivity, FiClock, FiCheck } from 'react-icons/fi';

function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, useSupabase } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    document.body.classList.add('profile-page-active');
    return () => document.body.classList.remove('profile-page-active');
  }, []);

  const [activeTab, setActiveTab] = useState('info'); // 'info', 'plan', 'rubros', 'danger'
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
  const [showCancelPlanModal, setShowCancelPlanModal] = useState(false);
  const [cancelPlanLoading, setCancelPlanLoading] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedRechargePack, setSelectedRechargePack] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState(null);
  const [authStatus, setAuthStatus] = useState({ google: { connected: false }, outlook: { connected: false } });
  const [authLoading, setAuthLoading] = useState(false);
  const [rechargeCurrency, setRechargeCurrency] = useState('ARS'); // 'ARS' or 'USD'

  const [creditsInfo, setCreditsInfo] = useState({ credits: 0, next_reset: null, subscription_status: 'active' });
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneForm, setPhoneForm] = useState({
    countryCode: '+54',
    number: ''
  });
  
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
  }, [showDeleteModal, showPasswordModal, showDeleteSuccessModal, showPhoneModal]);


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
      fetchCredits();
    }
  }, [user?.id]);

  const fetchCredits = async () => {
    if (!user?.id) return;
    setCreditsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/users/${user.id}/credits`);
      setCreditsInfo(response.data);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setCreditsLoading(false);
    }
  };

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
      const response = await axios.post(`${API_URL}/api/auth/google/url`, { state });
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
      const response = await axios.post(`${API_URL}/api/auth/outlook/url`, { state });
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
      const response = await axios.post(`${API_URL}/api/auth/${provider}/disconnect`, { user_id: user.id });
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
      const response = await axios.get(`${API_URL}/api/users/${user.id}/rubros?t=${Date.now()}`);
      console.log('Rubros response:', response.data);
      
      if (response.data.success) {
        let all = response.data.all_rubros;
        const selected = response.data.selected_rubros || [];
        
        // Fallback: si no viene all_rubros, intentar pedirlo del endpoint general
        if (!all || Object.keys(all).length === 0) {
          console.warn('all_rubros empty in user endpoint, falling back to /rubros');
          const fallbackRes = await axios.get(`${API_URL}/api/rubros`);
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
        const fallbackRes = await axios.get(`${API_URL}/api/rubros`);
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
      const response = await axios.post(`${API_URL}/api/users/rubros`, {
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

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData) {
      setVerificationCode(pastedData);
      
      // Enfocar el último input llenado o el siguiente vacío si no está completo
      // Esperamos un ciclo de renderizado para enfocar
      setTimeout(() => {
        const inputs = document.querySelectorAll('.password-input-group input[inputmode="numeric"]');
        if (inputs && inputs.length > 0) {
          const indexToFocus = Math.min(pastedData.length, 5);
          inputs[indexToFocus]?.focus();
        }
      }, 0);
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
        setCanResendCode(false);
        setPasswordStep('success'); // Cambiamos a paso de éxito personalizado
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
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordChangeEmail(user?.email || '');
        setVerificationCode('');
        setCodeSent(false);
        setResendCountdown(0);
        setCanResendCode(false);
        setPasswordStep('success'); // Cambiamos a paso de éxito personalizado
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

  const handleUpdatePhone = async () => {
    const phoneVal = validatePhone(phoneForm.number, phoneForm.countryCode);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.message);
      return;
    }
    
    setPhoneLoading(true);
    setPhoneError('');
    
    try {
      const fullPhone = `${phoneForm.countryCode} ${phoneForm.number}`;
      const { error } = await supabase
        .from('users')
        .update({ phone: fullPhone })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Actualizar el objeto user localmente
      toastSuccess?.('Teléfono actualizado correctamente');
      setShowPhoneModal(false);
      // Recargar la página o actualizar el estado global si es necesario
      window.location.reload(); 
    } catch (err) {
      console.error('Error updating phone:', err);
      setPhoneError('No se pudo actualizar el teléfono. Intentá de nuevo.');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleCancelPlan = () => {
    setShowCancelPlanModal(true);
  };

  const confirmCancelPlan = async () => {
    setCancelPlanLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/users/${user.id}/cancel-plan`);
      if (response.data.success) {
        toastSuccess?.('Plan cancelado correctamente');
        fetchCredits(); // Recargar datos para actualizar la UI
        setShowCancelPlanModal(false);
      }
    } catch (error) {
      console.error('Error cancelling plan:', error);
      toastError?.('No se pudo cancelar el plan');
    } finally {
      setCancelPlanLoading(false);
    }
  };
    
  const handleBuyPack = () => {
    if (!selectedRechargePack) return;
    navigate(`/checkout?type=credits&amount=${selectedRechargePack.amount}&price=${selectedRechargePack.price}&currency=${rechargeCurrency}`);
  };

  const handleSelectPlan = (planId) => {
      navigate(`/checkout?plan=${planId}`);
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
              className={`profile-nav-item ${activeTab === 'plan' ? 'active' : ''}`}
              onClick={() => setActiveTab('plan')}
            >
              <FiActivity size={18} />
              <span>Mi Plan</span>
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
              
              <div className="profile-split-container">
                {/* Left Column: User Data */}
                <div className="profile-data-column">
                  <div className="profile-info-stack">
                    <div className="profile-field-vertical">
                      <label className="profile-field-label">Nombre</label>
                      <div className="profile-field-value">{user?.name || 'Usuario'}</div>
                    </div>
                    
                    <div className="profile-field-vertical">
                      <label className="profile-field-label">Email</label>
                      <div className="profile-field-value">{user?.email}</div>
                    </div>
                    
                    <div className="profile-field-vertical">
                      <label className="profile-field-label">Teléfono</label>
                      <div className="profile-field-value">
                        <span>
                          {user?.phone && user.phone.length > 6 ? user.phone : <span className="text-muted">No especificado</span>}
                        </span>
                        <button 
                          className="profile-inline-link"
                          onClick={() => {
                            if (user?.phone) {
                              const parts = user.phone.split(' ');
                              if (parts.length > 1) {
                                setPhoneForm({ countryCode: parts[0], number: parts.slice(1).join('') });
                              } else {
                                setPhoneForm({ ...phoneForm, number: user.phone });
                              }
                            }
                            setShowPhoneModal(true);
                          }}
                          style={{ marginLeft: '8px' }}
                          title="Editar teléfono"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="profile-field-vertical">
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
                </div>

                {/* Right Column: Connections */}
                <div className="profile-connections-column">
                  <div className="connections-card">
                    <p className="connections-helper-text">
                      Conectá tu correo para gestionar tus campañas de Email Marketing
                    </p>
                    
                    <div className="integrations-list">
                      {/* Gmail Connection */}
                      <div className={`integration-item ${authStatus?.google?.connected ? 'connected' : ''}`}>
                        <div className="integration-icon-bg gmail">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="#EA4335"/>
                          </svg>
                        </div>
                        <div className="integration-details">
                          <span className="integration-name">Gmail</span>
                          {authStatus?.google?.connected && <span className="integration-status">Conectado</span>}
                        </div>
                        {authStatus?.google?.connected ? (
                          <button onClick={() => handleDisconnectProvider('google')} className="btn-disconnect-minimal">
                            Desconectar
                          </button>
                        ) : (
                          <button onClick={handleConnectGoogle} className="btn-connect-minimal gmail">
                            Conectar
                          </button>
                        )}
                      </div>

                      {/* Outlook Connection */}
                      <div className={`integration-item ${authStatus?.outlook?.connected ? 'connected' : ''}`}>
                        <div className="integration-icon-bg outlook">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 18L10.2 21.3V2.7L1 6V18ZM23 7.3V16.7L11.5 19.8V4.2L23 7.3ZM23 18.2L11 22V19.2L23 16.7V18.2ZM11 2V4.8L23 7.3V5.8L11 2Z" fill="#0078D4"/>
                          </svg>
                        </div>
                        <div className="integration-details">
                          <span className="integration-name">Outlook</span>
                          {authStatus?.outlook?.connected && <span className="integration-status">Conectado</span>}
                        </div>
                        {authStatus?.outlook?.connected ? (
                          <button onClick={() => handleDisconnectProvider('outlook')} className="btn-disconnect-minimal">
                            Desconectar
                          </button>
                        ) : (
                          <button onClick={handleConnectOutlook} className="btn-connect-minimal outlook">
                            Conectar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="profile-section-fade-in minimalist-credits">
              
              {/* HEADER PLAN */}
              <div className="minimalist-credits-header">
                <h3 className="profile-subsection-title">
                  {creditsInfo.subscription_status === 'active' ? 'Tu Plan Activo' : 'Elegí tu Plan'}
                </h3>
                  {creditsInfo.subscription_status === 'active' && (
                    <div className="minimalist-balance-row">
                      <span className="minimalist-balance-value">{creditsInfo.credits || 0}</span>
                      <span className="minimalist-balance-label">/ {creditsInfo.total_credits || 1500} créditos</span>
                    </div>
                  )}
              </div>

              {/* SI EL PLAN ESTÁ ACTIVO: MOSTRAR CRÉDITOS Y BOTÓN CANCELAR */}
              {creditsInfo.subscription_status === 'active' ? (
                <>
                  <div className="minimalist-progress-wrapper">
                    <div className="minimalist-progress-track">
                      <div 
                        className={`minimalist-progress-fill ${(creditsInfo.credits || 0) < ((creditsInfo.total_credits || 1500) * 0.2) ? 'low' : ''}`}
                        style={{ width: `${Math.min(100, Math.round(((creditsInfo.credits || 0) / (creditsInfo.total_credits || 1500)) * 100))}%` }}
                      ></div>
                    </div>
                    <div className="minimalist-progress-info">
                      <span>{Math.max(0, Math.round(((creditsInfo.total_credits - creditsInfo.credits) / creditsInfo.total_credits) * 100))}% consumido</span>
                      <span className="renewal-badge">
                        Renovación: {creditsInfo.next_reset ? new Date(creditsInfo.next_reset).toLocaleDateString() : 'Pendiente'}
                      </span>
                    </div>
                  </div>

                  {creditsInfo.credits === 0 && (
                    <div className="minimalist-alert-simple exhausted">
                      <span className="alert-dot"></span>
                      Has agotado tus créditos para este mes.
                    </div>
                  )}

                  <div className="minimalist-actions-grid">
                    <div className="minimalist-action-item">
                      <h3>{creditsInfo.plan === 'starter' ? 'Upgrade a Growth' : 'Upgrade a Scale'}</h3>
                      <p>Aumenta tu cupo mensual de {creditsInfo.total_credits || 1500} a {creditsInfo.plan === 'starter' ? '3,000' : '10,000'} créditos.</p>
                      <button className="minimalist-btn-primary" onClick={() => setShowUpgradeModal(true)}>
                        Subir de Nivel
                      </button>
                    </div>
                    <div className="minimalist-action-item">
                      <h3>Recargar Créditos</h3>
                      <p>Adquiere un pack adicional para usar solo este mes.</p>
                      <button className="minimalist-btn-secondary" onClick={() => setShowRechargeModal(true)}>
                        Ver Packs
                      </button>
                    </div>
                  </div>

                  <div className="profile-active-plan-footer">
                    <div className="plan-status-info">
                        <h4 className="plan-name-footer">Plan {creditsInfo.plan ? creditsInfo.plan.charAt(0).toUpperCase() + creditsInfo.plan.slice(1) : 'Actual'}</h4>
                        <p className="plan-status-text">Tu suscripción está activa.</p>
                    </div>
                    <button 
                        onClick={handleCancelPlan}
                        className="btn-cancel-subscription"
                    >
                        Cancelar suscripción
                    </button>
                  </div>
                </>
              ) : (
                /* SI NO HAY PLAN ACTIVO: MOSTRAR PRICING CARDS */
                <div className="pricing-grid-profile">
                   {/* STARTER */}
                   <div className="pricing-card-profile">
                      <h3>Starter</h3>
                      <div className="price-profile">$100 USD <span>/mes</span></div>
                      <p className="price-ars-profile">$100 ARS</p>
                      <ul className="profile-pkg-features">
                        <li>1,500 Créditos mensuales</li>
                        <li>Búsqueda por Mapa</li>
                        <li>Soporte básico</li>
                      </ul>
                      <button className="btn-profile-subscribe" onClick={() => handleSelectPlan('starter')}>
                        Elegir Starter
                      </button>
                   </div>

                   {/* GROWTH */}
                   <div className="pricing-card-profile featured">
                      <h3>Growth</h3>
                      <div className="price-profile">$100 USD <span>/mes</span></div>
                      <p className="price-ars-profile">$100 ARS</p>
                      <ul className="profile-pkg-features">
                        <li>5,000 Créditos mensuales</li>
                        <li>Búsqueda Avanzada</li>
                        <li>Soporte prioritario</li>
                      </ul>
                      <button className="btn-profile-subscribe primary" onClick={() => handleSelectPlan('growth')}>
                        Elegir Growth
                      </button>
                   </div>

                   {/* SCALE */}
                   <div className="pricing-card-profile">
                      <h3>Scale</h3>
                      <div className="price-profile">$100 USD <span>/mes</span></div>
                      <p className="price-ars-profile">$100 ARS</p>
                      <ul className="profile-pkg-features">
                        <li>10,000 Créditos mensuales</li>
                        <li>API Access (Beta)</li>
                        <li>Soporte 24/7</li>
                      </ul>
                      <button className="btn-profile-subscribe" onClick={() => handleSelectPlan('scale')}>
                        Elegir Scale
                      </button>
                   </div>
                </div>
              )}


            </div>
          )}

          {activeTab === 'rubros' && (
            <div className="profile-section-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', height: '100%' }}>
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: '1.5rem' }}>
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Próximamente</h3>
                <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '300px', margin: '0 auto', lineHeight: '1.6' }}>
                  Estamos trabajando en nuevas funcionalidades para que puedas personalizar aún más tu experiencia.
                </p>
                <div style={{ marginTop: '2rem', display: 'inline-flex', padding: '0.5rem 1rem', background: '#f1f5f9', borderRadius: '100px', fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                  Disponible muy pronto
                </div>
              </div>
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
                              // Asegurar que el array tenga longitud suficiente
                              while(newCode.length <= index) newCode.push('');
                              newCode[index] = value;
                              const updatedCode = newCode.join('').slice(0, 6);
                              setVerificationCode(updatedCode);
                              
                              if (index < 5) {
                                const nextInput = e.target.parentElement.querySelectorAll('input')[index + 1];
                                if (nextInput) nextInput.focus();
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              e.preventDefault();
                              const newCode = verificationCode.split('');
                              
                              if (verificationCode[index]) {
                                newCode[index] = '';
                                setVerificationCode(newCode.join(''));
                              } else if (index > 0) {
                                newCode[index - 1] = '';
                                setVerificationCode(newCode.join(''));
                                const prevInput = e.target.parentElement.querySelectorAll('input')[index - 1];
                                if (prevInput) prevInput.focus();
                              }
                            }
                          }}
                          disabled={codeLoading}
                          autoFocus={index === 0}
                          style={{ 
                            width: '44px',
                            height: '52px',
                            textAlign: 'center', 
                            fontSize: '20px', 
                            border: '2px solid #e2e8f0',
                            borderRadius: '10px',
                            outline: 'none'
                          }}
                          onPaste={handlePaste}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                        Expira en 10 min
                      </p>
                      {canResendCode ? (
                        <button
                          type="button"
                          onClick={handleRequestCode}
                          className="profile-inline-link"
                          style={{ fontSize: '12px' }}
                        >
                          Reenviar código
                        </button>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                          Reenviar en {resendCountdown}s
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
                    ✓ Código verificado. Ahora podés cambiar tu contraseña.
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

              {passwordStep === 'success' && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    background: '#dcfce7', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 20px auto' 
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', color: '#0f172a' }}>¡Contraseña actualizada!</h3>
                  <p style={{ color: '#64748b', marginBottom: '24px' }}>
                    Tu contraseña ha sido cambiada exitosamente. La próxima vez que inicies sesión, debés usar tu nueva clave.
                  </p>
                  <button 
                    className="password-save-btn"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordStep('request');
                    }}
                    style={{ width: '100%', padding: '12px' }}
                  >
                    Entendido
                  </button>
                </div>
              )}
            </div>
            
            {passwordStep !== 'success' && (
            <div className="password-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordStep('request');
                  setVerificationCode('');
                }}
                disabled={passwordLoading || codeLoading}
              >
                Cancelar
              </button>
              {passwordStep === 'request' && (
                <button className="password-save-btn" onClick={handleRequestCode} disabled={codeLoading}>
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
                <button className="password-save-btn" onClick={handleChangePassword} disabled={passwordLoading}>
                  {passwordLoading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para editar teléfono */}
      {showPhoneModal && (
        <div className="password-modal-overlay">
          <div className="password-modal">
            <div className="password-modal-header">
              <h3>Actualizar Teléfono</h3>
            </div>
            
            <div className="password-modal-body">
              {phoneError && (
                <div className="password-error">
                  {phoneError}
                </div>
              )}
              
              <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '14px' }}>
                Ingresá tu número de teléfono de contacto para que podamos comunicarnos con vos.
              </p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select 
                  value={phoneForm.countryCode}
                  onChange={(e) => setPhoneForm({ ...phoneForm, countryCode: e.target.value })}
                  style={{
                    width: '100px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    background: '#f8fafc',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="+54">🇦🇷 +54</option>
                  <option value="+55">🇧🇷 +55</option>
                  <option value="+56">🇨🇱 +56</option>
                  <option value="+57">🇨🇴 +57</option>
                  <option value="+598">🇺🇾 +598</option>
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+34">🇪🇸 +34</option>
                </select>
                <input 
                  type="tel" 
                  placeholder="Ej: 11 1234-5678" 
                  value={phoneForm.number}
                  onChange={(e) => setPhoneForm({ ...phoneForm, number: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: phoneError ? '1px solid #ef4444' : '1px solid #e2e8f0',
                    fontSize: '14px',
                    background: '#f8fafc',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="password-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowPhoneModal(false);
                  setPhoneError('');
                }}
                disabled={phoneLoading}
              >
                Cancelar
              </button>
              <button 
                className="password-save-btn"
                onClick={handleUpdatePhone}
                disabled={phoneLoading || !phoneForm.number}
              >
                {phoneLoading ? 'Guardando...' : 'Guardar'}
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



      {/* Modal de recarga de créditos */}
      {showRechargeModal && (
        <div className="password-modal-overlay">
          <div className="password-modal">
            <div className="password-modal-header">
              <h3>Recargar Créditos</h3>
            </div>
            
            <div className="password-modal-body">
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                Seleccioná el pack de créditos que mejor se adapte a tus necesidades.
              </p>
              {/* Currency Toggle */}
              <div className="currency-toggle-container">
                <div className="currency-toggle">
                  <button 
                    className={`currency-btn ${rechargeCurrency === 'ARS' ? 'active' : ''}`}
                    onClick={() => {
                        setRechargeCurrency('ARS');
                        setSelectedRechargePack(null);
                    }}
                  >
                    ARS
                  </button>
                  <button 
                    className={`currency-btn ${rechargeCurrency === 'USD' ? 'active' : ''}`}
                    onClick={() => {
                        setRechargeCurrency('USD');
                        setSelectedRechargePack(null);
                    }}
                  >
                    USD <span style={{ 
                      fontSize: '0.6rem', 
                      opacity: 0.7, 
                      fontWeight: 400,
                      marginLeft: '2px'
                    }}>(Soon)</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
                {/* Pack 1 */}
                <button 
                  onClick={() => setSelectedRechargePack({ amount: 1000, price: rechargeCurrency === 'ARS' ? 1499 : 4 })}
                  className="recharge-pack-card"
                  style={{
                    background: selectedRechargePack?.amount === 1000 ? '#f0f9ff' : 'white',
                    border: selectedRechargePack?.amount === 1000 ? '2px solid #0f172a' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: rechargeCurrency === 'USD' ? 0.65 : 1,
                    cursor: rechargeCurrency === 'USD' ? 'not-allowed' : 'pointer',
                    pointerEvents: rechargeCurrency === 'USD' ? 'none' : 'auto'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>1,000</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>créditos</div>
                  <div style={{ marginTop: '0.5rem', background: selectedRechargePack?.amount === 1000 ? '#0f172a' : '#f1f5f9', padding: '4px 12px', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 700, color: selectedRechargePack?.amount === 1000 ? 'white' : '#0f172a' }}>
                    {rechargeCurrency === 'ARS' ? '$1499' : '$4 (Soon)'}
                  </div>
                </button>

                {/* Pack 2 */}
                <button 
                  onClick={() => setSelectedRechargePack({ amount: 5000, price: rechargeCurrency === 'ARS' ? 4999 : 6 })}
                  className="recharge-pack-card"
                  style={{
                    background: selectedRechargePack?.amount === 5000 ? '#f0f9ff' : 'white',
                    border: selectedRechargePack?.amount === 5000 ? '2px solid #0f172a' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: rechargeCurrency === 'USD' ? 0.65 : 1,
                    cursor: rechargeCurrency === 'USD' ? 'not-allowed' : 'pointer',
                    pointerEvents: rechargeCurrency === 'USD' ? 'none' : 'auto'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0, background: '#0f172a', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderBottomLeftRadius: '8px' }}>POPULAR</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>5,000</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>créditos</div>
                  <div style={{ marginTop: '0.5rem', background: selectedRechargePack?.amount === 5000 ? '#0f172a' : '#f1f5f9', padding: '4px 12px', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 700, color: selectedRechargePack?.amount === 5000 ? 'white' : '#0f172a' }}>
                    {rechargeCurrency === 'ARS' ? '$4999' : '$6 (Soon)'}
                  </div>
                </button>

                {/* Pack 3 */}
                <button 
                  onClick={() => setSelectedRechargePack({ amount: 10000, price: rechargeCurrency === 'ARS' ? 8999 : 7 })}
                  className="recharge-pack-card"
                  style={{
                    background: selectedRechargePack?.amount === 10000 ? '#f0f9ff' : 'white',
                    border: selectedRechargePack?.amount === 10000 ? '2px solid #0f172a' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: rechargeCurrency === 'USD' ? 0.65 : 1,
                    cursor: rechargeCurrency === 'USD' ? 'not-allowed' : 'pointer',
                    pointerEvents: rechargeCurrency === 'USD' ? 'none' : 'auto'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>10,000</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>créditos</div>
                  <div style={{ marginTop: '0.5rem', background: selectedRechargePack?.amount === 10000 ? '#0f172a' : '#f1f5f9', padding: '4px 12px', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 700, color: selectedRechargePack?.amount === 10000 ? 'white' : '#0f172a' }}>
                    {rechargeCurrency === 'ARS' ? '$8999' : '$7 (Soon)'}
                  </div>
                </button>
              </div>
            </div>
            
            <div className="password-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowRechargeModal(false);
                  setSelectedRechargePack(null);
                }}
              >
                Cancelar
              </button>
              <button 
                className="password-save-btn"
                onClick={handleBuyPack}
                disabled={!selectedRechargePack}
                style={{ opacity: !selectedRechargePack ? 0.5 : 1 }}
              >
                Comprar Pack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upgrade de Plan */}
      {showUpgradeModal && (
        <div className="password-modal-overlay">
          <div className="password-modal" style={{ maxWidth: '600px' }}>
            <div className="password-modal-header">
              <h3>Mejorar tu Plan</h3>
              <p className="delete-modal-subtitle">Elegí el plan que mejor se adapte a tu crecimiento</p>
            </div>
            
            <div className="password-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '1.5rem' }}>
                {/* Growth Plan */}
                {creditsInfo.plan === 'starter' && (
                  <button 
                    onClick={() => setSelectedUpgradePlan({ id: 'growth', name: 'Growth', price: 100, credits: 5000 })}
                    className="recharge-pack-card"
                    style={{
                      background: selectedUpgradePlan?.id === 'growth' ? '#f0f9ff' : 'white',
                      border: selectedUpgradePlan?.id === 'growth' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative'
                    }}
                  >
                    {selectedUpgradePlan?.id === 'growth' && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#0f172a' }}>
                        <FiCheck size={20} />
                      </div>
                    )}
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Growth</div>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.4' }}>
                      Ideal para escalar tu prospección con 5,000 créditos mensuales.
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>$100</span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}> /mes</span>
                    </div>
                  </button>
                )}

                {/* Scale Plan */}
                <button 
                  onClick={() => setSelectedUpgradePlan({ id: 'scale', name: 'Scale', price: 100, credits: 10000 })}
                  className="recharge-pack-card"
                  style={{
                    background: selectedUpgradePlan?.id === 'scale' ? '#f0f9ff' : 'white',
                    border: selectedUpgradePlan?.id === 'scale' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative'
                  }}
                >
                  {selectedUpgradePlan?.id === 'scale' && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#0f172a' }}>
                      <FiCheck size={20} />
                    </div>
                  )}
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Scale</div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.4' }}>
                    Máximo volumen con 10,000 créditos y acceso a API.
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>$100</span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}> /mes</span>
                  </div>
                </button>
              </div>

              {selectedUpgradePlan && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                    Pasarás de {creditsInfo.total_credits || 1500} a <strong>{selectedUpgradePlan.credits.toLocaleString()} créditos</strong> mensuales.
                  </p>
                </div>
              )}
            </div>
            
            <div className="password-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedUpgradePlan(null);
                }}
              >
                Cancelar
              </button>
              <button 
                className="password-save-btn"
                onClick={() => {
                  if (selectedUpgradePlan) {
                    navigate(`/checkout?plan=${selectedUpgradePlan.id}`);
                    setShowUpgradeModal(false);
                    setSelectedUpgradePlan(null);
                  }
                }}
                disabled={!selectedUpgradePlan}
                style={{ 
                  opacity: !selectedUpgradePlan ? 0.5 : 1,
                  cursor: !selectedUpgradePlan ? 'not-allowed' : 'pointer'
                }}
              >
                Mejorar Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación cancelar plan */}
      {showCancelPlanModal && (
        <div className="password-modal-overlay">
          <div className="password-modal">
            <div className="password-modal-header">
              <h3>Cancelar Suscripción</h3>
            </div>
            
            <div className="password-modal-body">
              <div style={{ 
                background: '#fff5f5', 
                border: '1px solid #feb2b2', 
                borderRadius: '12px', 
                padding: '1.25rem',
                marginBottom: '1.5rem' 
              }}>
                <h4 style={{ 
                  color: '#c53030', 
                  fontSize: '0.95rem', 
                  fontWeight: 600, 
                  margin: '0 0 0.75rem 0' 
                }}>
                  ¿Estás seguro de que deseas cancelar?
                </h4>
                <p style={{ 
                  color: '#9b2c2c', 
                  fontSize: '0.9rem', 
                  margin: 0, 
                  lineHeight: '1.5' 
                }}>
                  Al cancelar tu suscripción, perderás el acceso a la plataforma al finalizar el período actual de facturación.
                </p>
              </div>
            </div>
            
            <div className="password-modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowCancelPlanModal(false)}
                disabled={cancelPlanLoading}
              >
                Mantener mi plan
              </button>
              <button 
                className="password-save-btn"
                onClick={confirmCancelPlan}
                disabled={cancelPlanLoading}
                style={{ background: '#dc2626' }}
              >
                {cancelPlanLoading ? 'Cancelando...' : 'Sí, cancelar suscripción'}
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





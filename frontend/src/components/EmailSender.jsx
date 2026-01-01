import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../AuthWrapper';
import { API_URL } from '../config';
import GmailConnection from './GmailConnection';
import './EmailSender.css';

function EmailSender({ empresas, onClose, embedded = false }) {
  // Bloquear scroll del body cuando el modal está abierto (solo si no está embedded)
  useEffect(() => {
    if (!embedded) {
      const scrollY = window.scrollY;
      document.body.classList.add('modal-open');
      document.body.style.top = `-${scrollY}px`;
      
      return () => {
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        if (scrollY) {
          window.scrollTo(0, scrollY);
        }
      };
    }
  }, [embedded]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedEmpresas, setSelectedEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [asuntoPersonalizado, setAsuntoPersonalizado] = useState('');
  const [modo, setModo] = useState('individual');
  const [delaySegundos, setDelaySegundos] = useState(1.0);
  const [activeTab, setActiveTab] = useState('enviar'); // 'enviar' o 'templates'
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [gmailStatus, setGmailStatus] = useState({ connected: false, loading: true });
  const { user } = useAuth();
  const { toasts, success, error: toastError, warning, removeToast } = useToast();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    loadTemplates();
    checkGmailStatus();
  }, [user]);

  const checkGmailStatus = async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get(`${API_URL}/auth/google/status/${user.id}`);
      setGmailStatus({ 
        connected: response.data.connected, 
        loading: false,
        email: response.data.account_email 
      });
    } catch (error) {
      console.error("Error checking Gmail status:", error);
      setGmailStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/templates`);
      setTemplates(response.data.data || []);
      // Eliminamos la selección automática del primer template
    } catch (err) {
      console.error('Error cargando templates:', err);
      toastError(
        <>
          <strong>No se pudieron cargar los templates</strong>
          <p>{err.response?.data?.detail || err.message}</p>
        </>
      );
    }
  };

  const wrapInPremiumTemplate = (content, empresa) => {
    // Escapar variables básicas
    const escape = (text) => text?.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m])) || '';

    const formattedContent = content.replace(/\n/g, '<br/>');
    const senderName = user?.name || user?.email?.split('@')[0] || 'Un profesional';
    const senderEmail = user?.email || '';

    return `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.8; color: #1e293b; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="padding: 40px 32px;">
          <div style="font-size: 16px; color: #334155;">
            ${formattedContent}
          </div>
          <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 16px;">${escape(senderName)}</p>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">${escape(senderEmail)}</p>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">Email enviado de forma segura.</p>
        </div>
      </div>
    `;
  };

  const generatePreview = (empresa) => {
    if (!selectedTemplate) return null;
    
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return null;

    // Escapar HTML en variables para prevenir XSS
    const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    };

    const variables = {
      nombre_empresa: escapeHtml(empresa.nombre || ''),
      rubro: escapeHtml(empresa.rubro || ''),
      ciudad: escapeHtml(empresa.ciudad || ''),
      direccion: escapeHtml(empresa.direccion || ''),
      website: escapeHtml(empresa.website || ''),
      fecha: new Date().toLocaleDateString()
    };

    let subject = asuntoPersonalizado || template.subject || '';
    let bodyPlainText = template.body_text || template.body_html || '';

    // Reemplazar variables
    Object.keys(variables).forEach(key => {
      const value = variables[key] || '';
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      subject = subject.replace(regex, value);
      bodyPlainText = bodyPlainText.replace(regex, value);
    });

    const body = wrapInPremiumTemplate(bodyPlainText, empresa);

    return { subject, body };
  };

  const handleToggleEmpresa = (empresa) => {
    if (!empresa.email) {
      warning(
        <>
          <strong>Esta empresa no tiene email</strong>
          <p>Solo puedes elegir empresas con email válido.</p>
        </>
      );
      return;
    }

    if (modo === 'individual') {
      const isSelected = selectedEmpresas.some(e => e.id === empresa.id);
      if (isSelected) {
        setSelectedEmpresas([]);
      } else {
        setSelectedEmpresas([empresa]);
      }
    } else {
      const exists = selectedEmpresas.find(e => e.id === empresa.id);
      if (exists) {
        setSelectedEmpresas(selectedEmpresas.filter(e => e.id !== empresa.id));
      } else {
        setSelectedEmpresas([...selectedEmpresas, empresa]);
      }
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('¿Eliminar este template? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/templates/${templateId}`);
      if (response.data.success) {
        await loadTemplates();
        if (selectedTemplate === templateId) {
          setSelectedTemplate(null);
          if (templates.length > 1) {
            const remaining = templates.filter(t => t.id !== templateId);
            if (remaining.length > 0) {
              setSelectedTemplate(remaining[0].id);
            }
          }
        }
        success(
          <>
            <strong>Template eliminado</strong>
            <p>Se borró correctamente.</p>
          </>
        );
      }
    } catch (err) {
      console.error('Error eliminando template:', err);
      toastError(
        <>
          <strong>No se pudo eliminar</strong>
          <p>{err.response?.data?.detail || err.message}</p>
        </>
      );
    }
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      if (editingTemplate && editingTemplate.id) {
        const response = await axios.put(`${API_URL}/templates/${editingTemplate.id}`, templateData);
        if (response.data.success) {
          await loadTemplates();
          setEditingTemplate(null);
          setActiveTab('enviar');
          success(
            <>
              <strong>Template actualizado</strong>
              <p>Los cambios fueron guardados.</p>
            </>
          );
        }
      } else {
        const response = await axios.post(`${API_URL}/templates`, templateData);
        if (response.data.success) {
          await loadTemplates();
          setSelectedTemplate(response.data.template_id);
          setEditingTemplate(null);
          setActiveTab('enviar');
          success(
            <>
              <strong>Template creado</strong>
              <p>Disponible para usar en tus envíos.</p>
            </>
          );
        }
      }
    } catch (err) {
      console.error('Error guardando template:', err);
      const errorMsg = err.response?.data?.detail || err.message;
      toastError(
        <>
          <strong>No se pudo guardar</strong>
          <p>{errorMsg}</p>
        </>
      );
    }
  };

  const executeSend = async () => {
    if (loading) return;
    
    // Validaciones de seguridad antes de empezar
    if (!selectedTemplate) {
      toastError("No se ha seleccionado ningún template.");
      return;
    }
    if (selectedEmpresas.length === 0) {
      toastError("No hay empresas seleccionadas para enviar.");
      return;
    }

    console.log("🚀 Iniciando envío. Modo:", modo, "Total:", selectedEmpresas.length);
    setLoading(true);
    setShowConfirmModal(false);

    try {
      const templateIdNum = parseInt(selectedTemplate);
      
      if (modo === 'individual' || selectedEmpresas.length === 1) {
        const targetEmpresa = selectedEmpresas[0];
        if (!targetEmpresa?.id) throw new Error("Datos de empresa insuficientes (falta ID)");

        const payload = {
          empresa_id: targetEmpresa.id,
          template_id: templateIdNum,
          asunto_personalizado: asuntoPersonalizado || null,
          user_id: user?.id || null
        };
        
        console.log("Enviando individual:", payload);
        const response = await axios.post(`${API_URL}/email/enviar`, payload);

        if (response.data.success) {
          success(
            <>
              <strong>¡Email enviado!</strong>
              <p>Se envió correctamente a {targetEmpresa.nombre}</p>
            </>
          );
          if (modo === 'individual') setSelectedEmpresas([]);
        }
      } else {
        const MAX_BATCH = 100;
        const batch = selectedEmpresas.slice(0, MAX_BATCH);
        
        const payload = {
          empresa_ids: batch.map(e => e.id),
          template_id: templateIdNum,
          asunto_personalizado: asuntoPersonalizado || null,
          delay_segundos: parseFloat(delaySegundos) || 1.0,
          user_id: user?.id || null
        };

        console.log("Enviando masivo:", payload);
        const response = await axios.post(`${API_URL}/email/enviar-masivo`, payload);

        if (response.data.success) {
          const count = response.data.sent_count || (response.data.data && response.data.data.exitosos) || batch.length;
          success(
            <>
              <strong>¡Envío completado!</strong>
              <p>Se enviaron {count} correos exitosamente.</p>
            </>
          );
          setSelectedEmpresas([]);
        }
      }
    } catch (error) {
      console.error('❌ Error en executeSend:', error);
      const msg = error.response?.data?.detail || error.message || "Error desconocido en el servidor";
      toastError(
        <>
          <strong>Error en el proceso</strong>
          <p>{typeof msg === 'string' ? msg : "Hubo un problema al procesar el envío."}</p>
        </>
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEnviar = () => {
    if (loading) return;

    if (!selectedTemplate) {
      warning("Primero seleccioná un template de la lista.");
      return;
    }

    if (selectedEmpresas.length === 0) {
      warning("Seleccioná al menos una empresa de la lista.");
      return;
    }

    // Filtrar empresas sin email de forma inmediata (local)
    const validas = selectedEmpresas.filter(e => e.email && e.email.trim());
    
    if (validas.length === 0) {
      toastError("Ninguna de las empresas seleccionadas tiene un email válido.");
      return;
    }

    if (validas.length < selectedEmpresas.length) {
      warning(`${selectedEmpresas.length - validas.length} empresas fueron descartadas por no tener email.`);
      setSelectedEmpresas(validas); // Actualizar para que la UI refleje el cambio
    }

    setShowConfirmModal(true);
  };

  const empresasConEmail = empresas.filter(e => e.email);
  const todasSeleccionadas =
    modo === 'masivo' &&
    empresasConEmail.length > 0 &&
    selectedEmpresas.length === empresasConEmail.length;

  const handleToggleSeleccionMasiva = () => {
    if (modo !== 'masivo' || empresasConEmail.length === 0) return;
    if (todasSeleccionadas) {
      setSelectedEmpresas([]);
    } else {
      setSelectedEmpresas(empresasConEmail);
    }
  };

  // Si estamos editando un template, mostrar el editor
  if (editingTemplate) {
    return (
      <TemplateEditorInline
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setEditingTemplate(null);
          setActiveTab('templates');
        }}
        embedded={embedded}
        toastWarning={warning}
      />
    );
  }

  const content = (
    <>
      {!embedded && (
        <div className="email-sender-header">
          <div className="header-title-area">
            <h2>Enviar Emails</h2>
            {gmailStatus.connected && gmailStatus.email && (
              <span className="gmail-status-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                {gmailStatus.email}
              </span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
      )}

      <div className={embedded ? "email-sender-content-embedded" : "email-sender-content"}>
        {/* Tabs */}
        <div className="email-tabs">
          <button
            className={`email-tab ${activeTab === 'enviar' ? 'active' : ''}`}
            onClick={() => setActiveTab('enviar')}
          >
            Enviar Emails
          </button>
          <button
            className={`email-tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </button>
        </div>

        {/* Tab: Enviar */}
        {activeTab === 'enviar' && (
          <div className="email-sender-layout">
            {/* Columna izquierda: Configuración */}
            <div className="email-config-column">
              <div className="config-section">
                <h3>Configuración</h3>
                
                {/* Selector de modo */}
                <div className="form-group">
                  <label>Modo de Envío</label>
                  <div className="modo-selector">
                    <button
                      type="button"
                      className={modo === 'individual' ? 'active' : ''}
                      onClick={() => {
                        setModo('individual');
                        setSelectedEmpresas(selectedEmpresas.slice(0, 1));
                      }}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      className={modo === 'masivo' ? 'active' : ''}
                      onClick={() => setModo('masivo')}
                    >
                      Masivo
                    </button>
                  </div>
                </div>

                {/* Selector de template */}
                <div className="form-group">
                  <label>Template de Email *</label>
                  <select
                    value={selectedTemplate || ''}
                    onChange={(e) => setSelectedTemplate(parseInt(e.target.value))}
                    disabled={loading}
                    className="template-select"
                  >
                    <option value="">-- Selecciona un template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Asunto personalizado */}
                <div className="form-group">
                  <label>Asunto personalizado (opcional)</label>
                  <input
                    type="text"
                    value={asuntoPersonalizado}
                    onChange={(e) => setAsuntoPersonalizado(e.target.value)}
                    placeholder="Deja vacío para usar el asunto del template"
                    disabled={loading}
                  />
                </div>

                {/* Resumen */}
                <div className="summary-box">
                  <div className="summary-item">
                    <span className="summary-label">Disponibles:</span>
                    <span className="summary-value">{empresasConEmail.length}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Seleccionadas:</span>
                    <span className="summary-value highlight">{selectedEmpresas.length}</span>
                  </div>
                </div>

                {/* Botón de envío */}
                <button
                  className="btn-send-main"
                  onClick={handleEnviar}
                  disabled={loading || !selectedTemplate || selectedEmpresas.length === 0}
                >
                  {loading ? 'Enviando...' : `Enviar${selectedEmpresas.length > 1 ? ` (${selectedEmpresas.length})` : ''}`}
                </button>
              </div>
            </div>

            {/* Columna derecha: Lista de empresas con preview */}
            <div className="email-empresas-column">
              <div className="empresas-section">
                <div className="empresas-header">
                  <h3>
                    Empresas
                    {selectedEmpresas.length > 0 && (
                      <span className="selected-badge">{selectedEmpresas.length} seleccionada{selectedEmpresas.length !== 1 ? 's' : ''}</span>
                    )}
                  </h3>
                  {modo === 'masivo' && empresasConEmail.length > 0 && (
                    <button
                      type="button"
                      className="btn-select-all"
                      onClick={handleToggleSeleccionMasiva}
                      disabled={loading}
                    >
                      {todasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas'}
                    </button>
                  )}
                </div>
                
                <div className="empresas-list-with-preview">
                  {empresasConEmail.length === 0 ? (
                    <div className="empty-state">
                      <p>No hay empresas con email disponible</p>
                    </div>
                  ) : (
                    empresasConEmail.map(empresa => {
                      const isSelected = selectedEmpresas.find(e => e.id === empresa.id);
                      const preview = isSelected && selectedTemplate ? generatePreview(empresa) : null;
                      
                      return (
                        <div
                          key={empresa.id}
                          className={`empresa-card ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="empresa-card-header">
                            <label className="empresa-checkbox">
                              <input
                                type="checkbox"
                                checked={!!isSelected}
                                onChange={() => handleToggleEmpresa(empresa)}
                              />
                              <div className="empresa-info">
                                <strong>{empresa.nombre}</strong>
                                <span className="empresa-email">{empresa.email}</span>
                                {empresa.rubro && <span className="empresa-rubro">{empresa.rubro}</span>}
                              </div>
                            </label>
                          </div>
                          
                          {isSelected && preview && (
                            <div className="empresa-preview">
                              <div className="preview-header">
                                <strong>Vista Previa</strong>
                              </div>
                              <div className="preview-subject">
                                <strong>Asunto:</strong> {preview.subject}
                              </div>
                              <div
                                className="preview-body"
                                dangerouslySetInnerHTML={{ __html: preview.body }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Templates */}
        {activeTab === 'templates' && (
          <div className="templates-tab-content">
            <div className="templates-header">
              <h3>Gestionar Templates</h3>
              <button
                className="btn-new-template-main"
                onClick={() => setEditingTemplate({ nombre: '', subject: '', body_html: '', body_text: '' })}
              >
                + Nuevo Template
              </button>
            </div>

            <div className="templates-grid">
              {templates.map(template => (
                <div key={template.id} className="template-card">
                  <div className="template-card-header">
                    <div className="template-card-title">
                      <h4>{template.nombre}</h4>
                      {template.es_default && <span className="badge-default">Por defecto</span>}
                    </div>
                    <div className="template-card-actions">
                      <button
                        className="btn-edit-template-card"
                        onClick={() => setEditingTemplate(template)}
                        title="Editar"
                      >
                        Editar
                      </button>
                      {!template.es_default && (
                        <button
                          className="btn-delete-template-card"
                          onClick={() => handleDeleteTemplate(template.id)}
                          title="Eliminar"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="template-card-subject">
                    <strong>Asunto:</strong> {template.subject}
                  </div>
                  <div className="template-card-preview">
                    <div dangerouslySetInnerHTML={{ 
                      __html: template.body_html 
                        ? (template.body_html.length > 150 
                            ? template.body_html.substring(0, 150).replace(/<[^>]*>/g, '') + '...' 
                            : template.body_html.replace(/<[^>]*>/g, ''))
                        : 'Sin contenido'
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {templates.length === 0 && (
              <div className="empty-templates">
                <p>No hay templates. Crea uno nuevo para empezar.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  // Pantalla de conexión si no está conectado
  if (!gmailStatus.loading && !gmailStatus.connected && activeTab === 'enviar') {
    return (
      <div className={embedded ? "email-sender-embedded" : "email-sender-modal"}>
        {!embedded && (
          <div className="email-sender-header">
            <h2>Enviar Emails</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        )}
        <div className="gmail-gate-container">
          <div className="gmail-gate-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </div>
          <h2>Conecta tu Gmail</h2>
          <p>
            Para poder enviar campañas de email personalizadas, primero necesitás vincular tu cuenta de Google.
          </p>
          
          <GmailConnection 
            user={user} 
            onSuccess={() => checkGmailStatus()} 
            onError={(err) => toastError(err)} 
            variant="simple"
          />
          
          <div className="gmail-gate-footer">
            Tus datos están protegidos y solo usaremos el permiso para enviar los correos que vos selecciones.
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  if (embedded) {
    return (
      <>
        <div className="email-sender-embedded">
          {content}
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <>
      <div className="email-sender-overlay" onClick={onClose}>
        <div className="email-sender-modal" onClick={(e) => e.stopPropagation()}>
          {content}
        </div>
      </div>
      
      {showConfirmModal && (
        <ConfirmSendModal 
          onConfirm={executeSend} 
          onCancel={() => setShowConfirmModal(false)} 
          count={selectedEmpresas.length}
        />
      )}
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

// Modal de confirmación personalizado
function ConfirmSendModal({ onConfirm, onCancel, count }) {
  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-modal-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </div>
        <h3>¿Confirmar envío?</h3>
        <p>
          Estás por enviar <strong>{count}</strong> {count === 1 ? 'email' : 'emails'}.
          Esta acción no se puede deshacer.
        </p>
        <div className="confirm-modal-actions">
          <button type="button" className="confirm-btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="confirm-btn-send" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onConfirm();
          }}>
            Enviar ahora
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente inline para editar templates
function TemplateEditorInline({ template, onSave, onCancel, embedded = false, toastWarning }) {
  const [nombre, setNombre] = useState(template.nombre || '');
  const [subject, setSubject] = useState(template.subject || '');
  const [bodyText, setBodyText] = useState(template.body_text || template.body_html?.replace(/<[^>]*>/g, '') || '');
  const [saving, setSaving] = useState(false);

  const variables = [
    { label: 'Nombre Empresa', value: '{nombre_empresa}' },
    { label: 'Rubro', value: '{rubro}' },
    { label: 'Ciudad', value: '{ciudad}' },
    { label: 'Dirección', value: '{direccion}' },
    { label: 'Website', value: '{website}' },
    { label: 'Fecha', value: '{fecha}' },
  ];

  const handleSave = async () => {
    if (!nombre || !subject || !bodyText) {
      toastWarning?.(
        <>
          <strong>Campos obligatorios</strong>
          <p>Completa nombre, asunto y cuerpo del mensaje antes de guardar.</p>
        </>
      );
      return;
    }

    setSaving(true);
    try {
      await onSave({
        nombre,
        subject,
        body_html: bodyText, // El backend lo recibirá como texto pero el sender lo envolverá
        body_text: bodyText
      });
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable) => {
    setBodyText(prev => prev + ' ' + variable + ' ');
  };

  return (
    <div className={`template-editor-inline ${embedded ? 'embedded' : ''}`}>
      <div className="template-editor-inline-header">
        <div className="header-icon-small">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <h3>{template.id ? 'Editar Template' : 'Nuevo Template'}</h3>
        <button className="close-btn" onClick={onCancel}>×</button>
      </div>
      <div className="template-editor-inline-content">
        <div className="form-grid">
          <div className="form-group">
            <label>Nombre del Template *</label>
            <input
              type="text"
              className="editor-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Presentación Inicial"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>Asunto del Email *</label>
            <input
              type="text"
              className="editor-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Hola {nombre_empresa}..."
              disabled={saving}
            />
          </div>
        </div>

        <div className="form-group">
          <div className="label-with-actions-inline">
            <label>Cuerpo del Mensaje *</label>
            <div className="variable-buttons-inline">
              {variables.map(v => (
                <button 
                  key={v.value} 
                  className="variable-btn-inline"
                  onClick={() => insertVariable(v.value)}
                  type="button"
                >
                  + {v.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={12}
            placeholder="Escribe tu mensaje aquí..."
            disabled={saving}
            className="template-textarea-inline"
          />
          <p className="editor-hint">
            El sistema aplicará automáticamente un formato profesional a este texto antes de enviarlo.
          </p>
        </div>

        <div className="template-editor-actions">
          <button
            className="btn-cancel"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : template.id ? 'Guardar Cambios' : 'Crear Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailSender;

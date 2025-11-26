import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import './EmailSender.css';

const API_URL = 'http://localhost:8000';

function EmailSender({ empresas, onClose, embedded = false }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedEmpresas, setSelectedEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [asuntoPersonalizado, setAsuntoPersonalizado] = useState('');
  const [modo, setModo] = useState('individual');
  const [delaySegundos, setDelaySegundos] = useState(1.0);
  const [activeTab, setActiveTab] = useState('enviar'); // 'enviar' o 'templates'
  const [editingTemplate, setEditingTemplate] = useState(null);
  const { toasts, success, error, warning, removeToast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/templates`);
      setTemplates(response.data.data || []);
      if (response.data.data && response.data.data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(response.data.data[0].id);
      }
    } catch (error) {
      console.error('Error cargando templates:', error);
      alert('Error al cargar templates');
    }
  };

  const generatePreview = (empresa) => {
    if (!selectedTemplate) return null;
    
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return null;

    const variables = {
      nombre_empresa: empresa.nombre || '',
      rubro: empresa.rubro || '',
      ciudad: empresa.ciudad || '',
      direccion: empresa.direccion || '',
      website: empresa.website || ''
    };

    let subject = asuntoPersonalizado || template.subject;
    let body = template.body_html;

    Object.keys(variables).forEach(key => {
      const value = variables[key];
      subject = subject.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });

    return { subject, body };
  };

  const handleToggleEmpresa = (empresa) => {
    if (!empresa.email) {
      alert('Esta empresa no tiene email');
      return;
    }

    if (modo === 'individual') {
      setSelectedEmpresas([empresa]);
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
        alert('Template eliminado exitosamente');
      }
    } catch (error) {
      console.error('Error eliminando template:', error);
      alert('Error al eliminar template');
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
          alert('Template actualizado exitosamente');
        }
      } else {
        const response = await axios.post(`${API_URL}/templates`, templateData);
        if (response.data.success) {
          await loadTemplates();
          setSelectedTemplate(response.data.template_id);
          setEditingTemplate(null);
          setActiveTab('enviar');
          alert('Template creado exitosamente');
        }
      }
    } catch (error) {
      console.error('Error guardando template:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleEnviar = async () => {
    if (!selectedTemplate || selectedEmpresas.length === 0) {
      alert('Selecciona un template y al menos una empresa');
      return;
    }

    if (!window.confirm(`¿Enviar email${selectedEmpresas.length > 1 ? 's' : ''} a ${selectedEmpresas.length} empresa${selectedEmpresas.length > 1 ? 's' : ''}?`)) {
      return;
    }

    setLoading(true);

    try {
      if (modo === 'individual' || selectedEmpresas.length === 1) {
        const response = await axios.post(`${API_URL}/email/enviar`, {
          empresa_id: selectedEmpresas[0].id,
          template_id: selectedTemplate,
          asunto_personalizado: asuntoPersonalizado || null
        });

        if (response.data.success) {
          success(
            <>
              <strong>Email enviado exitosamente</strong>
              <p>a {selectedEmpresas[0].nombre}</p>
            </>
          );
          onClose();
        }
      } else {
        const response = await axios.post(`${API_URL}/email/enviar-masivo`, {
          empresa_ids: selectedEmpresas.map(e => e.id),
          template_id: selectedTemplate,
          asunto_personalizado: asuntoPersonalizado || null,
          delay_segundos: delaySegundos
        });

        if (response.data.success) {
          const { exitosos, fallidos, sin_email } = response.data.data;
          success(
            <>
              <strong>Envío completado</strong>
              <ul>
                <li><strong>{exitosos}</strong> exitosos</li>
                <li><strong>{fallidos}</strong> fallidos</li>
                <li><strong>{sin_email}</strong> sin email</li>
              </ul>
            </>
          );
          onClose();
        }
      }
    } catch (error) {
      console.error('Error enviando email:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      error(`Error al enviar: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
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
      />
    );
  }

  const content = (
    <>
      {!embedded && (
        <div className="email-sender-header">
          <h2>Enviar Emails</h2>
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

                {/* Delay para envío masivo */}
                {modo === 'masivo' && (
                  <div className="form-group">
                    <label>Delay entre envíos (segundos)</label>
                    <input
                      type="number"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={delaySegundos}
                      onChange={(e) => setDelaySegundos(parseFloat(e.target.value))}
                      disabled={loading}
                    />
                  </div>
                )}

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
                    <div dangerouslySetInnerHTML={{ __html: template.body_html.substring(0, 150) + '...' }} />
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

// Componente inline para editar templates
function TemplateEditorInline({ template, onSave, onCancel, embedded = false }) {
  const [nombre, setNombre] = useState(template.nombre || '');
  const [subject, setSubject] = useState(template.subject || '');
  const [bodyHtml, setBodyHtml] = useState(template.body_html || '');
  const [bodyText, setBodyText] = useState(template.body_text || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nombre || !subject || !bodyHtml) {
      alert('Completa todos los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        nombre,
        subject,
        body_html: bodyHtml,
        body_text: bodyText || null
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`template-editor-inline ${embedded ? 'embedded' : ''}`}>
      <div className="template-editor-inline-header">
        <h3>{template.id ? 'Editar Template' : 'Nuevo Template'}</h3>
        <button className="close-btn" onClick={onCancel}>×</button>
      </div>
      <div className="template-editor-inline-content">
        <div className="form-group">
          <label>Nombre del Template *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Presentación Inicial"
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label>Asunto *</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: Hola {nombre_empresa} - Oportunidad"
            disabled={saving}
          />
          <small className="hint">Variables disponibles: {`{nombre_empresa}`}, {`{rubro}`}, {`{ciudad}`}, {`{direccion}`}, {`{website}`}, {`{fecha}`}</small>
        </div>

        <div className="form-group">
          <label>Cuerpo HTML *</label>
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={15}
            placeholder="<html>...</html>"
            disabled={saving}
            className="template-textarea"
          />
        </div>

        <div className="form-group">
          <label>Cuerpo Texto Plano (opcional)</label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={10}
            placeholder="Versión texto plano del email"
            disabled={saving}
            className="template-textarea"
          />
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
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailSender;

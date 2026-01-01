import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import { API_URL } from '../config';
import './TemplateEditor.css';

function TemplateEditor({ templateId, onClose, onSave }) {
  const [nombre, setNombre] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNew, setIsNew] = useState(!templateId);
  const { toasts, success, error: toastError, warning, removeToast } = useToast();

  const variables = [
    { label: 'Nombre Empresa', value: '{nombre_empresa}' },
    { label: 'Rubro', value: '{rubro}' },
    { label: 'Ciudad', value: '{ciudad}' },
    { label: 'Dirección', value: '{direccion}' },
    { label: 'Website', value: '{website}' },
    { label: 'Fecha', value: '{fecha}' },
  ];

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/templates/${templateId}`);
      const template = response.data.data;
      setNombre(template.nombre);
      setSubject(template.subject);
      // Usamos body_text si existe, sino limpiamos el HTML del body_html
      setBodyText(template.body_text || template.body_html?.replace(/<[^>]*>/g, '') || '');
    } catch (error) {
      console.error('Error cargando template:', error);
      toastError(
        <>
          <strong>No se pudo cargar el template</strong>
          <p>{error.response?.data?.detail || error.message}</p>
        </>
      );
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (variable) => {
    // Insertar en el cuerpo del mensaje
    setBodyText(prev => prev + ' ' + variable + ' ');
  };

  const handleSave = async () => {
    if (!nombre || !subject || !bodyText) {
      warning(
        <>
          <strong>Campos obligatorios</strong>
          <p>Nombre, asunto y cuerpo del mensaje son requeridos.</p>
        </>
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nombre,
        subject,
        body_html: bodyText, // El backend lo recibirá como texto pero el sender lo envolverá
        body_text: bodyText
      };

      if (isNew) {
        const response = await axios.post(`${API_URL}/templates`, payload);
        if (response.data.success) {
          success(
            <>
              <strong>Template creado</strong>
              <p>Se guardó "{nombre}" correctamente.</p>
            </>
          );
          onSave && onSave();
          onClose();
        }
      } else {
        const response = await axios.put(`${API_URL}/templates/${templateId}`, payload);
        if (response.data.success) {
          success(
            <>
              <strong>Template actualizado</strong>
              <p>Los cambios fueron guardados.</p>
            </>
          );
          onSave && onSave();
          onClose();
        }
      }
    } catch (error) {
      console.error('Error guardando template:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      toastError(
        <>
          <strong>No se pudo guardar</strong>
          <p>{errorMsg}</p>
        </>
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="template-editor-overlay" onClick={onClose}>
        <div className="template-editor-modal" onClick={(e) => e.stopPropagation()}>
          <div className="template-editor-header">
            <div className="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <h2>{isNew ? 'Nuevo Template' : 'Editar Template'}</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="template-editor-content">
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del Template</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Asunto del Email</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-with-actions">
                <label>Cuerpo del Mensaje</label>
                <div className="variable-buttons">
                  {variables.map(v => (
                    <button 
                      key={v.value} 
                      className="variable-btn"
                      onClick={() => insertVariable(v.value)}
                      title={`Insertar ${v.label}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={12}
                disabled={loading}
              />
              <p className="editor-hint">
                Se aplicará formato profesional automáticamente.
              </p>
            </div>

            <div className="template-editor-actions">
              <button
                className="btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn-save-premium"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Guardando...' : (isNew ? 'Crear Template' : 'Guardar Cambios')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export default TemplateEditor;


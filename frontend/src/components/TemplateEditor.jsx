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
      
      // Limpieza agresiva de HTML para mostrar solo texto plano
      let cleanBody = template.body_text || '';
      
      // Si body_text está vacío o parece HTML (contiene tags), intentar limpiar body_html
      if (!cleanBody || cleanBody.trim().startsWith('<') || cleanBody.includes('</div>')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = template.body_html || template.body_text || '';
        cleanBody = tempDiv.textContent || tempDiv.innerText || '';
      }
      
      setBodyText(cleanBody.trim());
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    success(
      <span style={{ fontSize: '0.9rem' }}>
        <strong>Copiado</strong>: {text}
      </span>
    );
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
        body_html: bodyText,
        body_text: bodyText
      };

      if (isNew) {
        const response = await axios.post(`${API_URL}/templates`, payload);
        if (response.data.success) {
          success(<strong>Template creado</strong>);
          onSave && onSave();
          onClose();
        }
      } else {
        const response = await axios.put(`${API_URL}/templates/${templateId}`, payload);
        if (response.data.success) {
          success(<strong>Cambios guardados</strong>);
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
                  placeholder="Ej: Primer contacto"
                />
              </div>

              <div className="form-group">
                <label>Asunto del Email</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                  placeholder="Ej: Propuesta para {nombre_empresa}"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-with-actions">
                <label>Cuerpo del Mensaje</label>
                <div className="variable-buttons">
                  {variables.map(v => (
                    <span 
                      key={v.value} 
                      className="variable-chip"
                      onClick={() => copyToClipboard(v.value)}
                      title="Click para copiar variable"
                    >
                      {v.value}
                    </span>
                  ))}
                </div>
              </div>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={12}
                disabled={loading}
                placeholder="Escribe tu mensaje aquí..."
              />
              <p className="editor-hint">
                Haz click en las variables de arriba para copiarlas.
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
                {loading ? 'Guardando...' : (isNew ? 'Crear' : 'Guardar')}
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


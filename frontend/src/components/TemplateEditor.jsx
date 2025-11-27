import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import './TemplateEditor.css';

function TemplateEditor({ templateId, onClose, onSave }) {
  const [nombre, setNombre] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNew, setIsNew] = useState(!templateId);

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
      setBodyHtml(template.body_html);
      setBodyText(template.body_text || '');
    } catch (error) {
      console.error('Error cargando template:', error);
      alert('Error al cargar template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nombre || !subject || !bodyHtml) {
      alert('Completa todos los campos requeridos');
      return;
    }

    setLoading(true);

    try {
      if (isNew) {
        const response = await axios.post(`${API_URL}/templates`, {
          nombre,
          subject,
          body_html: bodyHtml,
          body_text: bodyText || null
        });
        if (response.data.success) {
          alert('Template creado exitosamente');
          onSave && onSave();
          onClose();
        }
      } else {
        const response = await axios.put(`${API_URL}/templates/${templateId}`, {
          nombre,
          subject,
          body_html: bodyHtml,
          body_text: bodyText || null
        });
        if (response.data.success) {
          alert('Template actualizado exitosamente');
          onSave && onSave();
          onClose();
        }
      }
    } catch (error) {
      console.error('Error guardando template:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="template-editor-overlay" onClick={onClose}>
      <div className="template-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-editor-header">
          <h2>{isNew ? 'Nuevo Template' : 'Editar Template'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="template-editor-content">
          <div className="form-group">
            <label>Nombre del Template *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Presentación Inicial"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Asunto *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Hola {nombre_empresa} - Oportunidad"
              disabled={loading}
            />
            <small className="hint">Usa {`{nombre_empresa}`}, {`{rubro}`}, {`{ciudad}`}, etc.</small>
          </div>

          <div className="form-group">
            <label>Cuerpo HTML *</label>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={15}
              placeholder="<html>...</html>"
              disabled={loading}
            />
            <small className="hint">HTML con variables: {`{nombre_empresa}`}, {`{rubro}`}, {`{ciudad}`}, {`{direccion}`}, {`{website}`}, {`{fecha}`}</small>
          </div>

          <div className="form-group">
            <label>Cuerpo Texto Plano (opcional)</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={10}
              placeholder="Versión texto plano del email"
              disabled={loading}
            />
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
              className="btn-save"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateEditor;


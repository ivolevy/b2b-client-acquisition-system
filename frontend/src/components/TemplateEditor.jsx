import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { FiSave, FiX, FiInfo, FiTag, FiType } from 'react-icons/fi';
import './TemplateEditor.css';

function TemplateEditor({ templateId, onClose, onSave, type = 'email' }) {
  const [template, setTemplate] = useState({
    nombre: '',
    subject: '',
    body_text: '',
    body_html: '',
    type: type
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/templates/${templateId}`);
      if (response.data) {
        setTemplate(response.data);
      }
    } catch (err) {
      console.error('Error al cargar la plantilla:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!template.nombre || !template.body_text) {
      alert('Por favor complete el nombre y el cuerpo del mensaje.');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = { ...template, type: type };
      if (templateId) {
        await axios.put(`${API_URL}/templates/${templateId}`, dataToSave);
      } else {
        await axios.post(`${API_URL}/templates`, dataToSave);
      }
      onSave();
    } catch (err) {
      console.error('Error al guardar la plantilla:', err);
      alert('Error al guardar la plantilla.');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable) => {
    if (!textareaRef.current) return;
    
    // For WhatsApp we use {var}, for Email we use {{var}}
    const varTag = type === 'whatsapp' ? `{${variable}}` : `{{${variable}}}`;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = template.body_text;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = before + varTag + after;
    setTemplate({ ...template, body_text: newText });

    // Focus and move cursor
    setTimeout(() => {
      textareaRef.current.focus();
      const newPos = start + varTag.length;
      textareaRef.current.setSelectionRange(newPos, newPos);
    }, 0);
  };

  if (loading) {
    return (
      <div className="template-editor-overlay">
        <div className="template-editor-modal" style={{ alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner"></div>
          <p style={{ color: '#94a3b8', marginTop: '20px' }}>Cargando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-editor-overlay">
      <form className="template-editor-modal" onSubmit={handleSave}>
        <div className="template-editor-header">
          <FiType size={20} color="#3b82f6" />
          <h2>{templateId ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
          <button type="button" onClick={onClose} className="btn-editor-cancel" style={{ padding: '8px' }}>
            <FiX size={20} />
          </button>
        </div>

        <div className="template-editor-content">
          <div className="form-group">
            <label>Nombre de la Plantilla</label>
            <input 
              type="text" 
              placeholder="Ej: Seguimiento Post-Reunión"
              value={template.nombre}
              onChange={e => setTemplate({...template, nombre: e.target.value})}
              required
            />
          </div>

          {type === 'email' && (
            <div className="form-group">
              <label>Asunto del Correo</label>
              <input 
                type="text" 
                placeholder="Introduzca el asunto del correo..."
                value={template.subject}
                onChange={e => setTemplate({...template, subject: e.target.value})}
              />
            </div>
          )}

          <div className="variables-section">
            <label>Inserción de Variables</label>
            <div className="variable-chips-container">
              <button type="button" className="variable-chip" onClick={() => insertVariable('nombre')}>Nombre</button>
              <button type="button" className="variable-chip" onClick={() => insertVariable('empresa')}>Empresa</button>
              <button type="button" className="variable-chip" onClick={() => insertVariable('rubro')}>Rubro</button>
              <button type="button" className="variable-chip" onClick={() => insertVariable('ciudad')}>Ciudad</button>
            </div>
          </div>

          <div className="form-group">
            <label>Cuerpo del Mensaje</label>
            <textarea 
              ref={textareaRef}
              placeholder="Escriba su mensaje aquí..."
              value={template.body_text}
              onChange={e => setTemplate({...template, body_text: e.target.value})}
              required
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#64748b', fontSize: '0.75rem' }}>
              <FiInfo size={14} />
              <span>Las variables se reemplazarán automáticamente al enviar.</span>
            </div>
          </div>
        </div>

        <div className="template-editor-footer">
          <button type="button" className="btn-editor-cancel" onClick={onClose}>
            Descartar
          </button>
          <button type="submit" className="btn-editor-save" disabled={saving}>
            {saving ? 'Guardando...' : <><FiSave /> Guardar Plantilla</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TemplateEditor;

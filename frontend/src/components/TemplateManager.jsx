import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TemplateEditor from './TemplateEditor';
import './TemplateManager.css';

import { API_URL } from '../config';

function TemplateManager({ onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/templates`);
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Error cargando templates:', error);
      alert('Error al cargar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplateId(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (templateId) => {
    setEditingTemplateId(templateId);
    setShowEditor(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('¿Eliminar este template?')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/templates/${templateId}`);
      if (response.data.success) {
        alert('Template eliminado');
        loadTemplates();
      }
    } catch (error) {
      console.error('Error eliminando template:', error);
      alert('Error al eliminar template');
    }
  };

  if (showEditor) {
    return (
      <TemplateEditor
        templateId={editingTemplateId}
        onClose={() => {
          setShowEditor(false);
          setEditingTemplateId(null);
        }}
        onSave={() => {
          loadTemplates();
          setShowEditor(false);
          setEditingTemplateId(null);
        }}
      />
    );
  }

  return (
    <div className="template-manager-overlay" onClick={onClose}>
      <div className="template-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-manager-header">
          <h2>Gestionar Templates</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="template-manager-content">
          <div className="template-manager-actions">
            <button className="btn-new" onClick={handleNewTemplate}>
              + Nuevo Template
            </button>
          </div>

          {loading ? (
            <div className="loading">Cargando templates...</div>
          ) : templates.length === 0 ? (
            <div className="empty-state">
              <p>No hay templates. Crea uno nuevo para empezar.</p>
            </div>
          ) : (
            <div className="templates-list">
              {templates.map(template => (
                <div key={template.id} className="template-item">
                  <div className="template-info">
                    <h3>{template.nombre}</h3>
                    <div className="template-subject">{template.subject}</div>
                    <div className="template-meta">
                      Creado: {new Date(template.created_at).toLocaleDateString()}
                      {template.es_default && <span className="badge-default">Por defecto</span>}
                    </div>
                  </div>
                  <div className="template-actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEditTemplate(template.id)}
                    >
                      Editar
                    </button>
                    {!template.es_default && (
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateManager;


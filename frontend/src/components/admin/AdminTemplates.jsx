import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TemplateEditor from '../TemplateEditor';
import { useToast } from '../../hooks/useToast';
import { API_URL } from '../../config';
import '../TemplateManager.css'; // Reuse existing styles
import './AdminUsers.css'; // Reuse admin styles for layout consistency

function AdminTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const { success, error: toastError } = useToast();

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
      toastError(
        <>
          <strong>No se pudieron cargar los templates</strong>
          <p>{error.response?.data?.detail || error.message}</p>
        </>
      );
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
        success(
          <>
            <strong>Template eliminado</strong>
            <p>El template fue borrado correctamente.</p>
          </>
        );
        loadTemplates();
      }
    } catch (error) {
      console.error('Error eliminando template:', error);
      toastError(
        <>
          <strong>No se pudo eliminar</strong>
          <p>{error.response?.data?.detail || error.message}</p>
        </>
      );
    }
  };

  // If editor is open, it takes over the view (or we could show it as a modal on top of this page)
  // Reusing TemplateEditor which is designed as a block. 
  // We'll render it full width here if active.
  if (showEditor) {
    return (
      <div className="admin-templates-page" style={{ padding: '2rem' }}>
        <button 
           onClick={() => setShowEditor(false)}
           style={{ marginBottom: '1rem', background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ← Volver a la lista
        </button>
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
          // If TemplateEditor expects to be a modal, we might need to wrap it or adjust props.
          // Assuming it renders content. If it has fixed positioning, we might need a wrapper.
          // Let's assume it works as a component.
        />
      </div>
    );
  }

  return (
    <div className="admin-templates-page" style={{ padding: '2rem' }}>
      <div className="results-unified-header">
        <div className="results-title-section">
          <h2>Gestión de Plantillas</h2>
          <div className="results-counts">
            <span className="count-filtered">{templates.length}</span>
            <span className="count-label">plantillas disponibles</span>
          </div>

          <div className="header-actions" style={{ marginLeft: 'auto' }}>
            <button 
                className="btn-new" 
                onClick={handleNewTemplate}
                style={{ height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', borderRadius: '6px' }}
            >
              + Nuevo Template
            </button>
          </div>
        </div>
      </div>

      <div className="template-manager-content" style={{ padding: '24px 0' }}>
        {loading ? (
           <div style={{ textAlign: 'center', padding: '40px' }}>
             <div className="spinner"></div>
             <p>Cargando plantillas...</p>
           </div>
        ) : templates.length === 0 ? (
          <div className="empty-state">
            <p>No hay templates creados.</p>
            <button className="btn-link" onClick={handleNewTemplate}>Crear el primero</button>
          </div>
        ) : (
          <div className="templates-list">
            {templates.map(template => (
              <div key={template.id} className="template-item">
                <div className="template-info">
                  <h3>{template.nombre}</h3>
                  <div className="template-subject" style={{ maxWidth: '600px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {template.subject}
                  </div>
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
  );
}

export default AdminTemplates;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TemplateEditor from './TemplateEditor';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import { API_URL } from '../config';
import './TemplateManager.css';

function TemplateManager({ onClose, type = 'email', embedded = false }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const { toasts, success, error: toastError, removeToast } = useToast();

  // Bloquear scroll del body cuando el modal está abierto (solo si no es embedded)
  useEffect(() => {
    if (embedded) return;
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
  }, [embedded]);

  useEffect(() => {
    loadTemplates();
  }, [type]);

  // ... (keep existing functions)

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/templates?type=${type}`);
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
  
  // ... (keep handlers)
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

  if (showEditor) {
    return (
      <TemplateEditor
        templateId={editingTemplateId}
        type={type}
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

  const content = (
      <div className={embedded ? "template-manager-embedded" : "template-manager-modal"} onClick={(e) => !embedded && e.stopPropagation()}>
        <div className="template-manager-header" style={embedded ? {borderRadius: '12px 12px 0 0'} : {}}>
          <h2>Gestionar Templates ({type})</h2>
          {!embedded && <button className="close-btn" onClick={onClose}>×</button>}
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
  );

  if (embedded) {
      return (
          <>
             {content}
             <ToastContainer toasts={toasts} onRemove={removeToast} />
          </>
      );
  }

  return (
    <>
      <div className="template-manager-overlay" onClick={onClose}>
        {content}
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export default TemplateManager;


import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { API_URL } from '../config';
import TemplateEditor from './TemplateEditor';
import { 
    FiPlus, FiEdit2, FiTrash2, FiX, FiMail, 
    FiMessageSquare, FiLayout, FiSearch, FiLayers 
} from 'react-icons/fi';
import './TemplateManager.css';

function TemplateManager({ userId, onClose, type: initialType = 'email', embedded = false }) {
  const [type, setType] = useState(initialType);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for custom delete modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const loadTemplates = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/templates?user_id=${userId}&type=${type}`);
      if (response.data && response.data.data) {
        setTemplates(response.data.data);
      }
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [type, userId]);

  const handleNewTemplate = () => {
    setEditingTemplateId(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (templateId) => {
    setEditingTemplateId(templateId);
    setShowEditor(true);
  };

  const handleDeleteTemplate = (template) => {
    // Reemplaza window.confirm con modal personalizado
    setTemplateToDelete(template);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      await axios.delete(`${API_URL}/api/templates/${templateToDelete.id}?user_id=${userId}`);
      
      // Limpiar estado y recargar
      setShowDeleteConfirmModal(false);
      setTemplateToDelete(null);
      loadTemplates();
    } catch (err) {
      console.error('Error al eliminar plantilla:', err);
      alert('Error al eliminar la plantilla'); // Fallback simple para error
    }
  };

  const filteredTemplates = templates.filter(t => {
    return t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (t.subject && t.subject.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  if (showEditor) {
    return (
      <TemplateEditor 
        templateId={editingTemplateId} 
        userId={userId}
        onClose={() => setShowEditor(false)} 
        onSave={() => {
          setShowEditor(false);
          loadTemplates();
        }}
        type={type}
      />
    );
  }

  const containerClass = embedded ? "template-manager-embedded" : "template-manager-overlay";

  const content = (
    <div className={containerClass}>
      <div className="template-manager-modal">
        {!embedded && (
          <div className="template-manager-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FiLayers size={24} color="#2c5282" />
              <h2>Gestión de Plantillas</h2>
            </div>
            <button onClick={onClose} className="btn-action-icon">
              <FiX size={20} />
            </button>
          </div>
        )}

        <div className="template-manager-content">
          <div className="template-manager-actions">
            <div className="template-type-selector-pro">
              <button 
                className={`type-pill ${type === 'email' ? 'active' : ''}`}
                onClick={() => setType('email')}
              >
                <FiMail /> Emails
              </button>
              <button 
                className={`type-pill ${type === 'whatsapp' ? 'active' : ''}`}
                onClick={() => setType('whatsapp')}
              >
                <FiMessageSquare /> WhatsApp
              </button>
            </div>

            <button className="btn-new-template" onClick={handleNewTemplate}>
              <FiPlus /> Nueva {type === 'email' ? 'Plantilla Email' : 'Mensaje WhatsApp'}
            </button>
            
            <div className="search-box-minimal">
              <FiSearch />
              <input 
                type="text" 
                placeholder="Buscar plantillas..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Cargando plantillas...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="empty-state-minimal">
              <FiLayout size={48} />
              <h3>No hay plantillas</h3>
              <p>Comenzá creando tu primera plantilla personalizada.</p>
            </div>
          ) : (
            <div className="templates-list-grid">
              {filteredTemplates.map(template => (
                <div key={template.id} className="template-item-pro">
                  <div className="template-info-pro">
                    <h3>{template.nombre}</h3>
                    <div className="template-subject-pill">
                      {type === 'email' ? <FiMail size={12} /> : <FiMessageSquare size={12} />}
                      {template.subject || (type === 'whatsapp' ? 'Mensaje WhatsApp' : 'Sin asunto')}
                    </div>
                  </div>
                  
                  <div className="template-footer-pro">
                    <span className={`type-badge type-${type}`}>
                      {type === 'email' ? 'Email' : 'WhatsApp'}
                    </span>
                    {!template.es_default && (
                      <div className="template-actions-btn-group">
                        <button className="btn-action-icon" onClick={() => handleEditTemplate(template.id)} title="Editar">
                          <FiEdit2 size={16} />
                        </button>
                        <button className="btn-action-icon delete" onClick={() => handleDeleteTemplate(template)} title="Eliminar">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmación para Eliminar */}
      {showDeleteConfirmModal && (
        <div className="template-manager-overlay" style={{ zIndex: 10000 }}>
           <div className="template-manager-modal" style={{ maxWidth: '400px', padding: '24px', height: 'auto' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '50px', 
                  height: '50px', 
                  background: '#fee2e2', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px auto' 
                }}>
                  <FiTrash2 size={24} color="#dc2626" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                  ¿Eliminar plantilla?
                </h3>
                <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.95rem' }}>
                  Estás a punto de eliminar <strong>"{templateToDelete?.nombre}"</strong>. Esta acción no se puede deshacer.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button 
                    onClick={() => setShowDeleteConfirmModal(false)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDeleteTemplate}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#dc2626',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );

  if (embedded) return content;
  return createPortal(content, document.body);
}

export default TemplateManager;

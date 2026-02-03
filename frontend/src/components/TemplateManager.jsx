import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import TemplateEditor from './TemplateEditor';
import { 
    FiPlus, FiEdit2, FiTrash2, FiX, FiMail, 
    FiMessageSquare, FiLayout, FiSearch, FiLayers 
} from 'react-icons/fi';
import './TemplateManager.css';

function TemplateManager({ onClose, type = 'email', embedded = false }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/templates?type=${type}`);
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
  }, [type]);

  const handleNewTemplate = () => {
    setEditingTemplateId(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (templateId) => {
    setEditingTemplateId(templateId);
    setShowEditor(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) {
      try {
        await axios.delete(`${API_URL}/templates/${templateId}`);
        loadTemplates();
      } catch (err) {
        console.error('Error al eliminar plantilla:', err);
      }
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.subject && t.subject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (showEditor) {
    return (
      <TemplateEditor 
        templateId={editingTemplateId} 
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

  return (
    <div className={containerClass}>
      <div className="template-manager-modal">
        <div className="template-manager-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiLayers size={24} color="#3b82f6" />
            <h2>Gestión de Plantillas</h2>
          </div>
          {!embedded && (
            <button onClick={onClose} className="btn-action-icon">
              <FiX size={20} />
            </button>
          )}
        </div>

        <div className="template-manager-content">
          <div className="template-manager-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button className="btn-new-template" onClick={handleNewTemplate}>
              <FiPlus /> Nueva Plantilla
            </button>
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type="text" 
                placeholder="Buscar plantillas..." 
                className="ws-input-modern" 
                style={{ paddingLeft: '38px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '16px', color: '#64748b' }}>Cargando plantillas...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
              <FiLayout size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <h3 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>No hay plantillas</h3>
              <p style={{ color: '#64748b', margin: 0 }}>Comenzá creando tu primera plantilla personalizada.</p>
            </div>
          ) : (
            <div className="templates-list-grid">
              {filteredTemplates.map(template => (
                <div key={template.id} className="template-item-pro">
                  <div className="template-info-pro">
                    <h3>{template.nombre}</h3>
                    <div className="template-subject-pill">
                      {type === 'email' ? <FiMail size={12} style={{ marginRight: '6px' }} /> : <FiMessageSquare size={12} style={{ marginRight: '6px' }} />}
                      {template.subject || (type === 'whatsapp' ? 'Mensaje WhatsApp' : 'Sin asunto')}
                    </div>
                  </div>
                  
                  <div className="template-footer-pro">
                    <span className={`type-badge type-${type}`}>
                      {type === 'email' ? 'Email' : 'WhatsApp'}
                    </span>
                    <div className="template-actions-btn-group">
                      <button className="btn-action-icon" onClick={() => handleEditTemplate(template.id)} title="Editar">
                        <FiEdit2 size={16} />
                      </button>
                      <button className="btn-action-icon delete" onClick={() => handleDeleteTemplate(template.id)} title="Eliminar">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
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

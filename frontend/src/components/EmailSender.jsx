import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEye, FaTimes } from 'react-icons/fa';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../AuthWrapper';
import { API_URL } from '../config';
import GmailConnection from './GmailConnection';
import './EmailSender.css';

function EmailSender({ empresas, onClose, embedded = false }) {
  // Prevent body scroll only when modal
  useEffect(() => {
    if (!embedded) {
      const scrollY = window.scrollY;
      document.body.classList.add('modal-open');
      document.body.style.top = `-${scrollY}px`;
      return () => {
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        if (scrollY) window.scrollTo(0, scrollY);
      };
    }
  }, [embedded]);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedEmpresas, setSelectedEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState('individual'); // 'individual' | 'masivo'
  const [activeTab, setActiveTab] = useState('enviar'); // 'enviar' | 'templates'

  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [previewEmpresa, setPreviewEmpresa] = useState(null);
  const [gmailStatus, setGmailStatus] = useState({ connected: false, loading: true });
  
  const { user } = useAuth();
  const { toasts, success, error: toastError, warning, removeToast } = useToast();

  useEffect(() => {
    loadTemplates();
    checkGmailStatus();
  }, [user]);

  const checkGmailStatus = async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get(`${API_URL}/auth/google/status/${user.id}`);
      setGmailStatus({ 
        connected: response.data.connected, 
        loading: false, 
        email: response.data.account_email 
      });
    } catch (err) {
      console.error("Error checking Gmail:", err);
      setGmailStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await axios.get(`${API_URL}/templates`);
      setTemplates(res.data.data || []);
      if (res.data.data?.length > 0 && !selectedTemplate) {
        setSelectedTemplate(res.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
      toastError(<strong>Error cargando templates</strong>);
    }
  };

  // Logic: Wrapper & Preview
  const wrapInPremiumTemplate = (content, empresa) => {
    const senderName = user?.name || 'Representante';
    const senderEmail = user?.email || '';
    const formatted = content.replace(/\n/g, '<br/>');
    return `
      <div style="font-family: 'Inter', system-ui, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="padding: 24px;">
          <div style="font-size: 15px; line-height: 1.6;">${formatted}</div>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 14px;">
            <strong style="color: #0f172a;">${senderName}</strong><br/>
            <span style="color: #64748b;">${senderEmail}</span>
          </div>
        </div>
      </div>
    `;
  };

  const generatePreview = (empresa) => {
    if (!selectedTemplate) return null;
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return null;

    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.innerText = text || '';
      return div.innerHTML;
    };

    const variables = {
      nombre_empresa: escapeHtml(empresa.nombre),
      rubro: escapeHtml(empresa.rubro),
      ciudad: escapeHtml(empresa.ciudad),
      direccion: escapeHtml(empresa.direccion),
      website: escapeHtml(empresa.website),
      fecha: new Date().toLocaleDateString()
    };

    let subject = template.subject || '';
    let bodyText = template.body_text || template.body_html || '';

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      const val = variables[key];
      subject = subject.replace(regex, val);
      bodyText = bodyText.replace(regex, val);
    });

    return { subject, body: wrapInPremiumTemplate(bodyText, empresa) };
  };

  // Selection Logic
  const handleToggleEmpresa = (empresa) => {
    if (!empresa.email) return;

    if (modo === 'individual') {
      const isSelected = selectedEmpresas.some(e => e.id === empresa.id);
      setSelectedEmpresas(isSelected ? [] : [empresa]);
    } else {
      const isSelected = selectedEmpresas.some(e => e.id === empresa.id);
      if (isSelected) {
        setSelectedEmpresas(selectedEmpresas.filter(e => e.id !== empresa.id));
      } else {
        setSelectedEmpresas([...selectedEmpresas, empresa]);
      }
    }
  };

  const handleSelectAll = () => {
    const validos = empresas.filter(e => e.email);
    if (validos.length === 0) return;
    
    if (selectedEmpresas.length === validos.length) {
      setSelectedEmpresas([]);
    } else {
      setSelectedEmpresas(validos);
    }
  };

  // Actions
  const handleEnviar = () => {
    if (!selectedTemplate) return warning(<strong>Selecciona un template</strong>);
    if (selectedEmpresas.length === 0) return warning(<strong>Selecciona empresas</strong>);
    setShowConfirmModal(true);
  };

  const confirmSend = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      if (modo === 'individual' || selectedEmpresas.length === 1) {
        const emp = selectedEmpresas[0];
        const res = await axios.post(`${API_URL}/email/enviar`, {
          empresa_id: emp.id,
          template_id: selectedTemplate,
          user_id: user?.id,
          empresa_data: emp
        });
        if (res.data.success) {
          success(<strong>¡Email enviado a {emp.nombre}!</strong>);
          if (modo === 'individual') setSelectedEmpresas([]);
        }
      } else {
        // Mass send logic limits
        const MAX = 100;
        const toSend = selectedEmpresas.slice(0, MAX);
        const res = await axios.post(`${API_URL}/email/enviar-masivo`, {
          empresa_ids: toSend.map(e => e.id),
          template_id: selectedTemplate,
          delay_segundos: 2.0,
          user_id: user?.id
        });
        if (res.data.success) {
          success(
            <div>
              <strong>Envío completado</strong>
              <div style={{fontSize: '12px'}}>
                Exitosos: {res.data.data.exitosos} | Fallidos: {res.data.data.fallidos}
              </div>
            </div>
          );
          setSelectedEmpresas([]);
        }
      }
    } catch (err) {
      console.error(err);
      toastError(<strong>{err.response?.data?.detail || "Error al enviar"}</strong>);
    } finally {
      setLoading(false);
    }
  };

  // Template Management
  const handleSaveTemplate = async (data) => {
    try {
      if (editingTemplate?.id) {
        await axios.put(`${API_URL}/templates/${editingTemplate.id}`, data);
      } else {
        await axios.post(`${API_URL}/templates`, data);
      }
      await loadTemplates();
      setEditingTemplate(null);
      setActiveTab('templates'); // Go back to list
      success(<strong>Template guardado</strong>);
    } catch (err) {
      toastError(<strong>Error guardando template</strong>);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('¿Borrar template?')) return;
    try {
      await axios.delete(`${API_URL}/templates/${id}`);
      await loadTemplates();
      if (selectedTemplate === id) setSelectedTemplate(null);
      success(<strong>Template eliminado</strong>);
    } catch (err) {
      toastError(<strong>Error eliminando</strong>);
    }
  };

  // -- RENDERERS --

  if (editingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => setEditingTemplate(null)}
        embedded={embedded}
      />
    );
  }

  // Not Connected State
  if (!gmailStatus.loading && !gmailStatus.connected) {
    return (
      <div className={embedded ? "email-sender-embedded" : "email-sender-modal"}>
         <div style={{padding: '40px', textAlign: 'center'}}>
            <h2>Conecta tu Gmail</h2>
            <p style={{color: '#64748b', marginBottom: '24px'}}>Para enviar correos necesitas vincular tu cuenta.</p>
            <GmailConnection 
              user={user} 
              onSuccess={() => checkGmailStatus()} 
              onError={toastError}
            />
            {!embedded && <button onClick={onClose} style={{marginTop: '20px', background:'none', border:'none', textDecoration:'underline', cursor:'pointer'}}>Cancelar</button>}
         </div>
         <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  const content = (
    <>
      {/* Header */}
      {!embedded && (
        <div className="email-sender-header">
          <h2>Enviar Emails</h2>
          <div className="header-right">
             {gmailStatus.email && (
               <span className="gmail-status-pill">
                 <span style={{width: 8, height: 8, borderRadius: '50%', background: '#10b981'}}></span>
                 {gmailStatus.email}
               </span>
             )}
             <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="email-tabs">
        <button 
          className={`email-tab ${activeTab === 'enviar' ? 'active' : ''}`}
          onClick={() => setActiveTab('enviar')}
        >
          Redactar y Enviar
        </button>
        <button 
          className={`email-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
      </div>

      {activeTab === 'enviar' ? (
        <div className="email-sender-layout">
          {/* Sidebar */}
          <div className="email-config-sidebar">
            <div className="config-group">
               <label className="config-label">Modo de Envío</label>
               <div className="mode-switcher">
                 <button 
                    className={`mode-btn ${modo === 'individual' ? 'active' : ''}`}
                    onClick={() => { setModo('individual'); setSelectedEmpresas([]); }}
                 >
                   Individual
                 </button>
                 <button 
                    className={`mode-btn ${modo === 'masivo' ? 'active' : ''}`}
                    onClick={() => { setModo('masivo'); setSelectedEmpresas([]); }}
                 >
                   Masivo
                 </button>
               </div>
            </div>

            <div className="config-group">
              <label className="config-label">Template</label>
              <select 
                className="es-select" 
                value={selectedTemplate || ''} 
                onChange={e => setSelectedTemplate(parseInt(e.target.value))}
              >
                <option value="">-- Seleccionar --</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            
            <div className="config-group" style={{marginTop: 'auto'}}>
               <div className="selection-info" style={{marginBottom: '10px'}}>
                 Seleccionadas: <strong>{selectedEmpresas.length}</strong>
               </div>
               <button 
                 className="btn-primary-block" 
                 onClick={handleEnviar}
                 disabled={loading || !selectedTemplate || selectedEmpresas.length === 0}
               >
                 {loading ? 'Enviando...' : 'Enviar Correos'}
               </button>
            </div>
          </div>

          {/* List Area */}
          <div className="email-content-area">
             <div className="list-toolbar">
               <span className="selection-info">Destinatarios ({empresas.filter(e => e.email).length})</span>
               {modo === 'masivo' && (
                 <button className="btn-text" onClick={handleSelectAll}>
                   {selectedEmpresas.length === empresas.filter(e => e.email).length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                 </button>
               )}
             </div>
             
             <div className="recipients-list">
               {empresas.length === 0 && <div className="empty-placeholder">No hay empresas en la lista.</div>}
               {empresas.map(emp => {
                 if (!emp.email) return null; // Solo mostrar con email
                 const isSelected = selectedEmpresas.some(e => e.id === emp.id);
                 return (
                   <div 
                     key={emp.id} 
                     className={`recipient-row ${isSelected ? 'selected' : ''}`}
                     onClick={() => handleToggleEmpresa(emp)}
                   >
                     <input 
                       type="checkbox" 
                       className="row-check"
                       checked={isSelected}
                       readOnly
                     />
                       <div className="row-info">
                       <span className="row-name">{emp.nombre}</span>
                       <span className="row-email">{emp.email}</span>
                       <span className="row-badge">{emp.rubro}</span>
                     </div>
                     <button 
                       className="preview-btn-icon"
                       style={{background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'4px', marginLeft:'auto'}}
                       onClick={(e) => { e.stopPropagation(); setPreviewEmpresa(emp); }}
                       title="Ver vista previa"
                     >
                        <FaEye />
                     </button>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      ) : (
        /* Templates Tab */
        <div style={{padding: '24px', overflowY: 'auto'}}>
           <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
             <h3>Mis Templates</h3>
             <button className="btn-secondary" onClick={() => setEditingTemplate({nombre:'', subject:'', body_text:''})} >
               + Nuevo Template
             </button>
           </div>
           
           <div style={{display:'grid', gap:'16px', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))'}}>
             {templates.map(t => (
               <div key={t.id} style={{
                 background:'white', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'16px'
               }}>
                 <div style={{fontWeight:'600', marginBottom:'4px'}}>{t.nombre}</div>
                 <div style={{fontSize:'12px', color:'#64748b', marginBottom:'12px'}}>{t.subject}</div>
                 <div style={{display:'flex', gap:'8px'}}>
                    <button className="btn-text" onClick={() => setEditingTemplate(t)}>Editar</button>
                    {!t.es_default && <button className="btn-text" style={{color:'#ef4444'}} onClick={() => handleDeleteTemplate(t.id)}>Eliminar</button>}
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="email-sender-overlay" style={{zIndex: 1100}}>
           <div style={{background:'white', padding:'32px', borderRadius:'12px', width:'400px'}}>
              <h3 style={{margin:'0 0 16px 0'}}>Confirmar Envío</h3>
              <p>Vas a enviar <strong>{selectedEmpresas.length}</strong> correos.</p>
              {modo === 'individual' && selectedEmpresas[0] && (
                 <div style={{background:'#f8fafc', padding:'12px', borderRadius:'6px', margin:'16px 0', fontSize:'13px'}}>
                   <strong>Destino:</strong> {selectedEmpresas[0].email}<br/>
                   <strong>Template:</strong> {templates.find(t => t.id === selectedTemplate)?.nombre}
                 </div>
              )}
              <div style={{display:'flex', gap:'12px', marginTop:'24px'}}>
                 <button className="btn-primary-block" style={{background:'#f1f5f9', color:'#475569'}} onClick={() => setShowConfirmModal(false)}>Cancelar</button>
                 <button className="btn-primary-block" onClick={confirmSend}>Confirmar</button>
              </div>
           </div>
        </div>
      )}



      {previewEmpresa && (
        <div className="email-sender-overlay" style={{zIndex: 1200}} onClick={() => setPreviewEmpresa(null)}>
           <div className="email-sender-modal" style={{maxWidth:'700px', height:'auto', maxHeight:'90vh'}} onClick={e => e.stopPropagation()}>
              <div className="email-sender-header">
                 <h2>Vista Previa: {previewEmpresa.nombre}</h2>
                 <button className="close-btn" onClick={() => setPreviewEmpresa(null)}>×</button>
              </div>
              <div style={{padding:'24px', overflowY:'auto'}}>
                 {!selectedTemplate ? (
                    <div style={{textAlign:'center', color:'#64748b', padding:'40px'}}>
                       Selecciona un template para ver la vista previa.
                    </div>
                 ) : (
                    (() => {
                       const preview = generatePreview(previewEmpresa);
                       if (!preview) return null;
                       return (
                          <div>
                             <div style={{marginBottom:'16px', borderBottom:'1px solid #e2e8f0', paddingBottom:'12px'}}>
                                <div style={{fontSize:'13px', color:'#64748b', marginBottom:'4px'}}>Asunto:</div>
                                <div style={{fontWeight:'600', fontSize:'15px'}}>{preview.subject}</div>
                             </div>
                             <div 
                               style={{background:'#f8fafc', padding:'24px', borderRadius:'8px', border:'1px solid #e2e8f0'}}
                               dangerouslySetInnerHTML={{__html: preview.body}} 
                             />
                          </div>
                       );
                    })()
                 )}
              </div>
              <div style={{padding:'16px 24px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end'}}>
                 <button className="btn-secondary" onClick={() => setPreviewEmpresa(null)}>Cerrar</button>
              </div>
           </div>
        </div>
      )}
    </>
  );

  return embedded ? (
    <div className="email-sender-embedded">
       {content}
       <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  ) : (
    <div className="email-sender-overlay" onClick={onClose}>
       <div className="email-sender-modal" onClick={e => e.stopPropagation()}>
          {content}
       </div>
       <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// Inline Editor Component
function TemplateEditor({ template, onSave, onCancel, embedded = false }) {
  const [nombre, setNombre] = useState(template.nombre || '');
  const [subject, setSubject] = useState(template.subject || '');
  const [body, setBody] = useState(template.body_text || template.body_html || '');

  const handleSave = () => {
    onSave({ nombre, subject, body_text: body, body_html: body });
  };

  return (
    <div className={embedded ? "email-sender-embedded" : "email-sender-overlay"} style={{alignItems:'flex-start', paddingTop: embedded?0:'40px'}}>
       <div className="email-sender-modal" style={{height: embedded?'100%':'auto', maxHeight:'90vh', width:'800px'}} onClick={e => e.stopPropagation()}>
          <div className="email-sender-header">
             <h2>{template.id ? 'Editar Template' : 'Nuevo Template'}</h2>
          </div>
          <div style={{padding:'24px', flex:1, overflowY:'auto'}}>
             <div className="config-group" style={{marginBottom:'16px'}}>
                <label className="config-label">Nombre del Template</label>
                <input className="es-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Presentación Ventas" />
             </div>
             <div className="config-group" style={{marginBottom:'16px'}}>
                <label className="config-label">Asunto del Correo</label>
                <input className="es-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ej: Propuesta para {nombre_empresa}" />
             </div>
             <div className="config-group" style={{marginBottom:'16px'}}>
                <label className="config-label">
                  Cuerpo del Mensaje 
                  <span style={{fontWeight:'400', color:'#64748b', marginLeft:'8px', textTransform:'none'}}>
                    (Variables: {'{nombre_empresa}, {rubro}, {ciudad}'})
                  </span>
                </label>
                <textarea className="es-textarea" value={body} onChange={e => setBody(e.target.value)} />
             </div>
             <div className="editor-actions">
                <button className="btn-secondary" onClick={onCancel} style={{flex:1}}>Cancelar</button>
                <button className="btn-primary-block" onClick={handleSave} style={{flex:1}}>Guardar Template</button>
             </div>
          </div>
       </div>
    </div>
  );
}

export default EmailSender;

import React, { useState, useEffect, useRef } from 'react';
import './WhatsAppSender.css';
import { useAuth } from '../AuthWrapper';
import { useToast } from '../hooks/useToast';
import { 
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, 
    FiCheckSquare, FiSquare, FiSend, 
    FiUsers, FiTag, FiClock, FiMessageCircle,
    FiChevronLeft, FiChevronRight, FiPlay
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa6';

const ITEMS_PER_PAGE = 10;

const WhatsAppSender = ({ empresas = [], onClose, embedded = false }) => {
    const { user } = useAuth();
    const { success, error, warning, info } = useToast();
    const [activeTab, setActiveTab] = useState('list'); // list, templates
    const [selectedEmpresas, setSelectedEmpresas] = useState([]);
    const [templates, setTemplates] = useState([]);
    
    const [sendingState, setSendingState] = useState({
        active: false,
        currentIndex: 0,
        completed: 0
    });

    const [currentPage, setCurrentPage] = useState(1);

    // Template Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState({ id: null, nombre: '', body_text: '' });
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    
    const textareaRef = useRef(null);

    // Filter companies with phone numbers only
    const validEmpresas = empresas.filter(e => e.telefono && e.telefono.length > 5);

    useEffect(() => {
        setSelectedEmpresas(validEmpresas);
        loadTemplates();
    }, []); // Run once on mount

    const loadTemplates = () => {
        try {
            const stored = localStorage.getItem('whatsapp_templates');
            if (stored) {
                const parsed = JSON.parse(stored);
                setTemplates(parsed);
                if (parsed.length > 0 && !selectedTemplateId) {
                    setSelectedTemplateId(parsed[0].id.toString());
                }
            } else {
                // Default template
                const defaultTemplate = {
                    id: Date.now(),
                    nombre: 'Saludo Inicial',
                    body_text: 'Hola {nombre}, te contacto de...'
                };
                setTemplates([defaultTemplate]);
                localStorage.setItem('whatsapp_templates', JSON.stringify([defaultTemplate]));
                setSelectedTemplateId(defaultTemplate.id.toString());
            }
        } catch (err) {
            console.error('Error loading templates:', err);
        }
    };

    const insertVariable = (variable) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = currentTemplate.body_text;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const newText = `${before}{${variable}}${after}`; // Use single curly braces for simplicity
        
        setCurrentTemplate({ ...currentTemplate, body_text: newText });
        
        setTimeout(() => {
            textareaRef.current.focus();
            const cursorPos = start + variable.length + 2;
            textareaRef.current.setSelectionRange(cursorPos, cursorPos);
        }, 0);
    };

    const formatPhoneNumber = (phone) => {
        // Basic cleanup: remove spaces, dashes, parentheses
        let cleaned = phone.replace(/[\s\-\(\)]/g, '');
        // If it starts with 0 (e.g. 011...), remove it? Depends on country.
        // Assuming user input is messy.
        // If no country code (doesn't start with +), maybe assume Argentina (+54)? 
        // For now, let's just strip non-numeric except +
        cleaned = cleaned.replace(/[^0-9+]/g, '');
        return cleaned;
    };

    const prepareMessage = (templateBody, empresa) => {
        let msg = templateBody;
        msg = msg.replace(/{nombre}/g, empresa.nombre || 'Hola'); // Fallback if name is empty
        msg = msg.replace(/{empresa}/g, empresa.nombre || '');
        msg = msg.replace(/{rubro}/g, empresa.rubro || '');
        msg = msg.replace(/{ciudad}/g, empresa.ciudad || '');
        return encodeURIComponent(msg);
    };

    const startCampaign = () => {
        if (selectedEmpresas.length === 0) {
            warning("Seleccioná al menos un contacto.");
            return;
        }
        if (!selectedTemplateId) {
            warning("Seleccioná una plantilla.");
            return;
        }

        setSendingState({
            active: true,
            currentIndex: 0,
            completed: 0
        });
        
        // Start first one immediately
        processResult(0);
    };

    const processResult = (index) => {
        if (index >= selectedEmpresas.length) {
            success("Campaña finalizada.");
            setSendingState({ active: false, currentIndex: 0, completed: 0 });
            return;
        }

        const empresa = selectedEmpresas[index];
        const template = templates.find(t => t.id.toString() === selectedTemplateId.toString());
        const message = prepareMessage(template.body_text, empresa);
        const phone = formatPhoneNumber(empresa.telefono);
        
        const url = `https://wa.me/${phone}?text=${message}`;
        window.open(url, '_blank');
    };

    const handleNext = () => {
        const nextIndex = sendingState.currentIndex + 1;
        if (nextIndex < selectedEmpresas.length) {
            setSendingState({
                ...sendingState,
                currentIndex: nextIndex,
                completed: sendingState.completed + 1
            });
            processResult(nextIndex);
        } else {
            // Finished
            setSendingState({ active: false, currentIndex: 0, completed: 0 });
            success("¡Todos los mensajes han sido procesados!");
        }
    };

    const handleSaveTemplate = () => {
        if (!currentTemplate.nombre || !currentTemplate.body_text) {
            warning("Completá nombre y mensaje.");
            return;
        }

        let newTemplates = [...templates];
        if (currentTemplate.id) {
            const index = newTemplates.findIndex(t => t.id === currentTemplate.id);
            if (index !== -1) newTemplates[index] = currentTemplate;
        } else {
            newTemplates.push({ ...currentTemplate, id: Date.now() });
        }

        setTemplates(newTemplates);
        localStorage.setItem('whatsapp_templates', JSON.stringify(newTemplates));
        setIsEditing(false);
        success("Plantilla guardada.");
    };

    const handleDeleteTemplate = (id) => {
        if (window.confirm("¿Eliminar esta plantilla?")) {
            const newTemplates = templates.filter(t => t.id !== id);
            setTemplates(newTemplates);
            localStorage.setItem('whatsapp_templates', JSON.stringify(newTemplates));
            if (selectedTemplateId === id.toString()) setSelectedTemplateId('');
        }
    };

    const toggleEmpresa = (id) => {
        if (selectedEmpresas.find(e => e.id === id)) {
            setSelectedEmpresas(selectedEmpresas.filter(e => e.id !== id));
        } else {
            const empresa = validEmpresas.find(e => e.id === id);
            if (empresa) setSelectedEmpresas([...selectedEmpresas, empresa]);
        }
    };

    const toggleAllEmpresas = () => {
        if (selectedEmpresas.length === validEmpresas.length) {
            setSelectedEmpresas([]);
        } else {
            setSelectedEmpresas([...validEmpresas]);
        }
    };

    // Pagination
    const totalPages = Math.ceil(validEmpresas.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedEmpresas = validEmpresas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    return (
        <div className={embedded ? "whatsapp-sender-embedded" : "whatsapp-sender-overlay"}>
            <div className={embedded ? "whatsapp-sender-layout-pro" : "whatsapp-sender-modal-pro"}>
                {!embedded && (
                    <div className="whatsapp-header-simple">
                        <div className="ws-header-title">
                            <FaWhatsapp size={24} />
                            <span>Centro de Comunicación WhatsApp</span>
                        </div>
                        <button onClick={onClose} className="close-btn-minimal"><FiX /></button>
                    </div>
                )}

                <div className="email-sender-split">
                    {/* SIDEBAR */}
                    <aside className="ws-sidebar">
                        <div className="sidebar-section">
                            <label className="section-label">Configuración del Envío</label>
                            
                            <div className="sidebar-field">
                                <label className="field-label-small">Plantilla Activa</label>
                                <select 
                                    className="ws-select-modern" 
                                    value={selectedTemplateId} 
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                >
                                    <option value="">Seleccionar Plantilla...</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </select>
                            </div>

                            <div className="sending-summary-minimal">
                                <span>{selectedEmpresas.length} seleccionados</span>
                                <small>Solo contactos con teléfono visible</small>
                            </div>

                            <button 
                                className="btn-send-whatsapp" 
                                onClick={startCampaign}
                                disabled={sendingState.active || selectedEmpresas.length === 0}
                            >
                                {sendingState.active ? 'Campaña en curso...' : 'Iniciar Campaña'}
                            </button>
                        </div>
                    </aside>

                    {/* MAIN */}
                    <main className="ws-main">
                        <nav className="ws-nav-tabs">
                            <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>
                                <FiUsers /> Destinatarios ({validEmpresas.length})
                            </button>
                            <button className={activeTab === 'templates' ? 'active' : ''} onClick={() => setActiveTab('templates')}>
                                <FiMessageCircle /> Plantillas
                            </button>
                        </nav>

                        <div className="es-tab-panel">
                            {activeTab === 'list' && (
                                <div className="recipients-view" style={{display:'flex', flexDirection:'column', height:'100%'}}>
                                     <div className="view-toolbar">
                                        <button className="btn-check-all" onClick={toggleAllEmpresas}>
                                            {selectedEmpresas.length === validEmpresas.length ? <FiCheckSquare size={14} /> : <FiSquare size={14} />}
                                            {selectedEmpresas.length === validEmpresas.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                        </button>
                                        <div className="stats-selected-badge">{selectedEmpresas.length} seleccionados</div>
                                    </div>
                                    
                                    <div className="es-list-container">
                                        {paginatedEmpresas.map(empresa => (
                                            <div 
                                                key={empresa.id} 
                                                className={`es-row ${selectedEmpresas.find(e => e.id === empresa.id) ? 'selected' : ''}`}
                                                onClick={() => toggleEmpresa(empresa.id)}
                                            >
                                                <div className="row-check-area">
                                                   {selectedEmpresas.find(e => e.id === empresa.id) ? <FiCheckSquare color="#25D366" /> : <FiSquare color="#cbd5e1" />}
                                                </div>
                                                <div className="row-main-info">
                                                    <span className="row-name">{empresa.nombre}</span>
                                                    <span className="row-email">{empresa.telefono}</span>
                                                </div>
                                                <div className="row-meta">
                                                    <span className="meta-badge">{empresa.rubro}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {validEmpresas.length === 0 && (
                                            <div style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>
                                                <p>No hay empresas con teléfono en la selección actual.</p>
                                            </div>
                                        )}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="es-pagination">
                                            <button 
                                                className="btn-page-nav" 
                                                onClick={() => goToPage(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                <FiChevronLeft /> Anterior
                                            </button>
                                            <span style={{fontSize:'0.85rem', color:'#64748b'}}>Página {currentPage} de {totalPages}</span>
                                            <button 
                                                className="btn-page-nav" 
                                                onClick={() => goToPage(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                Siguiente <FiChevronRight />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'templates' && (
                                <div className="templates-view" style={{padding:'24px', height:'100%', overflowY:'auto'}}>
                                    {isEditing ? (
                                        <div className="pro-editor">
                                            <div className="editor-header-actions">
                                                <h3>{currentTemplate.id ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
                                                <button className="btn-icon" onClick={() => setIsEditing(false)}><FiX /></button>
                                            </div>
                                            <div className="editor-form">
                                                <input 
                                                    className="ws-input-modern" 
                                                    placeholder="Nombre de la plantilla" 
                                                    value={currentTemplate.nombre} 
                                                    onChange={e => setCurrentTemplate({...currentTemplate, nombre: e.target.value})} 
                                                />
                                                
                                                <div className="variable-picker">
                                                    <label>Insertar Variable:</label>
                                                    <div className="var-buttons" style={{display:'flex', gap:'8px'}}>
                                                        <button className="select-link-btn" onClick={() => insertVariable('nombre')}>Nombre</button>
                                                        <button className="select-link-btn" onClick={() => insertVariable('empresa')}>Empresa</button>
                                                        <button className="select-link-btn" onClick={() => insertVariable('rubro')}>Rubro</button>
                                                        <button className="select-link-btn" onClick={() => insertVariable('ciudad')}>Ciudad</button>
                                                    </div>
                                                </div>

                                                <textarea 
                                                    ref={textareaRef}
                                                    className="ws-textarea-modern" 
                                                    placeholder="Escribí tu mensaje de WhatsApp aquí..." 
                                                    value={currentTemplate.body_text} 
                                                    onChange={e => setCurrentTemplate({...currentTemplate, body_text: e.target.value})} 
                                                />
                                                
                                                <div className="editor-footer" style={{display:'flex', justifyContent:'flex-end', gap:'12px', marginTop:'20px'}}>
                                                    <button className="btn-cancel" style={{padding:'8px 16px', background:'none', border:'none', cursor:'pointer'}} onClick={() => setIsEditing(false)}>Descartar</button>
                                                    <button className="btn-save" style={{padding:'8px 24px', background:'#25D366', color:'white', border:'none', borderRadius:'8px', cursor:'pointer'}} onClick={handleSaveTemplate}><FiSave /> Guardar Cambios</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="templates-directory">
                                            <button className="btn-add-template-minimal" onClick={() => {
                                                setCurrentTemplate({ nombre: '', body_text: '' });
                                                setIsEditing(true);
                                            }}>
                                                <FiPlus /> Nueva Plantilla
                                            </button>
                                            
                                            <div style={{marginTop:'20px', display:'grid', gap:'16px'}}>
                                                {templates.map(t => (
                                                    <div key={t.id} className="pro-template-card" style={{padding:'16px', border:'1px solid #e2e8f0', borderRadius:'12px'}}>
                                                        <div className="card-top" style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                                                            <h4 style={{margin:0}}>{t.nombre}</h4>
                                                            <div className="card-actions" style={{display:'flex', gap:'8px'}}>
                                                                <button className="btn-tiny" onClick={() => {
                                                                    setCurrentTemplate(t);
                                                                    setIsEditing(true);
                                                                }}><FiEdit2 /></button>
                                                                <button className="btn-tiny" style={{color:'#ef4444'}} onClick={() => handleDeleteTemplate(t.id)}><FiTrash2 /></button>
                                                            </div>
                                                        </div>
                                                        <p style={{fontSize:'0.85rem', color:'#64748b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.body_text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            {/* SENDING PROGRESS MODAL */}
            {sendingState.active && (
                <div className="sending-progress-overlay">
                    <div className="sending-progress-card">
                        <div className="progress-spinner"></div>
                        <h3>Enviando Campaña</h3>
                        <p style={{color:'#64748b', margin:'8px 0'}}>
                            Procesando contacto {sendingState.currentIndex + 1} de {selectedEmpresas.length}
                        </p>
                        
                        <div className="current-lead-info">
                            <strong>{selectedEmpresas[sendingState.currentIndex]?.nombre}</strong>
                            <br/>
                            <small>{selectedEmpresas[sendingState.currentIndex]?.telefono}</small>
                        </div>
                        
                        <p style={{fontSize:'0.85rem'}}>
                            Se abrió una pestaña de WhatsApp Web. <br/>
                            Enviá el mensaje y luego hacé clic aquí.
                        </p>

                        <button className="btn-next-lead" onClick={handleNext}>
                            Siguiente Contacto <FiPlay style={{marginLeft:'8px'}}/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppSender;

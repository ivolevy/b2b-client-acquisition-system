import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import './EmailSender.css';
import GmailConnection from './GmailConnection';
import OutlookConnection from './OutlookConnection';
import { useAuth } from '../AuthWrapper';
import { useToast } from '../hooks/useToast';
import { 
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, 
    FiCheckSquare, FiSquare, FiSend, 
    FiMail, FiUsers, FiSettings, FiTag, FiClock, FiLink,
    FiChevronLeft, FiChevronRight, FiPaperclip
} from 'react-icons/fi';

const ITEMS_PER_PAGE = 10;

const EmailSender = ({ empresas = [], onClose, embedded = false }) => {
    const { user } = useAuth();
    const { success, error, warning, info } = useToast();
    const [activeTab, setActiveTab] = useState('list'); // list, templates, history
    const [selectedEmpresas, setSelectedEmpresas] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [senderProvider, setSenderProvider] = useState('google'); // google or outlook
    const [sending, setSending] = useState(false);
    const [authStatus, setAuthStatus] = useState({ google: false, outlook: false, loading: true });
    const [mode, setMode] = useState('masivo'); // individual, masivo
    const [currentPage, setCurrentPage] = useState(1);

    // Template Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState({ id: null, nombre: '', subject: '', body_text: '' });
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    
    // Attachments State
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const isAnyConnected = authStatus.google || authStatus.outlook;

    // Filter valid companies (must have email)
    const validEmpresas = React.useMemo(() => {
        return empresas.filter(e => e.email && e.email.trim() !== '' && e.email.includes('@'));
    }, [empresas]);

    useEffect(() => {
        if (validEmpresas) {
            setSelectedEmpresas(validEmpresas);
        }
        loadTemplates();
        checkAuthStatus();
    }, [validEmpresas]);

    const loadTemplates = async () => {
        try {
            const response = await axios.get(`${API_URL}/templates`);
            if (response.data && response.data.data) {
                setTemplates(response.data.data);
                if (response.data.data.length > 0 && !selectedTemplateId) {
                    setSelectedTemplateId(response.data.data[0].id.toString());
                }
            }
        } catch (err) {
            console.error('Error loading templates:', err);
        }
    };

    const checkAuthStatus = async () => {
        if (!user?.id) return;
        try {
            const response = await axios.get(`${API_URL}/auth/status/${user.id}`);
            setAuthStatus({
                google: response.data.google?.connected || false,
                outlook: response.data.outlook?.connected || false,
                loading: false
            });
            // Auto-select provider priority: Google > Outlook
            if (response.data.google?.connected) {
                setSenderProvider('google');
            } else if (response.data.outlook?.connected) {
                setSenderProvider('outlook');
            }
        } catch (err) {
            console.error('Error checking auth status:', err);
            setAuthStatus(prev => ({ ...prev, loading: false }));
        }
    };

    const insertVariable = (variable) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = currentTemplate.body_text;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const newText = `${before}{{${variable}}}${after}`;
        
        setCurrentTemplate({ ...currentTemplate, body_text: newText });
        
        // Return focus and move cursor
        setTimeout(() => {
            textareaRef.current.focus();
            const cursorPos = start + variable.length + 4;
            textareaRef.current.setSelectionRange(cursorPos, cursorPos);
        }, 0);
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB

        const newFiles = [];
        
        selectedFiles.forEach(file => {
            if (file.size > MAX_SIZE) {
                warning(`El archivo ${file.name} supera los 5MB.`);
                return;
            }
            
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                newFiles.push({
                    name: file.name,
                    type: file.type,
                    // Remove 'data:*/*;base64,' prefix
                    base64: reader.result.split(',')[1],
                    preview: reader.result
                });
                
                // If this is the last one being processed, update state
                // Note: accurate if synchronous-style but FileReader is async. 
                // A better way is Promise.all but for simplicity/speed in React state loop:
                if (newFiles.length === selectedFiles.filter(f => f.size <= MAX_SIZE).length) {
                   setFiles(prev => [...prev, ...newFiles]);
                }
            };
        });
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSendCampaign = async () => {
        const targets = mode === 'masivo' ? selectedEmpresas : (selectedEmpresas.length > 0 ? [selectedEmpresas[0]] : []);
        
        if (targets.length === 0) {
            warning("Seleccioná al menos un destinatario.");
            return;
        }
        if (!selectedTemplateId) {
            warning("Seleccioná una plantilla.");
            return;
        }
        if (senderProvider === 'google' && !authStatus.google) {
            error("Gmail no está conectado.");
            return;
        }
        if (senderProvider === 'outlook' && !authStatus.outlook) {
            error("Outlook no está conectado.");
            return;
        }

        setSending(true);
        try {
            info(`Enviando ${targets.length} correos...`);
            const response = await axios.post(`${API_URL}/email/enviar-masivo`, {
                empresa_ids: targets.map(e => e.id),
                empresas_data: targets, // Enviamos data completa (Stateless)
                template_id: parseInt(selectedTemplateId),
                user_id: user.id,
                provider: senderProvider,
                delay_segundos: 2.0,
                attachments: files.map(f => ({
                    filename: f.name,
                    content_base64: f.base64,
                    content_type: f.type
                }))
            });

            if (response.data) {
                success(`Campaña finalizada: ${response.data.exitosos} enviados.`);
                if (onClose && !embedded) {
                    setTimeout(() => onClose(), 2500);
                }
            }
        } catch (err) {
            error(err.response?.data?.detail || "Error en el envío.");
        } finally {
            setSending(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!currentTemplate.nombre || !currentTemplate.subject || !currentTemplate.body_text) {
            warning("Completá todos los campos.");
            return;
        }
        try {
            if (currentTemplate.id) {
                await axios.put(`${API_URL}/templates/${currentTemplate.id}`, currentTemplate);
                success("Plantilla actualizada.");
            } else {
                await axios.post(`${API_URL}/templates`, currentTemplate);
                success("Plantilla creada.");
            }
            setIsEditing(false);
            loadTemplates();
        } catch (err) {
            error("Error al guardar.");
        }
    };

    const toggleAllEmpresas = () => {
        if (selectedEmpresas.length === validEmpresas.length) {
            setSelectedEmpresas([]);
        } else {
            setSelectedEmpresas([...validEmpresas]);
        }
    };

    const toggleEmpresa = (id) => {
        if (selectedEmpresas.find(e => e.id === id)) {
            setSelectedEmpresas(selectedEmpresas.filter(e => e.id !== id));
        } else {
            const empresa = empresas.find(e => e.id === id);
            if (empresa) setSelectedEmpresas([...selectedEmpresas, empresa]);
        }
    };

    // --- PAGINATION LOGIC ---
    const totalPages = Math.ceil(validEmpresas.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedEmpresas = validEmpresas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // --- RENDER CONNECTION VIEW ---
    if (!authStatus.loading && !isAnyConnected) {
        return (
            <div className={embedded ? "email-sender-embedded-auth" : "email-sender-overlay"}>
                <div className={`${embedded ? "email-sender-full-refined" : "email-sender-modal-pro"} auth-selection-center`}>
                    {!embedded && <button onClick={onClose} className="close-btn-round"><FiX /></button>}
                    <div className="auth-selection-content-elegant">
                        <div className="auth-hero-icon-minimal">✉️</div>
                        <h3>Comenzá tu estrategia B2B</h3>
                        <p className="auth-subtitle-elegant">Vinculá tu cuenta para automatizar tus correos personalizados.</p>
                        
                        <div className="auth-links-container">
                            <div className="auth-link-item">
                                <GmailConnection user={user} onSuccess={checkAuthStatus} variant="link" />
                            </div>
                            <div className="auth-link-divider">|</div>
                            <div className="auth-link-item">
                                <OutlookConnection user={user} onSuccess={checkAuthStatus} variant="link" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={embedded ? "email-sender-embedded" : "email-sender-overlay"}>
            <div className={embedded ? "email-sender-layout-pro" : "email-sender-modal-pro"}>
                {!embedded && (
                    <div className="email-header-simple">
                        <div className="header-title">
                            <FiSend />
                            <span>Centro de Comunicación B2B</span>
                        </div>
                        <button onClick={onClose} className="close-btn-minimal"><FiX /></button>
                    </div>
                )}

                <div className="email-sender-split">
                    {/* SIDEBAR */}
                    <aside className="es-sidebar">
                        <div className="sidebar-section">
                            <label className="section-label">Configuración de Envío</label>
                            
                            <div className="mode-pill-toggle">
                                <button className={mode === 'individual' ? 'active' : ''} onClick={() => setMode('individual')}>Individual</button>
                                <button className={mode === 'masivo' ? 'active' : ''} onClick={() => setMode('masivo')}>Masivo</button>
                            </div>

                            <div className="sidebar-field">
                                <label className="field-label-small">Plantilla Activa</label>
                                <select 
                                    className="es-select-modern" 
                                    value={selectedTemplateId} 
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                >
                                    <option value="">Seleccionar Plantilla...</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                </select>
                            </div>

                            <div className="sidebar-field">
                                <label className="field-label-small">Adjuntos</label>
                                <input 
                                    type="file" 
                                    multiple 
                                    onChange={handleFileChange} 
                                    style={{display: 'none'}} 
                                    ref={fileInputRef} 
                                />
                                <button className="file-upload-trigger" onClick={() => fileInputRef.current.click()}>
                                    <FiPaperclip /> Adjuntar archivos
                                </button>
                                
                                {files.length > 0 && (
                                    <div className="files-list">
                                        {files.map((f, i) => (
                                            <div key={i} className="file-chip">
                                                <span>{f.name}</span>
                                                <button className="file-chip-remove" onClick={() => removeFile(i)}>
                                                    <FiX />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="sending-summary-minimal">
                                <span>{mode === 'masivo' ? selectedEmpresas.length : (selectedEmpresas.length > 0 ? 1 : 0)} prospectos</span>
                                <small>Modo: {mode.toUpperCase()}</small>
                            </div>

                            <button 
                                className="btn-send-main" 
                                onClick={handleSendCampaign}
                                disabled={sending || (mode === 'masivo' && selectedEmpresas.length === 0)}
                            >
                                {sending ? 'Procesando...' : (mode === 'masivo' ? 'Lanzar Campaña' : 'Enviar individual')}
                            </button>
                        </div>
                    </aside>

                    {/* MAIN CONTENT AREA */}
                    <main className="es-main">
                        <nav className="es-nav-tabs">
                            <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>
                                <FiUsers /> Destinatarios
                            </button>
                            <button className={activeTab === 'templates' ? 'active' : ''} onClick={() => setActiveTab('templates')}>
                                <FiTag /> Plantillas
                            </button>
                            <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
                                <FiClock /> Historial
                            </button>
                        </nav>

                        <div className="es-tab-panel">
                            {activeTab === 'list' && (
                                <div className="recipients-view">
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
                                                   {selectedEmpresas.find(e => e.id === empresa.id) ? <FiCheckSquare color="#3b82f6" /> : <FiSquare color="#cbd5e1" />}
                                                </div>
                                                <div className="row-main-info">
                                                    <span className="row-name">{empresa.nombre}</span>
                                                    <span className="row-email">{empresa.email || 'Sin email'}</span>
                                                </div>
                                                <div className="row-meta">
                                                    <span className="meta-badge">{empresa.rubro}</span>
                                                </div>
                                            </div>
                                        ))}
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
                                            
                                            <div className="page-numbers">
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                                    <button 
                                                        key={p} 
                                                        className={`btn-page-num ${currentPage === p ? 'active' : ''}`}
                                                        onClick={() => goToPage(p)}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>

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
                                <div className="templates-view">
                                    {isEditing ? (
                                        <div className="pro-editor">
                                            <div className="editor-header-actions">
                                                <h3>{currentTemplate.id ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
                                                <button className="btn-icon" onClick={() => setIsEditing(false)}><FiX /></button>
                                            </div>
                                            <div className="editor-form">
                                                <input 
                                                    className="es-input-modern" 
                                                    placeholder="Nombre de la plantilla" 
                                                    value={currentTemplate.nombre} 
                                                    onChange={e => setCurrentTemplate({...currentTemplate, nombre: e.target.value})} 
                                                />
                                                <input 
                                                    className="es-input-modern" 
                                                    placeholder="Asunto del correo" 
                                                    value={currentTemplate.subject} 
                                                    onChange={e => setCurrentTemplate({...currentTemplate, subject: e.target.value})} 
                                                />
                                                
                                                <div className="variable-picker">
                                                    <label>Insertar Variable:</label>
                                                    <div className="var-buttons">
                                                        <button onClick={() => insertVariable('nombre')}>Nombre</button>
                                                        <button onClick={() => insertVariable('empresa')}>Empresa</button>
                                                        <button onClick={() => insertVariable('rubro')}>Rubro</button>
                                                        <button onClick={() => insertVariable('ciudad')}>Ciudad</button>
                                                    </div>
                                                </div>

                                                <textarea 
                                                    ref={textareaRef}
                                                    className="es-textarea-modern" 
                                                    placeholder="Escribí tu mensaje aquí..." 
                                                    value={currentTemplate.body_text} 
                                                    onChange={e => setCurrentTemplate({...currentTemplate, body_text: e.target.value})} 
                                                />
                                                
                                                <div className="editor-footer">
                                                    <button className="btn-cancel" onClick={() => setIsEditing(false)}>Descartar</button>
                                                    <button className="btn-save" onClick={handleSaveTemplate}><FiSave /> Guardar Cambios</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="templates-directory">
                                            {templates.map(t => (
                                                <div key={t.id} className="pro-template-card">
                                                    <div className="card-top">
                                                        <h4>{t.nombre}</h4>
                                                        <div className="card-actions">
                                                            <button className="btn-tiny" onClick={() => {
                                                                setCurrentTemplate({ id: t.id, nombre: t.nombre, subject: t.subject || '', body_text: t.body_text || t.body_html || ''});
                                                                setIsEditing(true);
                                                            }}><FiEdit2 /></button>
                                                            <button className="btn-tiny btn-danger" onClick={() => {
                                                                if(window.confirm("¿Eliminar plantilla?")) {
                                                                    axios.delete(`${API_URL}/templates/${t.id}`).then(() => loadTemplates());
                                                                }
                                                            }}><FiTrash2 /></button>
                                                        </div>
                                                    </div>
                                                    <p className="card-subject">{t.subject || 'Sin asunto'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="history-placeholder">
                                    <FiClock size={40} opacity={0.3} />
                                    <h3>Próximamente</h3>
                                    <p>El historial de comunicación estará disponible en futuras actualizaciones.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default EmailSender;



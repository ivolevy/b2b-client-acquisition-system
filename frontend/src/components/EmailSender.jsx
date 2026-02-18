import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './EmailSender.css';
import GmailConnection from './GmailConnection';
import OutlookConnection from './OutlookConnection';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import TemplateEditor from './TemplateEditor';
import { 
    FiPlus, FiEdit2, FiTrash2, FiX, 
    FiCheckSquare, FiSquare, FiSend, 
    FiUsers, FiTag, FiClock,
    FiChevronLeft, FiChevronRight, FiPaperclip,
    FiEye, FiCheckCircle, FiAlertCircle, FiLoader
} from 'react-icons/fi';

const ITEMS_PER_PAGE = 10;

const EmailSender = ({ empresas = [], onClose, embedded = false, toastSuccess, toastError, toastWarning, toastInfo }) => {
    const { user } = useAuth();
    const localToasts = useToast();
    
    // Usar toasts de props si están disponibles, si no los locales
    const success = toastSuccess || localToasts.success;
    const error = toastError || localToasts.error;
    const warning = toastWarning || localToasts.warning;
    const info = toastInfo || localToasts.info;
    const [activeTab, setActiveTab] = useState('list'); // list, templates, history
    const [selectedEmpresas, setSelectedEmpresas] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [senderProvider, setSenderProvider] = useState('google'); // google or outlook
    const [sending, setSending] = useState(false);
    const [authStatus, setAuthStatus] = useState({ google: false, outlook: false, loading: true });
    const [currentPage, setCurrentPage] = useState(1);

    // Template Editing State
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [currentTemplateIdToEdit, setCurrentTemplateIdToEdit] = useState(null);
    
    // Delete Confirmation State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);
    
    // Success View State
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastCampaignStats, setLastCampaignStats] = useState(null);

    // Attachments State
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);
    const [generatingIcebreakers, setGeneratingIcebreakers] = useState(false);
    const [loadingIcebreakers, setLoadingIcebreakers] = useState({}); // { [id]: boolean }
    const [previewEmpresa, setPreviewEmpresa] = useState(null);
    const [generatedIcebreakers, setGeneratedIcebreakers] = useState({});
    const [autoPersonalize, setAutoPersonalize] = useState(false);

    const isAnyConnected = authStatus.google || authStatus.outlook;

    // Filter valid companies (must have email)
    const validEmpresas = React.useMemo(() => {
        return empresas.filter(e => e.email && e.email.trim() !== '' && e.email.includes('@'));
    }, [empresas]);

    const selectedTemplate = React.useMemo(() => {
        return templates.find(t => t.id.toString() === selectedTemplateId);
    }, [selectedTemplateId, templates]);

    useEffect(() => {
        /* if (validEmpresas) {
            setSelectedEmpresas(validEmpresas);
        } */
        loadTemplates();
        checkAuthStatus();
    }, [validEmpresas]);

    // Auto-generación de Icebreakers al SELECCIONAR empresas (Ahorro de créditos)
    // Auto-generación ELIMINADA a pedido del usuario (ahora es manual con botón)
    /*
    useEffect(() => {
        const generateIcebreakersAutomatically = async () => {
             // ... (código comentado para respetar flujo manual)
        };
        // generateIcebreakersAutomatically();
    }, [selectedEmpresas]); 
    */

    const loadTemplates = async () => {
        if (!user?.id) return;
        try {
            const response = await axios.get(`${API_URL}/api/templates?user_id=${user.id}&type=email`);
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

    const handleNewTemplate = () => {
        setCurrentTemplateIdToEdit(null);
        setShowTemplateEditor(true);
    };

    const handleEditTemplate = (id, e) => {
        if (e) e.stopPropagation();
        setCurrentTemplateIdToEdit(id);
        setShowTemplateEditor(true);
    };

    const handleTemplateSaved = () => {
        setShowTemplateEditor(false);
        loadTemplates(); // reload to get updates
    };

    const deleteTemplate = (id, e) => {
        if (e) e.stopPropagation();
        const template = templates.find(t => t.id === id);
        if (template) {
            setTemplateToDelete(template);
            setShowDeleteModal(true);
        }
    };

    const confirmDelete = async () => {
        if (!templateToDelete) return;
        try {
            await axios.delete(`${API_URL}/api/templates/${templateToDelete.id}?user_id=${user.id}`);
            loadTemplates();
            success("Plantilla eliminada.");
        } catch (err) {
            error("Error al eliminar.");
        } finally {
            setShowDeleteModal(false);
            setTemplateToDelete(null);
        }
    };

    const checkAuthStatus = async () => {
        if (!user?.id) return;
        try {
            const response = await axios.get(`${API_URL}/api/auth/status/${user.id}`);
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
        const targets = selectedEmpresas;
        
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
            const response = await axios.post(`${API_URL}/api/email/enviar-masivo`, {
                empresa_ids: targets.map(e => e.id || e.google_id),
                empresas_data: targets, // Enviamos data completa (Stateless)
                template_id: selectedTemplateId,
                user_id: user.id,
                provider: senderProvider,
                delay_segundos: 2.0,
                auto_personalize: autoPersonalize,
                attachments: files.map(f => ({
                    filename: f.name,
                    content_base64: f.base64,
                    content_type: f.type
                }))
            });

            if (response.data && response.data.data) {
                const results = response.data.data;
                success(`¡Campaña finalizada! ${results.exitosos} enviados con éxito.`);
                // Minimalismo: No bloqueamos con pantalla de éxito gigante. 
                // Los resultados ya están en el historial.
            }
        } catch (err) {
            console.error('Error enviando campaña:', err);
            error(err.response?.data?.detail || "Error en el envío.");
        } finally {
            setSending(false);
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
        const empresaId = id;
        if (selectedEmpresas.find(e => (e.id || e.google_id) === empresaId)) {
            setSelectedEmpresas(selectedEmpresas.filter(e => (e.id || e.google_id) !== empresaId));
        } else {
            const empresa = validEmpresas.find(e => (e.id || e.google_id) === empresaId);
            if (empresa) setSelectedEmpresas([...selectedEmpresas, empresa]);
        }
    };

    const handleGenerateIcebreakersSelected = async () => {
        if (selectedEmpresas.length === 0) {
            warning("Seleccioná al menos una empresa.");
            return;
        }

        setGeneratingIcebreakers(true);
        info(`Generando aperturas personalizadas para ${selectedEmpresas.length} leads...`);
        
        try {
            const response = await axios.post(`${API_URL}/api/leads/generate-icebreakers`, {
                empresas: selectedEmpresas,
                user_id: user.id
            });

            if (response.data && response.data.results) {
                const results = response.data.results;
                const successCount = results.filter(r => r.status === 'success').length;
                
                // Actualizar localmente las empresas con los nuevos icebreakers
                const newIcebreakers = { ...generatedIcebreakers };
                
                const updatedSelected = selectedEmpresas.map(emp => {
                    const empId = String(emp.id || emp.google_id);
                    const result = results.find(r => String(r.id) === empId);
                    if (result && result.status === 'success') {
                        newIcebreakers[empId] = result.icebreaker;
                        return { ...emp, icebreaker: result.icebreaker };
                    }
                    return emp;
                });
                
                setGeneratedIcebreakers(newIcebreakers);
                setSelectedEmpresas(updatedSelected);
                success(`¡Listo! Se generaron ${successCount} aperturas.`);
            }
        } catch (err) {
            console.error('Error generating icebreakers in sender:', err);
            error("Error al generar aperturas con IA.");
        } finally {
            setGeneratingIcebreakers(false);
        }
    };

    const renderPreviewContent = (empresa) => {
        if (!selectedTemplate || !empresa) return { subject: '', body: '' };
        
        // Buscamos la versión más reciente de la empresa en selectedEmpresas
        // para asegurarnos de tener el icebreaker recién generado.
        const empId = String(empresa.id || empresa.google_id);
        const currentIcebreaker = generatedIcebreakers[empId] || empresa.icebreaker || '';
        
        let bodyHtml = selectedTemplate.body_html || selectedTemplate.body_text || '';
        
        // Auto-Personalizar: Inyectar al principio si el toggle está activo 
        // y no hay ya un tag manual en el template
        if (autoPersonalize && currentIcebreaker && !bodyHtml.includes('{{ai_icebreaker}}') && !bodyHtml.includes('{ai_icebreaker}')) {
            bodyHtml = `<p>${currentIcebreaker}</p>\n${bodyHtml}`;
        }

        const variables = {
            nombre_empresa: empresa.nombre,
            nombre: empresa.nombre,
            empresa: empresa.nombre,
            rubro: empresa.rubro,
            ciudad: empresa.ciudad,
            website: empresa.website,
            ai_icebreaker: currentIcebreaker,
            icebreaker: currentIcebreaker
        };

        const replaceVars = (text) => {
            if (!text) return '';
            let rendered = text;
            Object.entries(variables).forEach(([key, val]) => {
                const regex = new RegExp(`{{${key}}}|{${key}}`, 'g');
                rendered = rendered.replace(regex, val || '');
            });
            return rendered;
        };

        return {
            subject: replaceVars(selectedTemplate.subject),
            body: replaceVars(bodyHtml)
        };
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

    const content = (
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

                            <div className="sidebar-field-toggle">
                                <div className="toggle-container" onClick={() => setAutoPersonalize(!autoPersonalize)}>
                                    <div className={`toggle-switch ${autoPersonalize ? 'active' : ''}`}>
                                        <div className="toggle-handle"></div>
                                    </div>
                                    <div className="toggle-label-group">
                                        <span className="toggle-main-label">✨ Auto-Personalizar</span>
                                        <span className="toggle-sub-label">Inyectar apertura IA al inicio</span>
                                    </div>
                                </div>
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

                            {/* Summary Removed as requested */}

                            <button 
                                className="btn-send-main" 
                                onClick={handleSendCampaign}
                                disabled={sending || selectedEmpresas.length === 0}
                            >
                                {sending ? 'Procesando...' : 'Lanzar Campaña'}
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
                                        <div className="view-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <button className="btn-check-all" onClick={toggleAllEmpresas}>
                                                    {selectedEmpresas.length === validEmpresas.length ? <FiCheckSquare size={14} /> : <FiSquare size={14} />}
                                                    {selectedEmpresas.length === validEmpresas.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                                </button>
                                                <div className="stats-selected-badge">{selectedEmpresas.length} seleccionados</div>
                                            </div>

                                            <button 
                                                className="btn-ai-generate-selected"
                                                onClick={handleGenerateIcebreakersSelected}
                                                disabled={generatingIcebreakers || selectedEmpresas.length === 0}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                                    color: 'white',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {generatingIcebreakers ? 'Generando...' : 'Generar Aperturas IA'}
                                            </button>
                                        </div>
                                    <div className="es-list-container">
                                        {paginatedEmpresas.map(empresa => (
                                            <div 
                                                key={empresa.id || empresa.google_id} 
                                                className={`es-row ${selectedEmpresas.find(e => (e.id || e.google_id) === (empresa.id || empresa.google_id)) ? 'selected' : ''}`}
                                                onClick={() => toggleEmpresa(empresa.id || empresa.google_id)}
                                            >
                                                <div className="es-lead-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <button 
                                                            className="btn-preview-lead"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPreviewEmpresa(empresa);
                                                            }}
                                                            title="Previsualizar mensaje"
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#6366f1',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: '6px',
                                                                borderRadius: '50%',
                                                                transition: 'background 0.2s'
                                                            }}
                                                        >
                                                            <FiEye size={16} />
                                                        </button>
                                                        <div className={`es-checkbox ${selectedEmpresas.find(e => (e.id || e.google_id) === (empresa.id || empresa.google_id)) ? 'checked' : ''}`}>
                                                            {selectedEmpresas.find(e => (e.id || e.google_id) === (empresa.id || empresa.google_id)) ? <FiCheckSquare /> : <FiSquare />}
                                                        </div>
                                                    </div>
                                                 <div className="row-main-info">
                                                     <span className="row-name">
                                                         {empresa.nombre}
                                                         {loadingIcebreakers[String(empresa.id || empresa.google_id)] && (
                                                             <FiLoader className="spin" style={{ marginLeft: '8px', color: '#6366f1' }} size={14}/>
                                                         )}
                                                         {!loadingIcebreakers[String(empresa.id || empresa.google_id)] && generatedIcebreakers[String(empresa.id || empresa.google_id)] && (
                                                             <span className="icebreaker-indicator" title="Apertura IA lista"> ✨</span>
                                                         )}
                                                     </span>
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
                                <div className="templates-view" style={{ padding: '24px' }}>
                                    <div className="templates-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                        <div 
                                            className="template-pro-card add-new" 
                                            onClick={handleNewTemplate}
                                            style={{ border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px', borderRadius: '16px', cursor: 'pointer', background: '#fafafa', flexDirection: 'column', color: '#94a3b8' }}
                                        >
                                            <FiPlus size={24} />
                                            <span style={{ marginTop: '8px', fontWeight: 600, fontSize: '0.85rem' }}>NUEVA PLANTILLA</span>
                                        </div>
                                        
                                        {templates.map(t => (
                                            <div 
                                                key={t.id} 
                                                className={`template-pro-card ${selectedTemplateId === t.id ? 'active' : ''}`}
                                                onClick={() => setSelectedTemplateId(t.id)}
                                                style={{ border: selectedTemplateId === t.id ? '1px solid #3b82f6' : '1px solid #e2e8f0', background: selectedTemplateId === t.id ? '#eff6ff' : 'white', borderRadius: '16px', padding: '24px', cursor: 'pointer', minHeight: '180px', display: 'flex', flexDirection: 'column' }}
                                            >
                                                <div className="card-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{t.nombre}</h4>
                                                    <div className="card-actions" style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            className="btn-tiny" 
                                                            onClick={(e) => handleEditTemplate(t.id, e)}
                                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                                                        >
                                                            <FiEdit2 />
                                                        </button>
                                                        <button 
                                                            className="btn-tiny btn-danger" 
                                                            onClick={(e) => deleteTemplate(t.id, e)}
                                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="card-subject" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginBottom: '8px' }}>
                                                    {t.subject || 'Sin asunto'}
                                                </p>
                                                <p className="card-body-preview" style={{ fontSize: '0.85rem', color: '#64748b', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                                    {t.body_text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
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

            {showTemplateEditor && (
                <TemplateEditor
                    templateId={currentTemplateIdToEdit}
                    userId={user?.id}
                    onClose={() => setShowTemplateEditor(false)}
                    onSave={handleTemplateSaved}
                    type="email"
                />
            )}

            {/* Custom Delete Confirmation Modal */}
            {showDeleteModal && (
                <div 
                    className="es-delete-modal-overlay"
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div 
                        className="es-delete-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="es-delete-modal-header">
                            <div className="es-delete-modal-icon">
                                <FiTrash2 size={24} />
                            </div>
                            <h3>Eliminar plantilla</h3>
                            <button 
                                className="es-delete-modal-close"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                <FiX />
                            </button>
                        </div>
                        
                        <div className="es-delete-modal-body">
                            <p>¿Estás seguro de que deseas eliminar la plantilla <strong>"{templateToDelete?.nombre}"</strong>?</p>
                            <p className="delete-hint">Esta acción no se puede deshacer.</p>
                        </div>
                        
                        <div className="es-delete-modal-footer">
                            <button 
                                className="cancel-btn"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="delete-confirm-btn"
                                onClick={confirmDelete}
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Preview Modal */}
            {previewEmpresa && (
                <div className="es-modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 2000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="es-preview-card" style={{
                        backgroundColor: 'white', borderRadius: '16px',
                        width: '90%', maxWidth: '600px', maxHeight: '80vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{
                            padding: '20px', borderBottom: '1px solid #eee',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>
                                Previsualización: {previewEmpresa.nombre}
                            </h3>
                            <button onClick={() => setPreviewEmpresa(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <FiX size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto' }}>
                            {!selectedTemplate ? (
                                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                                    Seleccioná una plantilla para ver la previsualización.
                                </div>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Asunto</label>
                                        <div style={{ fontSize: '1rem', color: '#1e293b', marginTop: '4px', fontWeight: 500 }}>
                                            {renderPreviewContent(previewEmpresa).subject}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Mensaje</label>
                                        <div 
                                            style={{ 
                                                fontSize: '0.95rem', color: '#334155', marginTop: '8px', 
                                                whiteSpace: 'pre-wrap', lineHeight: 1.6,
                                                padding: '16px', backgroundColor: '#fdfdfd', 
                                                border: '1px solid #f1f5f9', borderRadius: '8px'
                                            }}
                                            dangerouslySetInnerHTML={{ __html: renderPreviewContent(previewEmpresa).body }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div style={{ padding: '16px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn-secondary" onClick={() => setPreviewEmpresa(null)} style={{ padding: '8px 20px' }}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .btn-preview-lead:hover { background: #f0f0ff !important; }
            `}</style>
        </div>
    );

    if (embedded) return content;
    return createPortal(content, document.body);
};


export default EmailSender;

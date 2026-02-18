import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './WhatsAppSender.css';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import TemplateEditor from './TemplateEditor';
import { 
    FiSend, FiX, FiCheckCircle, FiAlertCircle, FiLoader, FiCheckSquare, FiSquare, FiPlus, FiChevronLeft, FiChevronRight, FiEye, FiEdit2, FiUsers, FiTag
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa6';

const ITEMS_PER_PAGE = 10;

const WhatsAppSender = ({ empresas = [], onClose, embedded = false, toastSuccess, toastError, toastWarning, toastInfo }) => {
    const { user } = useAuth();
    const localToasts = useToast();
    
    // Usar toasts de props si están disponibles, si no los locales
    const success = toastSuccess || localToasts.success;
    const error = toastError || localToasts.error;
    const warning = toastWarning || localToasts.warning;
    const info = toastInfo || localToasts.info;
    const [activeTab, setActiveTab] = useState('list'); // list, templates
    const [selectedEmpresas, setSelectedEmpresas] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [sendingState, setSendingState] = useState({
        active: false,
        currentIndex: 0,
        completed: 0,
        total: 0,
        isPaused: false
    });

    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [currentTemplateIdToEdit, setCurrentTemplateIdToEdit] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [generatingIcebreakers, setGeneratingIcebreakers] = useState(false);
    const [loadingIcebreakers, setLoadingIcebreakers] = useState({}); // { [id]: boolean }
    const [previewEmpresa, setPreviewEmpresa] = useState(null);
    const [generatedIcebreakers, setGeneratedIcebreakers] = useState({});
    const [autoPersonalize, setAutoPersonalize] = useState(false);

    const loadTemplates = async () => {
        if (!user?.id) return;
        setTemplatesLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/templates?user_id=${user.id}&type=whatsapp`);
            if (response.data && response.data.data) {
                setTemplates(response.data.data);
                // Auto-select first template if available and none selected
                if (response.data.data.length > 0 && !selectedTemplateId) {
                    setSelectedTemplateId(response.data.data[0].id);
                }
            }
        } catch (err) {
            console.error('Error loading templates:', err);
        } finally {
            setTemplatesLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    // Auto-generación de Icebreakers al SELECCIONAR empresas (Ahorro de créditos)
    // Auto-generación ELIMINADA a pedido del usuario (ahora es manual con botón)
    /*
    useEffect(() => {
        const generateIcebreakersAutomatically = async () => {
             // ... (código comentado)
        };
        // generateIcebreakersAutomatically();
    }, [selectedEmpresas]); 
    */

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
        loadTemplates();
    };

    // Filter valid companies (must have phone)
    const validEmpresas = React.useMemo(() => {
        return empresas.filter(e => e.telefono && e.telefono.trim().length > 5);
    }, [empresas]);

    useEffect(() => {
        // Auto-select valid ones initially or just keep state clean
        // Strategy: Start with none selected, or all? EmailSender selects all valid by default in some versions, 
        // but let's stick to user explicit selection or just filtering valid.
        // For now, let's just ensure selectedEmpresas are valid.
        setSelectedEmpresas(prev => prev.filter(p => validEmpresas.find(v => (v.id || v.google_id) === (p.id || p.google_id))));
    }, [validEmpresas]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (sendingState.active) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleNext();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sendingState]);

    const wrapLinksInMessage = async (text, empresa) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex);
        if (!matches) return text;

        let newText = text;
        // Eliminar duplicados para no procesar el mismo link varias veces
        const uniqueUrls = [...new Set(matches)];
        
        for (const url of uniqueUrls) {
            try {
                const response = await axios.post(`${API_URL}/api/communications/link-tracking`, {
                    original_url: url,
                    lead_id: empresa.id || empresa.google_id
                }, {
                    headers: { 'X-User-ID': user.id }
                });
                if (response.data.tracked_url) {
                    newText = newText.replaceAll(url, response.data.tracked_url);
                }
            } catch (err) {
                console.error('Error wrapping link:', err);
            }
        }
        return newText;
    };

    const startCampaign = () => {
        if (selectedEmpresas.length === 0) {
            warning("No hay destinatarios con teléfono seleccionados.");
            return;
        }
        if (!selectedTemplateId) {
            warning("Seleccioná una plantilla.");
            return;
        }

        setSendingState({
            active: true,
            currentIndex: 0,
            completed: 0,
            total: selectedEmpresas.length,
            isPaused: false
        });
        processResult(0);
    };

    const processResult = async (index) => {
        if (index >= selectedEmpresas.length) {
            finishCampaign();
            return;
        }

        const empresa = selectedEmpresas[index];
        const template = templates.find(t => t.id === selectedTemplateId);
        
        let message = template ? (template.body_text || template.body) : '';
        const currentIcebreaker = empresa.icebreaker || generatedIcebreakers[String(empresa.id || empresa.google_id)] || '';

        // Auto-Personalizar
        if (autoPersonalize && currentIcebreaker && !message.includes('{{ai_icebreaker}}') && !message.includes('{ai_icebreaker}')) {
            message = `${currentIcebreaker}\n\n${message}`;
        }

        message = message.replace(/{nombre}/g, empresa.nombre || 'cliente');
        message = message.replace(/{empresa}/g, empresa.nombre || ''); 
        message = message.replace(/{rubro}/g, empresa.rubro || '');
        message = message.replace(/{ciudad}/g, empresa.ciudad || '');
        message = message.replace(/{ai_icebreaker}/g, currentIcebreaker);
        message = message.replace(/{{ai_icebreaker}}/g, currentIcebreaker);

        const phone = empresa.telefono.replace(/\D/g, '');
        
        // Wrap links with tracker
        const trackedMessage = await wrapLinksInMessage(message, empresa);
        
        const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(trackedMessage)}`;
        
        // Log to backend
        try {
            await axios.post(`${API_URL}/api/communications/whatsapp/log`, {
                empresa_id: empresa.id || empresa.google_id,
                phone: phone,
                message: trackedMessage,
                direction: 'outbound'
            }, {
                headers: { 'X-User-ID': user.id }
            });
        } catch (err) {
            console.error('Error logging WhatsApp message:', err);
        }

        window.open(url, '_blank');
    };

    const handleNext = () => {
        const nextIndex = sendingState.currentIndex + 1;
        if (nextIndex < sendingState.total) {
            setSendingState(prev => ({
                ...prev,
                currentIndex: nextIndex,
                completed: prev.completed + 1
            }));
            processResult(nextIndex);
        } else {
            setSendingState(prev => ({
                ...prev,
                completed: prev.completed + 1
            }));
            setTimeout(finishCampaign, 500);
        }
    };

    const handleCancel = () => {
        setSendingState({ active: false, currentIndex: 0, completed: 0, total: 0, isPaused: false });
        info("Campaña cancelada.");
    };

    const finishCampaign = () => {
        setSendingState(prev => ({ ...prev, active: false }));
        success("¡Campaña finalizada exitosamente!");
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
        info(`Generando aperturas personalizadas con Gemini para ${selectedEmpresas.length} leads...`);
        
        try {
            const response = await axios.post(`${API_URL}/api/leads/generate-icebreakers`, {
                empresas: selectedEmpresas,
                user_id: user.id
            });

            if (response.data && response.data.results) {
                const results = response.data.results;
                const successCount = results.filter(r => r.status === 'success').length;
                
                const newIcebreakers = { ...generatedIcebreakers };
                
                // Actualizar localmente las empresas seleccionadas con los nuevos icebreakers
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
            console.error('Error generating icebreakers in WhatsApp sender:', err);
            error("Error al generar aperturas con IA.");
        } finally {
            setGeneratingIcebreakers(false);
        }
    };

    const renderPreviewMessage = (empresa) => {
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        // Sincronizar con la versión más reciente (que tiene el icebreaker)
        const empId = String(empresa.id || empresa.google_id);
        const currentIcebreaker = generatedIcebreakers[empId] || empresa.icebreaker || '';
        
        let message = selectedTemplate ? (selectedTemplate.body_text || selectedTemplate.body) : '';

        // Auto-Personalizar para la previsualización
        if (autoPersonalize && currentIcebreaker && !message.includes('{{ai_icebreaker}}') && !message.includes('{ai_icebreaker}')) {
            message = `${currentIcebreaker}\n\n${message}`;
        }

        const variables = {
            nombre: empresa.nombre || 'Prospecto',
            empresa: empresa.nombre || '',
            rubro: empresa.rubro || '',
            ciudad: empresa.ciudad || '',
            ai_icebreaker: currentIcebreaker
        };

        Object.entries(variables).forEach(([key, val]) => {
            const regex = new RegExp(`{{${key}}}|{${key}}`, 'g');
            message = message.replace(regex, val || '');
        });

        return message;
    };

    const progressPercent = sendingState.total > 0 
        ? Math.round((sendingState.completed / sendingState.total) * 100) 
        : 0;

    // --- PAGINATION LOGIC ---
    const totalPages = Math.ceil(validEmpresas.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedEmpresas = validEmpresas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const content = (
        <div className={embedded ? "whatsapp-sender-embedded" : "whatsapp-sender-overlay"}>
            <div className={embedded ? "whatsapp-sender-layout-pro" : "whatsapp-sender-modal-pro"}>
                
                {/* Header for Modal Mode */}
                {!embedded && (
                    <div className="whatsapp-header-simple">
                        <div className="header-title">
                            <FaWhatsapp size={24} color="#25D366" />
                            <span>WhatsApp Business</span>
                        </div>
                        <button onClick={onClose} className="close-btn-minimal"><FiX /></button>
                    </div>
                )}

                <div className="whatsapp-sender-split">
                    {/* SIDEBAR */}
                    <aside className="ws-sidebar">
                        <div className="sidebar-section">
                            <span className="section-label">Configuración de Envío</span>
                            
                            <div className="sidebar-field">
                                <label className="field-label-small">Plantilla Activa</label>
                                {templatesLoading ? (
                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Cargando...</div>
                                ) : (
                                    <select 
                                        className="ws-select-modern"
                                        value={selectedTemplateId}
                                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                                    >
                                        <option value="">Seleccionar plantilla...</option>
                                        {templates.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                    </select>
                                )}
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

                            <div className="sending-summary-minimal">
                                <span>{selectedEmpresas.length} prospectos</span>
                                <small>Listos para enviar</small>
                            </div>

                            <button 
                                className="btn-send-main"
                                onClick={startCampaign}
                                disabled={selectedEmpresas.length === 0 || !selectedTemplateId}
                            >
                                <FaWhatsapp /> Iniciar Campaña
                            </button>
                            
                            <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
                                <strong>Nota:</strong> Asegurate de tener WhatsApp Web abierto en otra pestaña del navegador.
                            </div>
                        </div>
                    </aside>

                    {/* MAIN CONTENT */}
                    <main className="ws-main">
                        <nav className="ws-nav-tabs">
                            <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>
                                <FiUsers /> Destinatarios
                            </button>
                            <button className={activeTab === 'templates' ? 'active' : ''} onClick={() => setActiveTab('templates')}>
                                <FiTag /> Mis Plantillas
                            </button>
                        </nav>

                        <div className="ws-tab-panel">
                            {activeTab === 'list' && (
                                <div className="recipients-view" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <div className="view-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <button className="btn-check-all" onClick={toggleAllEmpresas}>
                                                {selectedEmpresas.length === validEmpresas.length && validEmpresas.length > 0 ? <FiCheckSquare size={14} /> : <FiSquare size={14} />}
                                                {selectedEmpresas.length === validEmpresas.length && validEmpresas.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                            </button>
                                            <div className="stats-selected-badge">{selectedEmpresas.length} seleccionados</div>
                                        </div>

                                    </div>

                                    <div className="ws-list-container">
                                        {/* Empty State in List */}
                                        {validEmpresas.length === 0 && (
                                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                                <FiUsers size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                                <p>No hay destinatarios con teléfono válido.</p>
                                            </div>
                                        )}

                                        {paginatedEmpresas.map(empresa => (
                                            <div 
                                                key={empresa.id || empresa.google_id} 
                                                className={`ws-row ${selectedEmpresas.find(e => (e.id || e.google_id) === (empresa.id || empresa.google_id)) ? 'selected' : ''}`}
                                                onClick={() => toggleEmpresa(empresa.id || empresa.google_id)}
                                            >
                                                <div className="ws-lead-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <button 
                                                        className="btn-preview-lead-wa"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewEmpresa(empresa);
                                                        }}
                                                        title="Previsualizar mensaje"
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#25D366',
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
                                                    <div className={`ws-checkbox ${selectedEmpresas.find(e => (e.id || e.google_id) === (empresa.id || empresa.google_id)) ? 'checked' : ''}`}>
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
                                                     <span className="row-phone">{empresa.telefono || 'Sin teléfono'}</span>
                                                 </div>
                                                <div className="row-meta">
                                                    <span className="meta-badge">{empresa.rubro}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="ws-pagination">
                                            <button 
                                                className="btn-page-nav" 
                                                onClick={() => goToPage(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                <FiChevronLeft /> Anterior
                                            </button>
                                            
                                            <div className="page-numbers">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    // Simple pagination logic for display (show first 5 or logic)
                                                    // For exact clone, simplistic is fine
                                                    let p = i + 1;
                                                    if (totalPages > 5 && currentPage > 3) p = currentPage - 2 + i;
                                                    if (p > totalPages) return null;
                                                    return (
                                                        <button 
                                                            key={p} 
                                                            className={`btn-page-num ${currentPage === p ? 'active' : ''}`}
                                                            onClick={() => goToPage(p)}
                                                        >
                                                            {p}
                                                        </button>
                                                    );
                                                })}
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
                                <div className="templates-grid">
                                    {templatesLoading ? (
                                        <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '40px'}}>Cargando...</div>
                                    ) : templates.map(t => (
                                        <div 
                                            key={t.id} 
                                            className={`template-pro-card ${selectedTemplateId === t.id ? 'active' : ''}`}
                                            onClick={() => setSelectedTemplateId(t.id)}
                                        >
                                            <div className="card-header">
                                                <h4>{t.nombre}</h4>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn-tiny" onClick={(e) => handleEditTemplate(t.id, e)}><FiEdit2 size={12} /></button>
                                                </div>
                                            </div>
                                            <p className="card-body-preview">{t.body_text}</p>
                                        </div>
                                    ))}
                                    <div 
                                        className="template-pro-card add-new" 
                                        onClick={handleNewTemplate}
                                    >
                                        <div style={{ textAlign: 'center' }}>
                                            <FiPlus size={24} />
                                            <div style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>NUEVA</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                {/* Floating Minimalist Progress Widget */}
                {sendingState.active && (
                    <div className="ws-minimal-progress-floating">
                        <div className="ws-mini-header">
                            <FaWhatsapp color="#25D366" />
                            <span>Progreso: {sendingState.completed}/{sendingState.total}</span>
                            <button onClick={handleCancel} className="mini-close-btn"><FiX /></button>
                        </div>
                        
                        <div className="ws-mini-bar">
                            <div className="ws-mini-fill" style={{ width: `${progressPercent}%` }}></div>
                        </div>

                        {sendingState.currentIndex < sendingState.total && (
                            <div className="ws-mini-action">
                                <p>Enviar a: <strong>{selectedEmpresas[sendingState.currentIndex].nombre}</strong></p>
                                <button className="btn-ws-mini-next" onClick={handleNext}>
                                    Siguiente <FiChevronRight />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showTemplateEditor && (
                <TemplateEditor
                    templateId={currentTemplateIdToEdit}
                    userId={user?.id}
                    onClose={() => setShowTemplateEditor(false)}
                    onSave={handleTemplateSaved}
                    type="whatsapp"
                />
            )}
            {/* WhatsApp Preview Modal */}
            {previewEmpresa && (
                <div className="es-modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 2000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="es-preview-card" style={{
                        backgroundColor: 'white', borderRadius: '16px',
                        width: '90%', maxWidth: '500px', maxHeight: '80vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{
                            padding: '20px', borderBottom: '1px solid #eee',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>
                                Previsualización WhatsApp: {previewEmpresa.nombre}
                            </h3>
                            <button onClick={() => setPreviewEmpresa(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <FiX size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto', background: '#e5ddd5' }}>
                            {!selectedTemplateId ? ( // Changed from selectedTemplate to selectedTemplateId
                                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px', background: 'white', borderRadius: '8px' }}>
                                    Seleccioná una plantilla para ver la previsualización.
                                </div>
                            ) : (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    maxWidth: '85%',
                                    backgroundColor: 'white',
                                    padding: '12px 16px',
                                    borderRadius: '8px 8px 8px 0',
                                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                    position: 'relative',
                                    fontSize: '0.95rem',
                                    lineHeight: 1.5,
                                    color: '#303030',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {renderPreviewMessage(previewEmpresa)}
                                    <div style={{ 
                                        textAlign: 'right', 
                                        fontSize: '0.7rem', 
                                        color: '#667781', 
                                        marginTop: '4px' 
                                    }}>
                                        15:47
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '16px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'white' }}>
                            <button className="btn-secondary" onClick={() => setPreviewEmpresa(null)} style={{ padding: '8px 20px' }}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .btn-preview-lead-wa:hover { background: #eaffea !important; }
            `}</style>
        </div>
    );

    if (embedded) return content;
    return createPortal(content, document.body);
};


export default WhatsAppSender;

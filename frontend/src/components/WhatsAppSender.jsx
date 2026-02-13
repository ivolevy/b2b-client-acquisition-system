import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './WhatsAppSender.css';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import TemplateEditor from './TemplateEditor';
import { 
    FiPlus, FiEdit2, FiTrash2, FiX, 
    FiCheckSquare, FiSquare, 
    FiUsers, FiTag, FiClock,
    FiChevronLeft, FiChevronRight, FiCheck
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
        message = message.replace(/{nombre}/g, empresa.nombre || 'cliente');
        message = message.replace(/{empresa}/g, empresa.nombre || ''); 
        message = message.replace(/{rubro}/g, empresa.rubro || '');
        message = message.replace(/{ciudad}/g, empresa.ciudad || '');

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
            const empresa = empresas.find(e => (e.id || e.google_id) === empresaId);
            if (empresa) setSelectedEmpresas([...selectedEmpresas, empresa]);
        }
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
                                    <div className="view-toolbar">
                                        <button className="btn-check-all" onClick={toggleAllEmpresas}>
                                            {selectedEmpresas.length === validEmpresas.length && validEmpresas.length > 0 ? <FiCheckSquare size={14} /> : <FiSquare size={14} />}
                                            {selectedEmpresas.length === validEmpresas.length && validEmpresas.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                        </button>
                                        <div className="stats-selected-badge">{selectedEmpresas.length} seleccionados</div>
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
                                                <div className="row-check-area">
                                                    {selectedEmpresas.find(e => (e.id || e.google_id) === (empresa.id || empresa.google_id)) ? 
                                                        <FiCheckSquare size={18} color="#25D366" /> : 
                                                        <FiSquare size={18} color="#cbd5e1" />
                                                    }
                                                </div>
                                                <div className="row-main-info">
                                                    <span className="row-name">{empresa.nombre}</span>
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
        </div>
    );

    if (embedded) return content;
    return createPortal(content, document.body);
};

export default WhatsAppSender;

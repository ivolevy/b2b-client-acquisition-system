import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './WhatsAppSender.css';
import { useAuth } from '../AuthWrapper';
import { useToast } from '../hooks/useToast';
import TemplateEditor from './TemplateEditor';
import { 
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, 
    FiCheckSquare, FiSquare, FiSend, 
    FiUsers, FiTag, FiClock, FiMessageCircle,
    FiChevronLeft, FiChevronRight, FiPlay,
    FiLoader, FiCheck
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa6';

const WhatsAppSender = ({ empresas = [], onClose, embedded = false }) => {
    const { user } = useAuth();
    const { success, error, warning, info } = useToast();
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

    const [editingTemplate, setEditingTemplate] = useState(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [currentTemplateIdToEdit, setCurrentTemplateIdToEdit] = useState(null);

    const loadTemplates = async () => {
        setTemplatesLoading(true);
        try {
            const response = await axios.get(`${API_URL}/templates?type=whatsapp`);
            if (response.data && response.data.data) {
                setTemplates(response.data.data);
                if (response.data.data.length > 0 && !selectedTemplateId) {
                    // Preselect first if none selected
                    // setSelectedTemplateId(response.data.data[0].id);
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

    useEffect(() => {
        // Only select those with phone numbers
        setSelectedEmpresas(empresas.filter(e => e.telefono && e.telefono.trim() !== ''));
    }, [empresas]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (sendingState.active) {
                if (e.key === 'Enter') {
                    // Prevent default to avoid clicking other things
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

    const processResult = (index) => {
        if (index >= selectedEmpresas.length) {
            finishCampaign();
            return;
        }

        const empresa = selectedEmpresas[index];
        const template = templates.find(t => t.id === selectedTemplateId);
        
        // Use logic from TemplateEditor variables (body_text)
        let message = template ? (template.body_text || template.body) : '';
        // Replace variables
        message = message.replace(/{nombre}/g, empresa.nombre || 'cliente');
        message = message.replace(/{empresa}/g, empresa.nombre || ''); // Assuming nombre is company name in some contexts, or handle separately
        message = message.replace(/{rubro}/g, empresa.rubro || '');
        message = message.replace(/{ciudad}/g, empresa.ciudad || '');

        // Basic phone cleaning
        const phone = empresa.telefono.replace(/\D/g, '');
        const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
        
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

    const toggleEmpresa = (id) => {
        if (selectedEmpresas.find(e => e.id === id)) {
            setSelectedEmpresas(selectedEmpresas.filter(e => e.id !== id));
        } else {
            const empresa = empresas.find(e => e.id === id);
            if (empresa) setSelectedEmpresas([...selectedEmpresas, empresa]);
        }
    };

    const progressPercent = sendingState.total > 0 
        ? Math.round((sendingState.completed / sendingState.total) * 100) 
        : 0;

    // SVG Circle math: Circumference = 2 * PI * R. If R=70, C ≈ 440
    const strokeDashoffset = 440 - (440 * progressPercent) / 100;

    const content = (
        <div className={embedded ? "whatsapp-sender-embedded" : "whatsapp-sender-overlay"}>
            <div className={embedded ? "whatsapp-sender-layout-pro" : "whatsapp-sender-modal-pro"}>
                
                {/* Header for Modal Mode */}
                {!embedded && (
                    <div className="whatsapp-header-refined" style={{ padding: '16px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FaWhatsapp size={24} color="#25D366" />
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>WhatsApp Business</h2>
                        </div>
                        <button onClick={onClose} className="btn-close-minimal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><FiX size={24} /></button>
                    </div>
                )}

                <div className="whatsapp-sender-split">
                    {/* SIDEBAR */}
                    <aside className="ws-sidebar">
                        <span className="section-label">Configuración</span>
                        
                        <div className="sidebar-field">
                            <label className="field-label-small">Plantilla de Mensaje</label>
                            <label className="field-label-small">Plantilla de Mensaje</label>
                            {templatesLoading ? (
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>Cargando plantillas...</div>
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

                        <div className="sidebar-field">
                            <label className="field-label-small">Resumen</label>
                            <div style={{ background: 'var(--wa-primary-soft)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#075E54' }}>{selectedEmpresas.length}</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#075E54', opacity: 0.8 }}>PROSPECTOS LISTOS</div>
                            </div>
                        </div>

                        <button 
                            className="btn-start-campaign"
                            onClick={startCampaign}
                            disabled={selectedEmpresas.length === 0 || !selectedTemplateId}
                        >
                            <FiSend /> Iniciar Campaña
                        </button>
                        
                        <div style={{ marginTop: '20px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                            Asegurate de tener WhatsApp Web abierto en otra pestaña.
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
                                <div className="ws-list-container">
                                    <div style={{ marginBottom: '16px', fontSize: '0.875rem', color: '#64748b' }}>
                                        Mostrando {empresas.length} resultados. Solo los que tienen teléfono son elegibles.
                                    </div>
                                    {empresas.map(empresa => (
                                        <div 
                                            key={empresa.id} 
                                            className={`ws-row ${selectedEmpresas.find(e => e.id === empresa.id) ? 'selected' : ''} ${!empresa.telefono ? 'disabled' : ''}`}
                                            onClick={() => empresa.telefono && toggleEmpresa(empresa.id)}
                                            style={{ opacity: empresa.telefono ? 1 : 0.5, cursor: empresa.telefono ? 'pointer' : 'not-allowed' }}
                                        >
                                            <div className="row-check-area">
                                                {selectedEmpresas.find(e => e.id === empresa.id) ? 
                                                    <FiCheckSquare size={18} color="#25D366" /> : 
                                                    <FiSquare size={18} color="#cbd5e1" />
                                                }
                                            </div>
                                            <div className="row-content">
                                                <span className="row-name">{empresa.nombre}</span>
                                                <span className="row-phone">{empresa.telefono || 'Sin teléfono'}</span>
                                            </div>
                                            <div style={{ marginLeft: 'auto' }}>
                                                <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', color: '#64748b' }}>
                                                    {empresa.rubro}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {empresas.length === 0 && (
                                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                            <FiUsers size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                            <p>No hay destinatarios en la lista.</p>
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
                                        style={{ borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}
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

                {/* Refined Progress Overlay */}
                {sendingState.active && (
                    <div className="whats-progress-backdrop">
                        <div className="whats-progress-card">
                            <div className="progress-card-header">
                                <h3>Enviando Campaña</h3>
                                <button onClick={handleCancel} className="btn-icon-close"><FiX /></button>
                            </div>
                            
                            <div className="progress-status-row">
                                <div className="progress-stat">
                                    <span className="stat-label">Enviados</span>
                                    <span className="stat-value">{sendingState.completed}</span>
                                </div>
                                <div className="progress-stat-divider">/</div>
                                <div className="progress-stat">
                                    <span className="stat-label">Total</span>
                                    <span className="stat-value">{sendingState.total}</span>
                                </div>
                            </div>

                            <div className="progress-bar-modern-container">
                                <div className="progress-bar-modern-fill" style={{ width: `${progressPercent}%` }}></div>
                            </div>

                            <div className="current-action-area">
                                {sendingState.currentIndex < sendingState.total ? (
                                    <>
                                        <p className="next-label">Próximo destinatario:</p>
                                        <div className="next-target">
                                            <strong>{selectedEmpresas[sendingState.currentIndex].nombre}</strong>
                                            <span>{selectedEmpresas[sendingState.currentIndex].telefono}</span>
                                        </div>
                                        
                                        <div className="action-buttons-row">
                                            <button className="btn-whatsapp-action" onClick={handleNext}>
                                                <FaWhatsapp /> Abrir Chat y Enviar
                                            </button>
                                            <p className="hint-text">Presioná <strong>Enter</strong> para continuar</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="completion-state">
                                        <div className="check-circle"><FiCheck size={32} /></div>
                                        <p>¡Campaña finalizada!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showTemplateEditor && (
                <TemplateEditor
                    templateId={currentTemplateIdToEdit}
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

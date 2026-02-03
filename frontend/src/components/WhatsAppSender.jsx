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

    useEffect(() => {
        const saved = localStorage.getItem('whatsapp_templates');
        if (saved) {
            const parsed = JSON.parse(saved);
            setTemplates(parsed);
            if (parsed.length > 0) setSelectedTemplateId(parsed[0].id);
        } else {
            const defaultTemplates = [
                { id: '1', name: 'Primer Contacto', body: 'Hola {nombre}, ¿cómo estás? Vi tu empresa {empresa} y me interesó mucho el rubro {rubro}.' },
                { id: '2', name: 'Seguimiento', body: 'Hola {nombre}, te escribo para dar seguimiento a mi mensaje anterior sobre {rubro}.' }
            ];
            setTemplates(defaultTemplates);
            localStorage.setItem('whatsapp_templates', JSON.stringify(defaultTemplates));
            setSelectedTemplateId('1');
        }
    }, []);

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
        
        let message = template ? template.body : '';
        // Replace variables
        message = message.replace(/{nombre}/g, empresa.nombre || 'cliente');
        message = message.replace(/{empresa}/g, empresa.nombre || '');
        message = message.replace(/{rubro}/g, empresa.rubro || '');

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

    return (
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
                            <select 
                                className="ws-select-modern"
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                            >
                                <option value="">Seleccionar plantilla...</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
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
                                    {templates.map(t => (
                                        <div 
                                            key={t.id} 
                                            className={`template-pro-card ${selectedTemplateId === t.id ? 'active' : ''}`}
                                            onClick={() => setSelectedTemplateId(t.id)}
                                        >
                                            <div className="card-header">
                                                <h4>{t.name}</h4>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn-tiny" onClick={(e) => {
                                                        e.stopPropagation();
                                                        // logic for edit would go here
                                                    }}><FiEdit2 size={12} /></button>
                                                </div>
                                            </div>
                                            <p className="card-body-preview">{t.body}</p>
                                        </div>
                                    ))}
                                    <div className="template-pro-card add-new" style={{ borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
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

                {/* COMMAND CENTER DASHBOARD (Progress) */}
                {sendingState.active && (
                    <div className="sending-progress-overlay">
                        <div className="command-center">
                            <div className="cc-header">
                                <div className="cc-status-group">
                                    <h2>Centro de Comando</h2>
                                    <span className="cc-status-badge">Enviando...</span>
                                </div>
                                <div className="cc-stats-minimal">
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{sendingState.completed} / {sendingState.total}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8, letterSpacing: '0.05em' }}>PROGRESO TOTAL</div>
                                    </div>
                                </div>
                            </div>

                            <div className="cc-body">
                                <div className="progress-container">
                                    <svg className="progress-circle-svg">
                                        <circle className="progress-circle-bg" cx="80" cy="80" r="70" />
                                        <circle 
                                            className="progress-circle-fill" 
                                            cx="80" cy="80" r="70" 
                                            style={{ 
                                                strokeDasharray: 440,
                                                strokeDashoffset: strokeDashoffset 
                                            }}
                                        />
                                    </svg>
                                    <div className="progress-text">
                                        <span className="progress-percent">{progressPercent}%</span>
                                        <span className="progress-label">COMPLETO</span>
                                    </div>
                                </div>

                                <div className="cc-action-zone">
                                    {sendingState.currentIndex < sendingState.total && (
                                        <div className="current-recipient-card">
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#25D366', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>Próximo Destinatario</span>
                                            <span className="recipient-name">{selectedEmpresas[sendingState.currentIndex].nombre}</span>
                                            <span className="recipient-phone">{selectedEmpresas[sendingState.currentIndex].telefono}</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                        <button className="btn-cc-primary" onClick={handleNext}>
                                            Siguiente (Enter) <FiChevronRight />
                                        </button>
                                        
                                        <span className="cc-hotkey-hint">Presioná <strong>Enter</strong> para abrir el chat y avanzar</span>
                                        
                                        <button className="btn-cc-cancel" onClick={handleCancel}>
                                            Cancelar Campaña
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppSender;

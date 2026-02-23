import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import './Automations.css';

const Automations = ({ toastSuccess, toastError, toastWarning }) => {
    const { user } = useAuth();
    const [rules, setRules] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        trigger_event: 'email_received',
        condition_type: 'ai_intent',
        condition_value: { intent: '' },
        action_type: 'change_status',
        action_payload: { status: 'interested' },
        is_active: true
    });

    const [templates, setTemplates] = useState([]);

    const definedIntents = [
        "PIDE_PRECIO", "AGENDAR_REUNION", "MAS_INFO", "NO_INTERESADO", "FUERA_DE_OFICINA", "OTRO"
    ];

    const definedStatuses = [
        { value: 'interested', label: 'Interesados' },
        { value: 'meeting_booked', label: 'Reunión Agendada' },
        { value: 'not_interested', label: 'No Interesado' },
    ];

    const definedTriggers = [
        { value: 'email_received', label: 'Email Recibido (Reply)', desc: 'Cuando un lead responde a tus campañas.' },
        { value: 'lead_extracted', label: 'Nuevo Lead Encontrado', desc: 'Cuando el buscador encuentra un prospecto nuevo.' },
        { value: 'lead_saved', label: 'Lead Guardado (CRM)', desc: 'Cuando guardas manualmente un lead en tu pipeline.' },
    ];

    useEffect(() => {
        if (user?.id) {
            fetchRules();
            fetchLogs();
            fetchTemplates();
        }
    }, [user?.id]);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/automations/rules`, {
                headers: { 'X-User-ID': user.id }
            });
            if (res.data) setRules(res.data);
        } catch (error) {
            console.error("Error fetching rules", error);
            if (toastError) toastError("Error al cargar automatizaciones");
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/automations/logs`, {
                headers: { 'X-User-ID': user.id }
            });
            if (res.data) setLogs(res.data);
        } catch (error) {
            console.error("Error fetching logs", error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/templates`, {
                headers: { 'X-User-ID': user.id }
            });
            if (res.data) setTemplates(res.data);
        } catch (error) {
            console.error("Error fetching templates", error);
        }
    };

    const handleSaveRule = async () => {
        if (!formData.name) {
            if (toastWarning) toastWarning("Asigna un nombre a la regla");
            return;
        }

        // Validate condition
        if (formData.condition_type === 'ai_intent' && !formData.condition_value.intent) {
            if (toastWarning) toastWarning("Selecciona una intención");
            return;
        }
        if (formData.condition_type === 'keyword' && !formData.condition_value.keyword) {
            if (toastWarning) toastWarning("Escribe una palabra clave");
            return;
        }

        try {
            setLoading(true);
            await axios.post(`${API_URL}/api/automations/rules`, formData, {
                headers: { 'X-User-ID': user.id }
            });
            if (toastSuccess) toastSuccess("Regla de automatización creada");
            setIsFormOpen(false);
            setFormData({
                name: '',
                trigger_event: 'email_received',
                condition_type: 'ai_intent',
                condition_value: { intent: '' },
                action_type: 'change_status',
                action_payload: { status: 'interested' },
                is_active: true
            });
            fetchRules();
        } catch (error) {
            console.error("Error saving rule", error);
            if (toastError) toastError("Error al guardar regla");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRule = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta regla?")) return;
        try {
            await axios.delete(`${API_URL}/api/automations/rules/${id}`, {
                headers: { 'X-User-ID': user.id }
            });
            if (toastSuccess) toastSuccess("Regla eliminada");
            fetchRules();
        } catch (error) {
            console.error("Error deleting rule", error);
            if (toastError) toastError("Error al eliminar regla");
        }
    };

    const toggleRuleActive = async (rule) => {
        try {
            const updated = { ...rule, is_active: !rule.is_active };
            await axios.put(`${API_URL}/api/automations/rules/${rule.id}`, updated, {
                headers: { 'X-User-ID': user.id }
            });
            fetchRules();
        } catch (error) {
            console.error("Error toggling rule", error);
            if (toastError) toastError("Error al actualizar la regla");
        }
    };

    const getTriggerInfo = (event) => {
        return definedTriggers.find(t => t.value === event) || { label: event, desc: '' };
    };

    return (
        <div id="automations-root" className="automations-container unified-results-module fade-in">
            <div className="automations-header">
                <div>
                    <h2>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        Triggers y Automatizaciones IA
                    </h2>
                    <p>Configura respuestas automáticas y reglas de negocio. Deja que nuestra IA trabaje por ti 24/7 conectando el buscador, el CRM y tu Outbox.</p>
                </div>
                {!isFormOpen && (
                    <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Nueva Regla
                    </button>
                )}
            </div>

            {isFormOpen && (
                <div className="rule-form-card">
                    <div className="form-header">
                        <h3>Crear flujo automatizado</h3>
                        <p>Define las condiciones necesarias para disparar la acción en tu pipeline.</p>
                    </div>
                    
                    <div className="form-group">
                        <label>Nombre identificador de la Regla</label>
                        <input 
                            className="app-input"
                            type="text" 
                            placeholder="Ej: Auto-reply a pedidos de presupuesto"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    <div className="workflow-builder">
                        {/* STEP 1: TRIGGER */}
                        <div className="workflow-step">
                            <div className="step-icon step-trigger">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                                </svg>
                            </div>
                            <div className="step-content">
                                <div className="step-header">
                                    <span className="step-badge">1. CUANDO</span>
                                    <h4>Seleccionar disparador</h4>
                                </div>
                                <div className="step-inputs">
                                    <select 
                                        className="styled-select"
                                        value={formData.trigger_event}
                                        onChange={(e) => setFormData({...formData, trigger_event: e.target.value})}
                                    >
                                        {definedTriggers.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="step-desc" style={{marginTop: '8px', fontSize: '0.85rem'}}>
                                    {getTriggerInfo(formData.trigger_event).desc}
                                </p>
                            </div>
                        </div>

                        <div className="workflow-connector"></div>

                        {/* STEP 2: CONDITION */}
                        <div className="workflow-step">
                            <div className="step-icon step-condition">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3l1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5z"></path>
                                    <path d="M19 14l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z"></path>
                                </svg>
                            </div>
                            <div className="step-content">
                                <div className="step-header">
                                    <span className="step-badge">2. SI (CONDICIÓN)</span>
                                    <h4>Regla de filtrado</h4>
                                </div>
                                <div className="step-inputs" style={{flexDirection: 'column', gap: '10px'}}>
                                    <select 
                                        className="styled-select"
                                        value={formData.condition_type}
                                        onChange={(e) => setFormData({
                                            ...formData, 
                                            condition_type: e.target.value,
                                            condition_value: e.target.value === 'ai_intent' ? { intent: '' } : { keyword: '' }
                                        })}
                                    >
                                        <option value="no_condition">Sin condición (Siempre)</option>
                                        <option value="ai_intent">Intención detectada por IA</option>
                                        <option value="keyword">Contiene palabra clave</option>
                                    </select>

                                    {formData.condition_type === 'ai_intent' && (
                                        <select 
                                            className="styled-select"
                                            value={formData.condition_value.intent}
                                            onChange={(e) => setFormData({
                                                ...formData, 
                                                condition_value: { intent: e.target.value }
                                            })}
                                        >
                                            <option value="">-- Seleccionar intención --</option>
                                            {definedIntents.map(intent => (
                                                <option key={intent} value={intent}>{intent.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    )}

                                    {formData.condition_type === 'keyword' && (
                                        <input 
                                            className="app-input"
                                            type="text"
                                            placeholder="Escribe la palabra (ej: presupuesto)"
                                            value={formData.condition_value.keyword}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                condition_value: { keyword: e.target.value }
                                            })}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="workflow-connector"></div>

                        {/* STEP 3: ACTION */}
                        <div className="workflow-step">
                            <div className="step-icon step-action">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </div>
                            <div className="step-content">
                                <div className="step-header">
                                    <span className="step-badge">3. ENTONCES (ACCIÓN)</span>
                                    <h4>Ejecutar comportamiento</h4>
                                </div>
                                <div className="step-inputs" style={{flexDirection: 'column', gap: '10px'}}>
                                    <select 
                                        className="styled-select"
                                        value={formData.action_type}
                                        onChange={(e) => setFormData({
                                            ...formData, 
                                            action_type: e.target.value,
                                            action_payload: e.target.value === 'change_status' ? { status: 'interested' } : { template_id: '' }
                                        })}
                                    >
                                        <option value="change_status">Actualizar Etapa del CRM</option>
                                        <option value="send_template">Enviar Email Automático</option>
                                        <option value="send_whatsapp">Crear Tarea de WhatsApp</option>
                                    </select>

                                    {formData.action_type === 'change_status' && (
                                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                            <span style={{color: '#94a3b8'}}>Mover lead a:</span>
                                            <select 
                                                className="styled-select"
                                                value={formData.action_payload.status}
                                                onChange={(e) => setFormData({
                                                    ...formData, 
                                                    action_payload: { status: e.target.value }
                                                })}
                                            >
                                                {definedStatuses.map(status => (
                                                    <option key={status.value} value={status.value}>{status.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {formData.action_type === 'send_template' && (
                                        <select 
                                            className="styled-select"
                                            value={formData.action_payload.template_id}
                                            onChange={(e) => setFormData({
                                                ...formData, 
                                                action_payload: { template_id: e.target.value }
                                            })}
                                        >
                                            <option value="">-- Seleccionar Plantilla --</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre || t.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button className="btn-secondary" onClick={() => setIsFormOpen(false)}>Cancelar</button>
                        <button className="btn-primary" onClick={handleSaveRule} disabled={loading}>
                            {loading ? 'Guardando...' : 'Activar Regla'}
                        </button>
                    </div>
                </div>
            )}

            <div className="automations-content">
                <div className="rules-section">
                    <h3 className="section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        Reglas Activas
                    </h3>
                    
                    {loading && !rules.length ? <p style={{color: '#64748b'}}>Cargando automatizaciones...</p> : null}
                    
                    {!loading && rules.length === 0 ? (
                        <div className="automations-empty-state">
                            <div className="empty-icon-wrap">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 8 12 12 14 14"></polyline>
                                </svg>
                            </div>
                            <div>
                                <p>No has configurado ninguna regla de automatización todavía.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="rules-list">
                            {rules.map(rule => (
                                <div key={rule.id} className={`rule-card ${!rule.is_active ? 'inactive' : ''}`}>
                                    <div className="rule-card-header">
                                        <div className="rule-title-wrap">
                                            <h4>{rule.name}</h4>
                                            <label className="toggle-switch" title={rule.is_active ? "Desactivar" : "Activar"}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={rule.is_active}
                                                    onChange={() => toggleRuleActive(rule)}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                        <button className="delete-btn" onClick={() => handleDeleteRule(rule.id)} title="Eliminar regla">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="rule-flow-preview">
                                        <div className="flow-node">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                                            <span>{getTriggerInfo(rule.trigger_event).label}</span>
                                        </div>
                                        <div className="flow-arrow">→</div>
                                        <div className="flow-node highlight">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5z"></path></svg>
                                            <span>{rule.condition_type === 'ai_intent' ? rule.condition_value?.intent : (rule.condition_type === 'keyword' ? `"${rule.condition_value?.keyword}"` : 'Siempre')}</span>
                                        </div>
                                        <div className="flow-arrow">→</div>
                                        <div className="flow-node action">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                            <span>{rule.action_type === 'change_status' ? `Mover a ${rule.action_payload?.status}` : (rule.action_type === 'send_template' ? 'Enviar Email' : 'WhatsApp')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="logs-section">
                    <h3 className="section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        Registro de Ejecuciones
                    </h3>
                    
                    {logs.length === 0 ? (
                        <div className="automations-empty-state">
                            <div className="empty-icon-wrap">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                </svg>
                            </div>
                            <p>Esperando a que ocurra un evento de automatización.</p>
                        </div>
                    ) : (
                        <div className="logs-list">
                            {logs.map(log => (
                                <div key={log.id} className={`log-item status-${log.execution_status}`}>
                                    <div className="log-header">
                                        <span className="log-rule-name">{log.automation_rules?.name || 'Regla Desconocida'}</span>
                                        <span className={`status-badge status-${log.execution_status}`}>
                                            {log.execution_status === 'success' ? 'Éxito' : 'Error'}
                                        </span>
                                    </div>
                                    <div className="log-time">{new Date(log.created_at).toLocaleString()}</div>
                                    <div className="log-detail">
                                        <span className="log-lead">{log.event_payload?.sender || 'Sender desconocido'}</span>
                                    </div>
                                    {log.error_message && <div className="log-error-msg">{log.error_message}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Automations;

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
            if (res.data && res.data.success) setTemplates(res.data.data);
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
        <div id="automations-root" className="automations-container fade-in">
            <div className="automations-header">
                <div className="header-info">
                    <h2>
                        Triggers IA
                    </h2>
                    <p>Automatiza tu flujo de ventas con inteligencia artificial. Conecta eventos del buscador, el CRM y tu Outbox sin escribir código.</p>
                </div>
                
                <div className="header-actions">
                    {!isFormOpen && (
                        <button className="btn-premium" onClick={() => setIsFormOpen(true)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Crear Nuevo Trigger
                        </button>
                    )}
                </div>
            </div>

            {isFormOpen && (
                <div className="builder-container">
                    <div className="builder-title-section">
                        <h3>Constructor de Flujos</h3>
                        <p>Diseña paso a paso cómo debe reaccionar el sistema ante nuevos eventos.</p>
                    </div>

                    <div className="form-group" style={{marginBottom: '3rem'}}>
                        <label className="node-label">Nombre de la Automatización</label>
                        <input 
                            className="app-input"
                            type="text" 
                            style={{maxWidth: '500px'}}
                            placeholder="Ej: Auto-reply a pedidos..."
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    <div className="builder-steps">
                        {/* STEP 1: TRIGGER */}
                        <div className="step-node">
                            <div className="node-icon icon-trigger">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                                </svg>
                            </div>
                            <div className="node-content">
                                <span className="node-label">1. DISPARADOR (TRIGGER)</span>
                                <h4>¿Cuándo debe iniciar?</h4>
                                <div className="node-inputs">
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
                                <p className="node-desc">
                                    {getTriggerInfo(formData.trigger_event).desc}
                                </p>
                            </div>
                        </div>

                        <div className="step-connector"></div>

                        {/* STEP 2: CONDITION */}
                        <div className="step-node">
                            <div className="node-icon icon-condition">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3l1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5z"></path>
                                    <path d="M19 14l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z"></path>
                                </svg>
                            </div>
                            <div className="node-content">
                                <span className="node-label">2. FILTRO (CONDITION)</span>
                                <h4>¿Bajo qué condiciones?</h4>
                                <div className="node-inputs">
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
                                            placeholder="Palabra... (ej: presupuesto)"
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

                        <div className="step-connector"></div>

                        {/* STEP 3: ACTION */}
                        <div className="step-node">
                            <div className="node-icon icon-action">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </div>
                            <div className="node-content">
                                <span className="node-label">3. RESPUESTA (ACTION)</span>
                                <h4>¿Qué acción realizar?</h4>
                                <div className="node-inputs">
                                    <select 
                                        className="styled-select"
                                        value={formData.action_type}
                                        onChange={(e) => setFormData({
                                            ...formData, 
                                            action_type: e.target.value,
                                            action_payload: e.target.value === 'change_status' ? { status: 'interested' } : { template_id: '' }
                                        })}
                                    >
                                        <option value="change_status">Mover Etapa del CRM</option>
                                        <option value="send_template">Enviar Email Plantilla</option>
                                        <option value="send_whatsapp">WhatsApp (Próximamente)</option>
                                    </select>

                                    {formData.action_type === 'change_status' && (
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

                    <div style={{marginTop: '4rem', display: 'flex', justifyContent: 'center', gap: '1.5rem'}}>
                        <button className="btn-secondary" onClick={() => setIsFormOpen(false)}>
                            Descartar
                        </button>
                        <button className="btn-premium" onClick={handleSaveRule} disabled={loading}>
                            {loading ? 'Activando...' : 'Publicar Automatización'}
                        </button>
                    </div>
                </div>
            )}

            <div className="automations-content">
                <div className="rules-section">
                    <h3 className="section-title">Tus Automatizaciones</h3>
                    
                    {loading && !rules.length ? <p className="text-slate">Consultando motor de triggers...</p> : null}
                    
                    {!loading && rules.length === 0 ? (
                        <div className="automations-empty-state">
                            <p className="text-dim italic">No hay procesos activos. Comienza creando uno nuevo arriba.</p>
                        </div>
                    ) : (
                        <div className="automations-grid">
                            {rules.map(rule => (
                                <div key={rule.id} className="premium-rule-card">
                                    <div className="card-header">
                                        <div>
                                            <h3>{rule.name}</h3>
                                            <span className="text-dim">{rule.is_active ? 'Activa y monitoreando' : 'En pausa'}</span>
                                        </div>
                                        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                                            <label className="ios-toggle">
                                                <input 
                                                    type="checkbox" 
                                                    checked={rule.is_active}
                                                    onChange={() => toggleRuleActive(rule)}
                                                />
                                                <span className="ios-slider"></span>
                                            </label>
                                            <button 
                                                onClick={() => handleDeleteRule(rule.id)} 
                                                style={{background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: '0.5rem'}}
                                                onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                                                onMouseOut={(e) => e.currentTarget.style.color = '#e2e8f0'}
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="visual-flow-summary">
                                        <div className="flow-pill trigger">{getTriggerInfo(rule.trigger_event).label}</div>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                        <div className="flow-pill condition">
                                            {rule.condition_type === 'ai_intent' ? rule.condition_value?.intent : (rule.condition_type === 'keyword' ? `"${rule.condition_value?.keyword}"` : 'Siempre')}
                                        </div>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                        <div className="flow-pill action">
                                            {rule.action_type === 'change_status' ? `CRM Stage` : (rule.action_type === 'send_template' ? 'Auto Email' : 'WhatsApp')}
                                        </div>
                                    </div>
                                    
                                    <div className="rule-card-desc">
                                        {rule.trigger_event === 'email_received' ? 'Detecta intención y responde automáticamente vía email.' : 'Procesa nuevos datos del buscador/CRM en tiempo real.'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="logs-sidebar">
                    <h3 className="logs-title">Monitor en Vivo</h3>
                    
                    {logs.length === 0 ? (
                        <p className="text-dim italic">Esperando disparadores...</p>
                    ) : (
                        <div className="timeline-container">
                            {logs.slice(0, 10).map(log => (
                                <div key={log.id} className={`timeline-item ${log.execution_status === 'success' ? 'success' : 'error'}`}>
                                    <span className="log-time">{new Date(log.created_at).toLocaleTimeString()}</span>
                                    <p className="log-msg">
                                        <strong>{log.automation_rules?.name || 'Regla'}:</strong> {log.execution_status === 'success' ? 'Ejecutada' : 'Fallida'}
                                    </p>
                                    <span className="log-payload">{log.event_payload?.sender || log.event_payload?.nombre || 'Evento procesado'}</span>
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

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import './Automations.css';
import { 
    Bolt as FlashIcon, 
    AutoAwesome as SparklesIcon,
    SmartToy as AiIcon, 
    Send as SendIcon,
    Add as AddIcon,
    Close as CloseIcon,
    AccessTime as WaitIcon
} from '@mui/icons-material';

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
                        <SparklesIcon sx={{ fontSize: '1.8rem', color: 'var(--primary)' }} /> Triggers IA
                    </h2>
                    <p>Automatiza respuestas y flujos basados en intenciones detectadas.</p>
                </div>

                <div className="header-actions">
                    <button 
                        className="btn-premium"
                        onClick={() => setIsFormOpen(!isFormOpen)}
                    >
                        {isFormOpen ? <CloseIcon /> : <AddIcon />}
                        {isFormOpen ? "Cancelar" : "Nuevo Trigger"}
                    </button>
                </div>
            </div>

            {isFormOpen && (
                <div className="builder-container">
                    <div className="builder-title-section">
                        <h3>Configurar Automatización</h3>
                        <p className="text-dim">Define el disparador, la condición y la acción resultante.</p>
                    </div>

                    <div className="builder-steps">
                        {/* STEP 1: TRIGGER */}
                        <div className="step-node">
                            <div className="node-icon icon-trigger">
                                <FlashIcon />
                            </div>
                            <div className="node-content">
                                <h4>Disparador</h4>
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
                            </div>
                        </div>

                        <div className="step-connector"></div>

                        {/* STEP 2: CONDITION */}
                        <div className="step-node">
                            <div className="node-icon icon-condition">
                                <AiIcon />
                            </div>
                            <div className="node-content">
                                <h4>Condición</h4>
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
                                        <option value="no_condition">Siempre</option>
                                        <option value="ai_intent">Intención IA</option>
                                        <option value="keyword">Palabra Clave</option>
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
                                            <option value="">-- Intención --</option>
                                            {definedIntents.map(intent => (
                                                <option key={intent} value={intent}>{intent.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    )}

                                    {formData.condition_type === 'keyword' && (
                                        <input 
                                            className="app-input"
                                            type="text"
                                            placeholder="Ej: presupuesto"
                                            value={formData.condition_value.keyword || ''}
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
                                <SendIcon />
                            </div>
                            <div className="node-content">
                                <h4>Acción</h4>
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
                                        <option value="change_status">Mover Etapa</option>
                                        <option value="send_template">Enviar Email</option>
                                        <option value="send_whatsapp">WhatsApp (Tarea)</option>
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
                                            <option value="">-- Plantilla --</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre || t.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{marginTop: '2.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexDirection: 'column', alignItems: 'center'}}>
                        <input 
                            className="app-input"
                            type="text" 
                            style={{width: '100%', maxWidth: '400px', textAlign: 'center', fontWeight: 600}}
                            placeholder="Nombre de la regla..."
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                        <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                            <button className="btn-secondary" style={{padding: '0.6rem 1.5rem'}} onClick={() => setIsFormOpen(false)}>
                                Descartar
                            </button>
                            <button className="btn-premium" style={{padding: '0.6rem 2rem'}} onClick={handleSaveRule} disabled={loading}>
                                {loading ? 'Activando...' : 'Publicar'}
                            </button>
                        </div>
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

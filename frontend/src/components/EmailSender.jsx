import React, { useState, useEffect } from 'react';
import './EmailSender.css';
import GmailConnection from './GmailConnection';
import OutlookConnection from './OutlookConnection';
import { useAuth } from '../AuthWrapper';
import { useToast } from '../hooks/useToast';

const EmailSender = ({ empresas = [], onClose, embedded = false }) => {
    const { user } = useAuth();
    const { success, error, warning } = useToast();
    const [activeTab, setActiveTab] = useState('config'); // config, templates, history
    const [selectedEmpresas, setSelectedEmpresas] = useState([]);

    useEffect(() => {
        if (empresas) {
            setSelectedEmpresas(empresas);
        }
    }, [empresas]);

    const toggleEmpresa = (id) => {
        if (selectedEmpresas.find(e => e.id === id)) {
            setSelectedEmpresas(selectedEmpresas.filter(e => e.id !== id));
        } else {
            const empresa = empresas.find(e => e.id === id);
            if (empresa) {
                setSelectedEmpresas([...selectedEmpresas, empresa]);
            }
        }
    };

    const handleConnectionSuccess = (msg) => {
        success(msg);
    };

    const handleConnectionError = (msg) => {
        error(msg);
    };

    return (
        <div className={embedded ? "email-sender-embedded" : "email-sender-overlay"}>
            <div className={embedded ? "email-sender-layout" : "email-sender-modal"}>

                {!embedded && (
                    <div className="email-sender-header">
                        <h2>Gestor de Campañas</h2>
                        <div className="header-right">
                            <button onClick={onClose} className="close-btn">×</button>
                        </div>
                    </div>
                )}

                <div className="email-sender-layout">
                    {/* Sidebar (Config) */}
                    <div className="email-config-sidebar">
                        <div className="config-group">
                            <span className="config-label">Conexiones</span>
                            <div className="email-auth-cards-grid">
                                <GmailConnection
                                    user={user}
                                    onSuccess={handleConnectionSuccess}
                                    onError={handleConnectionError}
                                    minimalist={true}
                                />
                                <OutlookConnection
                                    user={user}
                                    onSuccess={handleConnectionSuccess}
                                    onError={handleConnectionError}
                                    minimalist={true}
                                />
                            </div>
                        </div>

                        <div className="config-group">
                            <span className="config-label">Configuración de Envío</span>
                            <select className="es-select">
                                <option>Seleccionar Plantilla...</option>
                                <option>Presentación General</option>
                                <option>Seguimiento</option>
                            </select>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="email-content-area">
                        <div className="email-tabs">
                            <button
                                className={`email-tab ${activeTab === 'list' ? 'active' : ''}`}
                                onClick={() => setActiveTab('list')}
                            >
                                Destinatarios ({selectedEmpresas.length})
                            </button>
                            <button
                                className={`email-tab ${activeTab === 'editor' ? 'active' : ''}`}
                                onClick={() => setActiveTab('editor')}
                            >
                                Editor
                            </button>
                        </div>

                        {activeTab === 'list' && (
                            <>
                                <div className="list-toolbar">
                                    <span className="selection-info">
                                        {selectedEmpresas.length} seleccionados de {empresas.length}
                                    </span>
                                </div>
                                <div className="recipients-list">
                                    {empresas.length === 0 ? (
                                        <div className="empty-placeholder">
                                            No hay empresas seleccionadas para esta campaña.
                                        </div>
                                    ) : (
                                        empresas.map(empresa => (
                                            <div
                                                key={empresa.id || Math.random()}
                                                className={`recipient-row ${selectedEmpresas.find(e => e.id === empresa.id) ? 'selected' : ''}`}
                                                onClick={() => toggleEmpresa(empresa.id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedEmpresas.find(e => e.id === empresa.id)}
                                                    readOnly
                                                    className="row-check"
                                                />
                                                <div className="row-info">
                                                    <span className="row-name">{empresa.nombre}</span>
                                                    <span className="row-email">{empresa.email || 'Sin email'}</span>
                                                    <span className="row-badge">{empresa.rubro}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'editor' && (
                            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                                <textarea
                                    className="es-textarea"
                                    placeholder="Escribí tu mensaje aquí o seleccioná una plantilla..."
                                ></textarea>
                                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="btn-primary-block" style={{ width: 'auto', padding: '10px 30px' }}>
                                        Enviar Campaña
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailSender;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './SetPassword.css';

const SetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;
            
            setSuccess(true);
        } catch (err) {
            console.error('Error setting password:', err);
            setError(err.message || 'Error al establecer la contraseña. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="set-password-page">
                <div className="set-password-background">
                    <div className="sp-gradient-sphere sphere-1"></div>
                    <div className="sp-gradient-sphere sphere-2"></div>
                    <div className="sp-grid-overlay"></div>
                </div>
                <div className="set-password-container">
                    <div className="set-password-card">
                        <div className="sp-success-view">
                            <div className="sp-success-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <h3>¡Contraseña establecida!</h3>
                            <p>Tu cuenta ha sido configurada correctamente. Ya podés empezar a usar Smart Leads.</p>
                            <button onClick={() => window.location.href = '/'} className="sp-dashboard-btn">
                                Comenzar ahora
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="set-password-page">
            <div className="set-password-background">
                <div className="sp-gradient-sphere sphere-1"></div>
                <div className="sp-gradient-sphere sphere-2"></div>
                <div className="sp-grid-overlay"></div>
            </div>

            <div className="set-password-container">
                <div className="set-password-card">
                    <div className="sp-header">
                        <div className="sp-logo">
                            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="40" height="40" rx="12" fill="url(#logo-gradient-sp)"/>
                                <path d="M12 20L18 14L24 20L18 26L12 20Z" fill="white" fillOpacity="0.9"/>
                                <path d="M16 20L22 14L28 20L22 26L16 20Z" fill="white" fillOpacity="0.6"/>
                                <defs>
                                    <linearGradient id="logo-gradient-sp" x1="0" y1="0" x2="40" y2="40">
                                        <stop stopColor="#81D4FA"/>
                                        <stop offset="1" stopColor="#4FC3F7"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <h2>Bienvenido a Smart Leads</h2>
                        <p>Por seguridad, establecé tu contraseña para empezar.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="sp-form">
                        <div className="sp-input-group">
                            <label htmlFor="password">Nueva Contraseña</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="sp-input-group">
                            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repetí tu contraseña"
                                required
                                disabled={loading}
                            />
                        </div>

                        {error && <div className="sp-error-msg">{error}</div>}

                        <button 
                            type="submit" 
                            className="sp-submit-btn" 
                            disabled={loading || !password || !confirmPassword}
                        >
                            {loading ? 'Guardando...' : 'Establecer Contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SetPassword;

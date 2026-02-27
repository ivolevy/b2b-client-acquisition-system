import React from 'react';
import './Support.css';

function Support() {
    return (
        <div id="support-compact-root">
            <div className="support-aesthetic-card">
                <h1>Soporte</h1>
                <p>¿Tuviste algún problema o necesitás ayuda personalizada? Contactanos ahora.</p>

                <div className="compact-options-stack">
                    {/* WhatsApp */}
                    <a 
                        href="https://wa.me/5491138240929" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="compact-contact-btn whatsapp-flavor"
                    >
                        <div className="btn-icon-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                            </svg>
                        </div>
                        <div className="btn-label-stack">
                            <span className="btn-primary-text">WhatsApp</span>
                            <span className="btn-secondary-text">+54 11 3824 0929</span>
                        </div>
                    </a>

                    {/* Email 1 */}
                    <div 
                        className="compact-contact-btn email-flavor"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                            navigator.clipboard.writeText('ivo.levy03@gmail.com');
                            alert('Email copiado: ivo.levy03@gmail.com');
                        }}
                    >
                        <div className="btn-icon-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                            </svg>
                        </div>
                        <div className="btn-label-stack">
                            <span className="btn-primary-text">Email</span>
                            <span className="btn-secondary-text">ivo.levy03@gmail.com</span>
                        </div>
                    </div>

                    {/* Email 2 */}
                    <div 
                        className="compact-contact-btn email-flavor"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                            navigator.clipboard.writeText('solutionsdota@gmail.com');
                            alert('Email copiado: solutionsdota@gmail.com');
                        }}
                    >
                        <div className="btn-icon-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                            </svg>
                        </div>
                        <div className="btn-label-stack">
                            <span className="btn-primary-text">Email</span>
                            <span className="btn-secondary-text">solutionsdota@gmail.com</span>
                        </div>
                    </div>
                </div>

                <div className="aesthetic-footer">
                    <span className="footer-label">Ivan Levy</span>
                    <span className="footer-name">CTO / Founder</span>
                </div>
            </div>
        </div>
    );
}

export default Support;

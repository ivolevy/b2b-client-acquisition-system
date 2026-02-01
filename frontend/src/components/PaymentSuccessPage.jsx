import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCheck, FiArrowRight, FiMail, FiZap, FiShield, FiExternalLink } from 'react-icons/fi';

const PaymentSuccessPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [show, setShow] = useState(false);
    
    // Extrar data de la URL si MP la manda de vuelta (opcional)
    const paymentId = searchParams.get('payment_id') || 'ORD-' + Math.floor(100000 + Math.random() * 900000);

    useEffect(() => {
        const timer = setTimeout(() => setShow(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="payment-success-page" style={{ 
            minHeight: '100vh', 
            background: '#020617', // Deeper blue/black for premium feel
            color: 'white',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            
            {/* Mesh Gradient Background */}
            <div style={{
                position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
                filter: 'blur(80px)', zIndex: 0, animation: 'float 20s infinite alternate'
            }} />
            <div style={{
                position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
                filter: 'blur(100px)', zIndex: 0, animation: 'float 25s infinite alternate-reverse'
            }} />

            <div style={{ 
                position: 'relative', 
                zIndex: 1, 
                maxWidth: '600px', 
                width: '100%',
                opacity: show ? 1 : 0,
                transform: show ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                
                {/* Success Badge */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            position: 'absolute', inset: '-15px', borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.2)', filter: 'blur(10px)',
                            animation: 'pulse 3s infinite'
                        }} />
                        <div style={{ 
                            width: '80px', height: '80px', 
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '40px', boxShadow: '0 0 40px rgba(16, 185, 129, 0.4)',
                            zIndex: 2, position: 'relative'
                        }}>
                            <FiCheck strokeWidth={3} />
                        </div>
                    </div>
                </div>

                {/* Header Section */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ 
                        fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.02em',
                        background: 'linear-gradient(to bottom, #ffffff, #94a3b8)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        ¡Pago Procesado!
                    </h1>
                    <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: '1.6' }}>
                        Tu suscripción ya está activa. Hemos acreditado tus créditos y desbloqueado todas las funciones premium.
                    </p>
                </div>

                {/* Elegant Glass Card */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '28px',
                    padding: '32px',
                    marginBottom: '40px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        <div>
                            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ID Transacción</span>
                            <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {paymentId} <FiShield size={14} color="#10b981" />
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Estado</span>
                            <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '4px', color: '#10b981' }}>Completado ✓</div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiZap color="#10b981" />
                            </div>
                            <div>
                                <strong style={{ display: 'block', fontSize: '14px' }}>¿Qué sigue?</strong>
                                <span style={{ fontSize: '13px', color: '#64748b' }}>Revisá tu mail para setear tu contraseña de acceso.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <button 
                        onClick={() => navigate('/')}
                        style={{
                            width: '100%',
                            background: 'white',
                            color: '#020617',
                            border: 'none',
                            padding: '20px',
                            borderRadius: '16px',
                            fontSize: '16px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            boxShadow: '0 20px 40px rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 25px 50px rgba(255, 255, 255, 0.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(255, 255, 255, 0.1)';
                        }}
                    >
                        Ir al Dashboard <FiArrowRight />
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
                        <FiMail /> ¿No recibiste el email? 
                        <span style={{ color: '#10b981', cursor: 'pointer', fontWeight: '500' }}>Reenviar ahora</span>
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');
                
                @keyframes float {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(30px, 30px); }
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 0.2; }
                    100% { transform: scale(1); opacity: 0.5; }
                }

                .payment-success-page * {
                    box-sizing: border-box;
                }
            `}</style>
        </div>
    );
};

export default PaymentSuccessPage;


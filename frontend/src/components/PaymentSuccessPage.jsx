import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCheck, FiArrowRight, FiMail, FiZap, FiShield, FiExternalLink, FiLoader } from 'react-icons/fi';
import { authService, supabase } from '../lib/supabase';

const PaymentSuccessPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [show, setShow] = useState(false);
    
    // Extrar data de la URL si MP la manda de vuelta (opcional)
    const paymentId = searchParams.get('payment_id') || 'ORD-' + Math.floor(100000 + Math.random() * 900000);

    const [resending, setResending] = useState(false);
    const [sent, setSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setShow(true), 100);
        
        // Cargar usuario actual si existe para obtener su email
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();

        return () => clearTimeout(timer);
    }, []);

    // Timer para la cuenta regresiva
    useEffect(() => {
        let interval;
        if (countdown > 0) {
            interval = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [countdown]);

    const handleResendEmail = async () => {
        if (!user?.email) {
            toast.info("Por favor, revisá tu casilla de correo. Si no lo encontrás, el soporte puede ayudarte.");
            return;
        }

        if (resending || countdown > 0) return;

        setResending(true);
        try {
            const { error } = await authService.resendConfirmationEmail(user.email);
            if (error) throw error;
            setSent(true);
            setCountdown(60); // Iniciar cuenta regresiva de 1 minuto
            setTimeout(() => setSent(false), 5000); 
        } catch (error) {
            console.error('Error reenviando email:', error);
        } finally {
            setResending(false);
        }
    };

    const planIdParam = searchParams.get('plan_id');
    const isCreditPack = planIdParam?.startsWith('credits_');
    const creditAmountMatch = planIdParam?.match(/credits_(\d+)/);
    const creditAmount = creditAmountMatch ? creditAmountMatch[1] : null;

    return (
        <div className="payment-success-page" style={{ 
            minHeight: '100vh', 
            background: '#f8fafc', // Minimalist light background
            color: '#0f172a', // Dark typography
            fontFamily: "'Outfit', 'Inter', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            
            {/* Subtle Gradient Background */}
            <div style={{
                position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
                filter: 'blur(80px)', zIndex: 0
            }} />
            <div style={{
                position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
                filter: 'blur(100px)', zIndex: 0
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
                        color: '#0f172a'
                    }}>
                        {isCreditPack ? '¡Créditos Cargados!' : '¡Pago Procesado!'}
                    </h1>
                    <p style={{ fontSize: '18px', color: '#64748b', lineHeight: '1.6' }}>
                        {isCreditPack 
                            ? `Hemos acreditado los ${creditAmount || ''} créditos en tu cuenta. Ya podés seguir extrayendo leads sin límites.`
                            : 'Tu suscripción ya está activa. Hemos acreditado tus créditos y desbloqueado todas las funciones premium.'
                        }
                    </p>
                </div>

                {/* Elegant White Card */}
                <div style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '28px',
                    padding: '32px',
                    marginBottom: '40px',
                    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        <div>
                            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ID Transacción</span>
                            <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a' }}>
                                {paymentId} <FiShield size={12} color="#10b981" />
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Estado</span>
                            <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px', color: '#10b981' }}>Completado ✓</div>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiZap color="#10b981" size={20} />
                            </div>
                            <div>
                                <strong style={{ display: 'block', fontSize: '18px', color: '#0f172a', marginBottom: '4px' }}>¿Qué sigue?</strong>
                                <span style={{ fontSize: '15px', color: '#64748b' }}>
                                    {isCreditPack 
                                        ? 'Tus créditos ya están disponibles en tu perfil. Ya podés volver para ver tu nuevo balance.'
                                        : 'Revisá tu mail para confirmar los datos y descargar tu factura si la necesitás.'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <button 
                        onClick={() => navigate('/profile')}
                        style={{
                            width: '100%',
                            background: '#0f172a',
                            color: 'white',
                            border: 'none',
                            padding: '20px',
                            borderRadius: '16px',
                            fontSize: '16px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 25px 50px rgba(15, 23, 42, 0.2)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(15, 23, 42, 0.15)';
                        }}
                    >
                        {isCreditPack ? 'Volver a mi Perfil' : 'Ir a mi Panel'} <FiArrowRight />
                    </button>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
                            <FiMail /> ¿No recibiste el email de confirmación? 
                            <span 
                                onClick={handleResendEmail}
                                style={{ 
                                    color: (resending || countdown > 0) ? '#94a3b8' : '#10b981', 
                                    cursor: (resending || countdown > 0) ? 'not-allowed' : 'pointer', 
                                    fontWeight: '500',
                                    textDecoration: (resending || countdown > 0) ? 'none' : 'underline',
                                    textUnderlineOffset: '4px'
                                }}
                            >
                                {resending ? 'Reenviando...' : countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar ahora'}
                            </span>
                        </div>
                        
                        {sent && (
                            <div style={{ 
                                fontSize: '13px', 
                                color: '#10b981', 
                                fontWeight: '500',
                                animation: 'fadeIn 0.3s ease'
                            }}>
                                Email enviado correctamente ✓
                            </div>
                        )}
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

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .payment-success-page * {
                    box-sizing: border-box;
                }
            `}</style>
        </div>
    );
};

export default PaymentSuccessPage;


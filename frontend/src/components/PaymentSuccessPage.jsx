import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiArrowRight } from 'react-icons/fi';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div className="payment-success-page" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
      color: '#0f172a',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      textAlign: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Dynamic Background Elements */}
      <div style={{
        position: 'absolute', width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        top: '-100px', right: '-100px', borderRadius: '50%', zIndex: 0
      }} />
      <div style={{
        position: 'absolute', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
        bottom: '-150px', left: '-150px', borderRadius: '50%', zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon with Ring */}
        <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 40px' }}>
            <div style={{ 
                position: 'absolute', inset: 0, border: '4px solid #16a34a', borderRadius: '50%',
                opacity: show ? 0.2 : 0, transform: show ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 1s ease-out'
            }} />
            <div style={{ 
                width: '100%', height: '100%', 
                background: '#16a34a', 
                color: 'white',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '48px',
                boxShadow: '0 10px 25px rgba(22, 163, 74, 0.3)',
                transform: show ? 'scale(1)' : 'scale(0.5)',
                opacity: show ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                <FiCheck strokeWidth={3} />
            </div>
        </div>
        
        {/* Text Content */}
        <h1 style={{ 
            fontSize: '42px', fontWeight: '900', marginBottom: '16px', letterSpacing: '-1px',
            background: 'linear-gradient(to bottom, #0f172a, #334155)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease 0.2s'
        }}>
            ¡Suscripción Activada!
        </h1>
        
        <p style={{ 
            fontSize: '20px', color: '#475569', maxWidth: '550px', lineHeight: '1.6', marginBottom: '40px',
            opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease 0.3s'
        }}>
            Bienvenido al nivel PRO. Ya podés disfrutar de todas<br/> las herramientas premium de adquisición B2B.
        </p>

        {/* Action Card */}
        <div style={{ 
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(10px)',
            padding: '24px', 
            borderRadius: '24px', 
            border: '1px solid white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            marginBottom: '40px',
            maxWidth: '450px',
            margin: '0 auto 40px',
            opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s ease 0.4s'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}>
                <div style={{ fontSize: '32px' }}>📩</div>
                <div>
                    <strong style={{ color: '#0f172a', fontSize: '16px' }}>Revisá tu Bandeja de Entrada</strong>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
                        Te enviamos la factura y una guía de inicio rápido.
                    </p>
                </div>
            </div>
        </div>

        <button 
            onClick={() => navigate('/')}
            style={{
                background: '#0f172a',
                color: 'white',
                border: 'none',
                padding: '18px 40px',
                borderRadius: '50px',
                fontSize: '17px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.25)',
                opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.5s ease 0.5s',
                hover: { transform: 'translateY(-2px)', background: '#1e293b' }
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = '#1e293b';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = '#0f172a';
            }}
        >
            Empezar a buscar leads <FiArrowRight />
        </button>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
};

export default PaymentSuccessPage;


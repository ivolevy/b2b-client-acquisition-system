import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiArrowRight } from 'react-icons/fi';
// Removing confetti import if it was used, or using a simple css animation.

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Fade in effect
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div className="payment-success-page" style={{ 
      minHeight: '100vh', 
      background: '#ffffff', 
      color: '#0f172a',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      textAlign: 'center',
      padding: '20px'
    }}>
      
      {/* Icon */}
      <div style={{ 
        width: '80px', height: '80px', 
        background: '#dcfce7', 
        color: '#16a34a',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '40px',
        marginBottom: '40px',
        transform: show ? 'scale(1)' : 'scale(0.5)',
        opacity: show ? 1 : 0,
        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <FiCheck strokeWidth={3} />
      </div>
      
      {/* Text Content */}
      <h1 style={{ 
        fontSize: '36px', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.5px',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease 0.1s'
      }}>
        ¡Pago Exitoso!
      </h1>
      
      <p style={{ 
        fontSize: '18px', color: '#64748b', maxWidth: '500px', lineHeight: '1.6', marginBottom: '40px',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease 0.2s'
      }}>
        Tu suscripción está activa. Hemos enviado los detalles de acceso a tu correo electrónico.
      </p>

      {/* Action Card */}
      <div style={{ 
        background: '#f8fafc', 
        padding: '24px 32px', 
        borderRadius: '16px', 
        border: '1px solid #e2e8f0',
        marginBottom: '40px',
        maxWidth: '400px',
        width: '100%',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease 0.3s'
      }}>
        <p style={{ margin: 0, fontWeight: '500', color: '#334155' }}>
          📩 <strong style={{ color: '#0f172a' }}>Revisá tu Bandeja de Entrada</strong><br/>
          <span style={{ fontSize: '14px', color: '#64748b', display: 'block', marginTop: '4px' }}>
            Si no lo ves, buscá en Spam.
          </span>
        </p>
      </div>

      <button 
        onClick={() => navigate('/')}
        style={{
          background: '#0f172a',
          color: 'white',
          border: 'none',
          padding: '16px 32px',
          borderRadius: '50px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
          opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.5s ease 0.4s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        Ir al Inicio <FiArrowRight />
      </button>

    </div>
  );
};

export default PaymentSuccessPage;

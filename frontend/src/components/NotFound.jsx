import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProBackground from './ProBackground'; // Reusing the background effect

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      padding: '20px',
      position: 'relative',
      fontFamily: 'inherit' // Inherit font from global app
    }}>
      {/* Background Effect */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0f172a',
        zIndex: -1
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
        }} />
      </div>

      <div style={{
        background: 'rgba(30, 41, 59, 0.4)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '24px',
        padding: '3rem 4rem',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <h1 style={{
          fontSize: '6rem',
          fontWeight: '800',
          margin: 0,
          background: 'linear-gradient(to right, #60a5fa, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
          lineHeight: 1
        }}>404</h1>
        
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1rem',
          color: '#e2e8f0'
        }}>Página no encontrada</h2>
        
        <p style={{
          color: '#94a3b8',
          marginBottom: '2.5rem',
          fontSize: '1rem',
          lineHeight: 1.5
        }}>
          La URL que intentas visitar no existe o ha sido movida.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <button 
            onClick={() => window.location.href = 'mailto:admin@dotasolutions.com'}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              padding: '0.875rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '500',
              transition: 'all 0.2s',
              width: '100%'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            Contactar a administrador
          </button>

          <button 
            onClick={() => navigate('/landing')}
            style={{
              background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
              border: 'none',
              color: '#fff',
              padding: '0.875rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'all 0.2s',
              width: '100%',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }}
          >
            Más sobre nosotros
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiPhone, FiLinkedin, FiX } from 'react-icons/fi';

const NotFound = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  // Helper for contact items
  const ContactItem = ({ icon: Icon, label, value, href, color }) => (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '1rem',
        borderRadius: '12px',
        textDecoration: 'none',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        background: `rgba(${color}, 0.1)`,
        color: `rgb(${color})`,
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem'
      }}>
        <Icon />
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2px' }}>{label}</div>
        <div style={{ color: '#fff', fontWeight: '500', fontSize: '0.95rem' }}>{value}</div>
      </div>
    </a>
  );

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
      fontFamily: 'inherit'
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
            onClick={() => setShowModal(true)}
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

      {/* Modal de Contacto */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease'
        }}
        onClick={(e) => {
           if(e.target === e.currentTarget) setShowModal(false);
        }}
        >
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '2rem',
            width: '90%',
            maxWidth: '400px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            animation: 'scaleIn 0.2s ease'
          }}>
            <button 
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FiX size={24} />
            </button>

            <h3 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.25rem',
              color: '#fff',
              textAlign: 'center'
            }}>Contacto del Administrador</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <ContactItem 
                icon={FiMail} 
                label="Correo Electrónico" 
                value="ivo.levy03@gmail.com" 
                href="mailto:ivo.levy03@gmail.com"
                color="244, 63, 94" // pink
              />
              <ContactItem 
                icon={FiPhone} 
                label="WhatsApp" 
                value="+54 11 3824 0929" 
                href="https://wa.me/5491138240929"
                color="34, 197, 94" // green
              />
              <ContactItem 
                icon={FiLinkedin} 
                label="LinkedIn" 
                value="Ivan Levy" 
                href="https://www.linkedin.com/in/ivan-levy/"
                color="59, 130, 246" // blue
              />
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default NotFound;

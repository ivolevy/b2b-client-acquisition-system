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
      overflow: 'hidden',
      fontFamily: 'inherit'
    }}>
      {/* Background Effect - Clean Dark */}
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
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
        }} />
      </div>

      <div style={{
        textAlign: 'center',
        maxWidth: '800px',
        width: '100%',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Clean White Title */}
        <h1 style={{
          fontSize: 'clamp(6rem, 15vw, 12rem)',
          fontWeight: '900',
          margin: '0',
          background: 'linear-gradient(to bottom, #ffffff, #94a3b8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          paddingBottom: '1rem' // Give space for descenders/shadow
        }}>
          ¡Ups!
        </h1>
        
        <div style={{
          marginTop: '1rem',
          marginBottom: '2.5rem',
          position: 'relative',
          maxWidth: '600px'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: '0.75rem',
            color: '#e2e8f0'
          }}>
            404 - Página no encontrada
          </h2>
          
          <p style={{
            color: '#94a3b8',
            fontSize: '1rem',
            lineHeight: 1.6,
            margin: '0 auto'
          }}>
            La página que estás buscando podría haber sido eliminada, cambió de nombre o no está disponible temporalmente.
          </p>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={() => setShowModal(true)}
            style={{
              background: '#fff',
              border: 'none',
              color: '#0f172a',
              padding: '0.75rem 2rem',
              borderRadius: '50px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(255, 255, 255, 0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
          >
            Contactar Admin
          </button>

          <button 
            onClick={() => navigate('/landing')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              padding: '0.75rem 2rem',
              borderRadius: '50px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#fff';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Más sobre nosotros
          </button>
        </div>
      </div>

      {/* Modal de Contacto (Manteniendo funcionalidad) */}
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

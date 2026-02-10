import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiPhone, FiLinkedin, FiX } from 'react-icons/fi';

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Helper for contact items
  const ContactItem = ({ icon: Icon, label, value, href, color, isCopy = false }) => {
    const [copied, setCopied] = useState(false);

    const handleClick = (e) => {
      if (isCopy) {
        e.preventDefault();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <a 
        href={href}
        target={isCopy ? undefined : "_blank"}
        rel={isCopy ? undefined : "noopener noreferrer"}
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: '#0f172a', // Darker inner background for contrast
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '1rem',
          borderRadius: '16px', // Slightly rounder
          textDecoration: 'none',
          transition: 'all 0.2s',
          cursor: 'pointer',
          position: 'relative'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          // Removed hover lift effect as requested
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#0f172a';
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
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2px' }}>{label}</div>
          <div style={{ color: '#fff', fontWeight: '500', fontSize: '0.95rem' }}>
            {value}
            {copied && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#4ade80' }}>(Copiado)</span>}
          </div>
        </div>
      </a>
    );
  };

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
        background: '#020617',
        zIndex: -1
      }}>
        {/* Simplified background - removed radial gradient for cleaner look */}
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
              // Removed lift effect
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(255, 255, 255, 0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
          >
            CONTACTAR ADMINISTRADOR
          </button>

          <button 
            onClick={() => navigate(user ? '/' : '/landing')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8', // Muted text color
              padding: '0.75rem 1rem', // Reduced padding since no border
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            VOLVER AL INICIO
          </button>
        </div>
      </div>

      {/* Modal de Contacto (Manteniendo funcionalidad) */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => {
           if(e.target === e.currentTarget) setShowModal(false);
        }}
        >
          <div style={{
            background: '#1e293b', // Solid Slate-800
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '2.5rem',
            width: '100%',
            maxWidth: '420px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)', // Deep shadow
            animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
            }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#fff',
                  letterSpacing: '-0.01em'
                }}>Contacto de Soporte</h3>
                
                <button 
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.color = '#fff';
                  }}
                  onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <FiX size={20} />
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               <ContactItem 
                icon={FiMail} 
                label="Soporte Técnico" 
                value="solutionsdota@gmail.com" 
                href="#"
                color="244, 63, 94" // pink
                isCopy={true}
              />
               <ContactItem 
                icon={FiMail} 
                label="CTO" 
                value="ivo.levy03@gmail.com" 
                href="#"
                color="168, 85, 247" // purple
                isCopy={true}
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
            
            <div style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                color: '#64748b',
                marginTop: '0.5rem'
            }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', marginRight: '8px' }}></span>
                Disponible 24/7
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

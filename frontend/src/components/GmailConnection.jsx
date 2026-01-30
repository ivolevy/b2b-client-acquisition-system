import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const GmailConnection = ({ user, onSuccess, onError, variant = 'default', minimalist = false }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ connected: false, account_email: null });

  useEffect(() => {
    if (user?.id) {
      checkStatus();
    }
  }, [user]);

  const checkStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/google/status/${user.id}`);
      if (response.data.success) {
        setStatus({
          connected: response.data.connected,
          account_email: response.data.account_email
        });
      }
    } catch (error) {
      console.error("Error checking Gmail status:", error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Pasamos el user.id como state para recuperarlo en el callback
      const response = await axios.post(`${API_URL}/auth/google/url`, { state: user.id });
      if (response.data.success && response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Error getting auth URL:", error);
      onError("No se pudo iniciar la conexión con Google");
    } finally {
      setLoading(false);
    }
  };

  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const handleDisconnectClick = () => {
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = async () => {
    setShowDisconnectModal(false);
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/google/disconnect/${user.id}`);
      if (response.data.success) {
        setStatus({ connected: false, account_email: null });
        onSuccess("Cuenta de Gmail desconectada");
      }
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      onError("Error al desconectar la cuenta");
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'link') {
    return (
      <button 
        onClick={handleConnect}
        disabled={loading}
        style={{
          background: 'none',
          border: 'none',
          color: '#3b82f6',
          fontSize: '0.95rem',
          fontWeight: '500',
          cursor: 'pointer',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          textDecoration: 'none',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
        onMouseOut={(e) => e.target.style.textDecoration = 'none'}
      >
        {loading ? 'Conectando...' : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Vincular Gmail
          </>
        )}
      </button>
    );
  }

  if (variant === 'simple') {
    return (
      <>
        {status.connected ? (
          <div style={{ color: '#4caf50', fontSize: '0.9rem', fontWeight: '600' }}>
            ✓ Cuenta conectada: {status.account_email}
          </div>
        ) : (
          <button 
            onClick={handleConnect}
            disabled={loading}
            className="gmail-connect-btn-premium"
          >
            {loading ? 'Cargando...' : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                Vincular con Google
              </>
            )}
          </button>
        )}
      </>
    );
  }

  if (minimalist) {
    if (status.connected) {
      return (
        <div style={{ color: '#10b981', fontWeight: '600', fontSize: '0.85rem' }}>
          ✓ Conectado
        </div>
      );
    }

    return (
      <button 
        id="gmail-connect-trigger"
        onClick={(e) => { e.stopPropagation(); handleConnect(); }}
        disabled={loading}
        className="gmail-connect-btn-mini"
      >
        {loading ? '...' : 'Conectar Gmail'}
      </button>
    );
  }

  return (
    <>
      <div className="gmail-connection-card" style={{
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '20px',
        border: '1px solid #e2e8f0',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            background: '#ea4335', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Gmail OAuth2</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Enviá emails desde tu propia cuenta
            </p>
          </div>
        </div>

        {status.connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#4caf50', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px' 
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Conectado como: <strong>{status.account_email}</strong>
            </div>
            <button 
              onClick={handleDisconnectClick}
              disabled={loading}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                width: 'fit-content'
              }}
            >
              {loading ? 'Procesando...' : 'Desconectar cuenta'}
            </button>
          </div>
        ) : (
          <button 
            onClick={handleConnect}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#ea4335',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {loading ? 'Cargando...' : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2 C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                Conectar con Gmail
              </>
            )}
          </button>
        )}
      </div>

      {showDisconnectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setShowDisconnectModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(0,0,0,0.1)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: '#0f172a' }}>Desconectar Gmail</h3>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', lineHeight: '1.5' }}>
              ¿Estás seguro de que querés desconectar tu cuenta? Las campañas activas podrían detenerse.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowDisconnectModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#64748b',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDisconnect}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GmailConnection;

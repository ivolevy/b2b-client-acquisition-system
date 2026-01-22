import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const OutlookConnection = ({ user, onSuccess, onError, variant = 'default', minimalist = false }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ connected: false, account_email: null });

  useEffect(() => {
    if (user?.id) {
      checkStatus();
    }
  }, [user]);

  const checkStatus = async () => {
    try {
      // Usamos el nuevo endpoint global y filtramos por outlook
      const response = await axios.get(`${API_URL}/auth/status/${user.id}`);
      if (response.data.outlook) {
        setStatus({
          connected: response.data.outlook.connected,
          account_email: response.data.outlook.email
        });
      }
    } catch (error) {
      console.error("Error checking Outlook status:", error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/outlook/url`, { state: user.id });
      if (response.data.success && response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Error getting outlook auth URL:", error);
      onError("No se pudo iniciar la conexión con Outlook");
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
      const response = await axios.post(`${API_URL}/auth/outlook/disconnect/${user.id}`);
      if (response.data.success) {
        setStatus({ connected: false, account_email: null });
        onSuccess("Cuenta de Outlook desconectada");
      }
    } catch (error) {
      console.error("Error disconnecting Outlook:", error);
      onError("Error al desconectar la cuenta");
    } finally {
      setLoading(false);
    }
  };

  const MicrosoftIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  );

  if (variant === 'simple') {
    return (
      <>
        {status.connected ? (
          <div style={{ color: '#0078D4', fontSize: '0.9rem', fontWeight: '600' }}>
            ✓ Conectado: {status.account_email}
          </div>
        ) : (
          <button 
            onClick={handleConnect}
            disabled={loading}
            className="outlook-connect-btn"
            style={{
               gap:'8px', display:'flex', alignItems:'center',
               background: '#0078D4', color:'white', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer'
            }}
          >
            {loading ? '...' : (
              <>
                <MicrosoftIcon /> Vincular Outlook
              </>
            )}
          </button>
        )}
      </>
    );
  }

  if (minimalist) {
    return (
      <>
        {status.connected ? (
          <div style={{ color: '#0078D4', fontWeight: '600', fontSize: '0.85rem' }}>
            ✓ Conectado
          </div>
        ) : (
          <button 
            id="outlook-connect-trigger"
            onClick={(e) => { e.stopPropagation(); handleConnect(); }}
            disabled={loading}
            className="outlook-connect-mini"
          >
            {loading ? '...' : 'Conectar'}
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <div className="outlook-connection-card" style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            background: 'white', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MicrosoftIcon />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Outlook / Microsoft 365</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Envía emails desde tu cuenta corporativa
            </p>
          </div>
        </div>

        {status.connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#00A4EF', 
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
              background: '#0078D4',
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                   <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                Conectar con Outlook
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
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: '#0f172a' }}>Desconectar Outlook</h3>
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

export default OutlookConnection;

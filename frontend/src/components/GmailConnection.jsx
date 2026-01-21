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

  const handleDisconnect = async () => {
    if (!window.confirm("¿Estás seguro de que querés desconectar tu cuenta de Gmail?")) return;
    
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

  if (variant === 'simple') {
    return status.connected ? (
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
    );
  }

  if (minimalist) {
    return status.connected ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: '600' }}>
          ✓ Conectado: {status.account_email}
        </div>
        <button className="cancel-connection-btn" onClick={handleDisconnect} disabled={loading} style={{fontSize: '0.8rem'}}>
          Desconectar
        </button>
      </div>
    ) : (
      <button 
        onClick={handleConnect}
        disabled={loading}
        className="btn-primary-block"
        style={{ borderRadius: '12px', padding: '12px 24px', width: '100%', background: '#ea4335' }}
      >
        {loading ? 'Conectando...' : 'Conectar Gmail'}
      </button>
    );
  }

  return (
    <div className="gmail-connection-card" style={{
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
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Gmail OAuth2</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
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
            onClick={handleDisconnect}
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
  );
};

export default GmailConnection;

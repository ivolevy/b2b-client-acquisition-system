import React, { useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../AuthWrapper';

const OAuthCallback = () => {
    const { provider } = useParams(); // 'google' or 'outlook'
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const processedRef = useRef(false);

    useEffect(() => {
        const processCallback = async () => {
            if (processedRef.current) return;
            processedRef.current = true;

            const params = new URLSearchParams(location.search);
            const code = params.get('code');
            const state = params.get('state');
            const error = params.get('error');

            if (error) {
                console.error('OAuth Error:', error);
                navigate(`/?${provider}=error&reason=${encodeURIComponent(error)}`, { replace: true });
                return;
            }

            if (!code) {
                console.error('No code received');
                navigate(`/?${provider}=error&reason=no_code`, { replace: true });
                return;
            }

            try {
                // Determine functionality based on provider
                // Outlook: /auth/outlook/callback
                // Gmail: /auth/google/callback
                
                const endpoint = provider === 'outlook' 
                    ? `${API_URL}/auth/outlook/callback` 
                    : `${API_URL}/auth/google/callback`;

                // For Gmail, sometimes generic google is used
                
                const response = await axios.get(endpoint + location.search);

                if (response.data.success || response.data.connected) {
                    navigate(`/?${provider}=success`, { replace: true });
                } else {
                     navigate(`/?${provider}=error&reason=backend_failure`, { replace: true });
                }

            } catch (err) {
                console.error('Callback error:', err);
                const msg = err.response?.data?.detail || err.message;
                navigate(`/?${provider}=error&reason=${encodeURIComponent(msg)}`, { replace: true });
            }
        };

        processCallback();
    }, [provider, location.search, navigate]);

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255,255,255,0.2)',
                borderTopColor: '#e91e63',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
            }}></div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 500 }}>Conectando con {provider === 'outlook' ? 'Outlook' : 'Google'}...</h2>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default OAuthCallback;

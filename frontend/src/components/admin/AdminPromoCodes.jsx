import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../lib/supabase';
import './AdminPromoCodes.css';

function AdminPromoCodes() {
  const navigate = useNavigate();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error: codesError } = await adminService.getAllPromoCodes();
      
      if (codesError) {
        setError('Error al cargar códigos');
        return;
      }
      
      setCodes(data || []);
    } catch (err) {
      setError('Error al cargar códigos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-promo-codes">
      <div className="admin-header">
        <button onClick={() => navigate('/backoffice')} className="back-btn">
          ← Volver
        </button>
        <h1>Códigos Promocionales</h1>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando códigos...</p>
        </div>
      ) : (
        <div className="codes-container">
          <div className="codes-count">
            Total: {codes.length} códigos
          </div>
          
          <div className="codes-table">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Plan</th>
                  <th>Duración</th>
                  <th>Usos</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {codes.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                      No hay códigos promocionales
                    </td>
                  </tr>
                ) : (
                  codes.map((code) => (
                    <tr key={code.id}>
                      <td><strong>{code.code}</strong></td>
                      <td>
                        <span className={`badge badge-${code.plan}`}>
                          {code.plan?.toUpperCase()}
                        </span>
                      </td>
                      <td>{code.duration_days} días</td>
                      <td>{code.used_count} / {code.max_uses || '∞'}</td>
                      <td>
                        <span className={`badge ${code.is_active ? 'badge-active' : 'badge-inactive'}`}>
                          {code.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPromoCodes;

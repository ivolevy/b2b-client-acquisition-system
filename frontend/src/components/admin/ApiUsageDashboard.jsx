import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import './AdminDashboard.css'; // Reusar estilos base de admin

function ApiUsageDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('supabase.auth.token'); // O el método que uses para el token
      const response = await axios.get(`${API_BASE_URL}/admin/usage-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      setError('No se pudieron cargar las estadísticas de uso.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="admin-loading"><div className="spinner"></div><p>Cargando métricas...</p></div>;
  if (error) return <div className="admin-error">{error}</div>;

  const totalCost = stats?.total_estimated_cost_usd || 0;
  const limit = 200;
  const percentage = Math.min((totalCost / limit) * 100, 100);
  const isFallback = stats?.provider_status === 'osm';

  return (
    <div className="admin-dashboard-container">
      <header className="admin-header">
        <h1>Monitoreo de API y Créditos</h1>
        <p>Control de gastos en tiempo real de Google Places API (New)</p>
      </header>

      <div className="admin-stats-grid">
        {/* Card de Créditos */}
        <div className="admin-stat-card glass pro-border">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>Crédito Mensual (Free Tier)</h3>
            <div className="usage-progress-container">
              <div className="usage-progress-bar">
                <div 
                  className={`usage-progress-fill ${percentage > 90 ? 'critical' : percentage > 70 ? 'warning' : ''}`} 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="usage-labels">
                <span className="usage-current">${totalCost.toFixed(2)}</span>
                <span className="usage-limit">Límite: ${limit}.00</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card de Proveedor Activo */}
        <div className={`admin-stat-card glass pro-border ${isFallback ? 'fallback-active' : 'google-active'}`}>
          <div className="stat-icon">{isFallback ? '🔄' : '⚡'}</div>
          <div className="stat-info">
            <h3>Proveedor Actual</h3>
            <div className="provider-status">
              <span className={`status-dot ${isFallback ? 'yellow' : 'green'}`}></span>
              <span className="status-text">
                {isFallback ? 'Modo Ahorro: OpenStreetMap' : 'Premium: Google Places API'}
              </span>
            </div>
            <p className="status-desc">
              {isFallback 
                ? 'El sistema cambió automáticamente a OSM para evitar cargos.' 
                : 'Usando datos oficiales de Google con máxima precisión.'}
            </p>
          </div>
        </div>
      </div>

      <div className="admin-table-container glass pro-border" style={{ marginTop: '2rem' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>SKU / Servicio</th>
              <th>Llamadas</th>
              <th>Costo Est. (USD)</th>
              <th>Última Actividad</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.stats || []).map((s, idx) => (
              <tr key={idx}>
                <td className="sku-name">{s.sku.toUpperCase()}</td>
                <td>{s.calls_count}</td>
                <td>${parseFloat(s.estimated_cost_usd).toFixed(4)}</td>
                <td>{new Date(s.last_update).toLocaleString()}</td>
              </tr>
            ))}
            {(!stats?.stats || stats.stats.length === 0) && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                  No se registran llamadas en el periodo actual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .usage-progress-container { margin-top: 1rem; }
        .usage-progress-bar {
          height: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .usage-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #81D4FA, #2196F3);
          transition: width 0.5s ease;
        }
        .usage-progress-fill.warning { background: linear-gradient(90deg, #FFC107, #FF9800); }
        .usage-progress-fill.critical { background: linear-gradient(90deg, #F44336, #B71C1C); }
        .usage-labels { display: flex; justify-content: space-between; font-size: 0.85rem; opacity: 0.8; }
        
        .provider-status { display: flex; alignItems: center; gap: 8px; margin: 0.5rem 0; font-weight: 600; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; }
        .status-dot.green { background: #4CAF50; box-shadow: 0 0 10px #4CAF50; }
        .status-dot.yellow { background: #FFC107; box-shadow: 0 0 10px #FFC107; }
        .status-text { text-transform: uppercase; letter-spacing: 1px; }
        .status-desc { font-size: 0.8rem; opacity: 0.7; }
        
        .sku-name { font-weight: 600; color: #81D4FA; }
        
        .google-active { border-left: 4px solid #4CAF50 !important; }
        .fallback-active { border-left: 4px solid #FFC107 !important; }
      `}</style>
    </div>
  );
}

export default ApiUsageDashboard;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { 
  FiActivity, 
  FiDollarSign, 
  FiDatabase, 
  FiAlertTriangle, 
  FiCheckCircle,
  FiServer,
  FiClock,
  FiTrendingUp,
  FiShield,
  FiChevronDown
} from 'react-icons/fi';
// import './AdminDashboard.css'; // Removed to prevent conflicts with dark theme

function ApiUsageDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchLogs();
    }
  }, [token]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/usage-stats`, {
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

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const response = await axios.get(`${API_URL}/admin/api-logs?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setLogs(response.data.logs);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  if (loading) return (
    <div className="dashboard-loading">
      <div className="spinner-ring"></div>
      <p>Sincronizando métricas...</p>
    </div>
  );

  if (error) return (
    <div className="dashboard-error">
      <FiAlertTriangle size={48} />
      <p>{error}</p>
      <button onClick={fetchStats} className="retry-btn">Reintentar</button>
    </div>
  );

  const totalCost = stats?.total_estimated_cost_usd || 0;
  const limit = 200; // Hard limit de seguridad
  const percentage = Math.min((totalCost / limit) * 100, 100);
  const isFallback = stats?.provider_status === 'osm';
  const remainingBudget = limit - totalCost;

  return (
    <div className="premium-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Panel de Control API</h1>
          <p>Monitoreo de consumo Google Places vs OpenStreetMap</p>
        </div>
        <div className="header-actions">
           <span className={`status-badge ${isFallback ? 'warning' : 'success'}`}>
            {isFallback ? 'Modo Ahorro (OSM)' : 'Google Places Activo'}
          </span>
          <span className="date-badge">
            {stats?.month || new Date().toISOString().slice(0, 7)}
          </span>
        </div>
      </header>

      {/* metric-summary-hero: Simplified header metrics */}
      <div className="simple-metric-hero glass-panel">
        <div className="simple-metric-main">
          <span className="simple-label">GASTO MENSUAL</span>
          <h2 className="simple-value">${totalCost.toFixed(2)}</h2>
        </div>
        <div className="simple-metric-sub">
          <span className="simple-label">PRESUPUESTO</span>
          <span className="simple-sub-value">${limit}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* SKU Breakdown Table */}
        <section className="dashboard-section glass-panel">
          <div className="section-header">
            <h3>Desglose por Servicio</h3>
          </div>
          <div className="table-container">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>TIPO</th>
                  <th className="text-right">VOLUMEN</th>
                  <th className="text-right">COSTO ESTIMADO</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.stats || []).map((s, idx) => (
                  <tr key={idx} className="hover-row">
                    <td>
                      <div className="sku-info-simple">
                         <span className="sku-primary">
                            {s.sku === 'pro' ? 'Google Places API' : 'OSM / Autónomo'}
                          </span>
                      </div>
                    </td>
                    <td className="text-right">
                       <span className="val-main">{s.calls_count}</span>
                    </td>
                    <td className="text-right">
                       <span className="val-main text-accent">${parseFloat(s.estimated_cost_usd).toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
                 {(!stats?.stats || stats.stats.length === 0) && (
                    <tr><td colSpan="5" className="text-center p-4 text-muted">Sin actividad registrada</td></tr>
                 )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Logs Compact Table */}
        <section className="dashboard-section glass-panel">
          <div className="section-header">
            <h3>Historial Reciente</h3>
             <span className="header-note">Últimos 50 requests</span>
          </div>
          <div className="table-container">
            <table className="clean-table compact">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Endpoint / Query</th>
                  <th>Status</th>
                  <th className="text-right">Duración</th>
                  <th className="text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="log-row">
                    <td className="text-muted text-sm">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td>
                      <div className="log-endpoint">
                        <span className="endpoint-name">{log.endpoint.split(':').pop()}</span>
                        {log.metadata?.query && (
                           <span className="log-query" title={log.metadata.query}>
                             "{log.metadata.query.substring(0, 30)}{log.metadata.query.length > 30 ? '...' : ''}"
                           </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className={`status-dot ${log.status_code === 200 ? 'success' : 'error'}`}></span>
                          <span className={`status-text ${log.status_code !== 200 ? 'text-error' : ''}`}>
                            {log.status_code}
                          </span>
                      </div>
                    </td>
                    <td className="text-right text-sm text-muted">{log.duration_ms}ms</td>
                    <td className="text-right text-sm">
                        {log.cost_usd > 0 ? (
                            <span className="text-accent">${parseFloat(log.cost_usd).toFixed(3)}</span>
                        ) : (
                            <span className="text-muted">-</span>
                        )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                    <tr><td colSpan="5" className="text-center p-4 text-muted">No hay logs recientes</td></tr>
                 )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style jsx>{`
        /* --- Layout & Reset --- */
        .premium-dashboard {
          padding: 2rem;
          background: #0f172a;
          color: #e2e8f0;
          font-family: 'Inter', system-ui, sans-serif;
          min-height: 100vh;
        }

        .glass-panel {
          background: rgba(30, 41, 59, 0.45) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 16px;
          backdrop-filter: blur(12px);
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .dashboard-section {
          margin-bottom: 2rem;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-content h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0;
        }
        
        .header-content p { color: #64748b; margin: 0.25rem 0 0 0; font-size: 0.9rem; }
        .header-icon { color: var(--primary); }
        
        .header-actions { display: flex; gap: 1rem; }
        
        .status-badge, .date-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.8rem;
          border-radius: 99px;
          font-size: 0.8rem;
          font-weight: 500;
          backdrop-filter: blur(4px);
        }
        
        .status-badge.success { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
        .status-badge.warning { background: rgba(234, 179, 8, 0.1); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.2); }
        .date-badge { background: rgba(255, 255, 255, 0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); }

        /* --- Simple Hero styles --- */
        .simple-metric-hero {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 2.5rem;
          margin-bottom: 2.5rem;
          text-align: center;
        }

        .simple-metric-main .simple-value {
          font-size: 3.5rem;
          font-weight: 900;
          color: #fff;
          margin: 0.5rem 0 0 0;
          letter-spacing: -0.05em;
        }

        .simple-label {
          font-size: 0.9rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-weight: 700;
        }

        .simple-metric-sub .simple-sub-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #64748b;
          display: block;
          margin-top: 0.5rem;
        }

        /* --- SKU Styles Simplified --- */
        .sku-info-simple {
          display: flex;
          flex-direction: column;
        }

        .sku-primary {
          font-weight: 600;
          color: #fff;
          font-size: 1rem;
        }

        .clean-table th {
          text-align: left;
          padding: 1.25rem 1rem;
          color: #64748b;
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .clean-table td {
          padding: 1.5rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
          vertical-align: middle;
        }

        .val-main {
          font-weight: 700;
          color: #e2e8f0;
          font-size: 1.1rem;
        }

        .dashboard-grid {
          display: grid;
          gap: 2.5rem;
        }

        .section-header {
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .section-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .header-note {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 0.25rem;
          display: block;
        }

        .text-accent { color: #60a5fa; font-weight: 800; }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            .premium-dashboard { padding: 1rem 0.5rem !important; }
            .simple-metric-hero { flex-direction: column; gap: 2rem; padding: 1.5rem; }
            .simple-metric-main .simple-value { font-size: 2.5rem; }
            .dashboard-grid { gap: 1.5rem; }
            .table-container { width: 100%; overflow-x: auto; }
        }

        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .dashboard-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; color: #64748b; gap: 1rem; }
        .spinner-ring { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
        
        .dashboard-error { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; color: #ef4444; gap: 1rem; text-align: center; }
        .retry-btn { padding: 0.5rem 1.5rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .retry-btn:hover { background: rgba(239, 68, 68, 0.2); }
      `}</style>
    </div>
  );
}

export default ApiUsageDashboard;

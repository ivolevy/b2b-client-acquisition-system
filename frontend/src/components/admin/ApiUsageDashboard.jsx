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

      <div className="compact-hero-row glass-panel">
        <div className="compact-stat">
          <span className="compact-label">GASTO MENSUAL</span>
          <span className="compact-value highlight">${totalCost.toFixed(2)}</span>
        </div>
        <div className="compact-divider"></div>
        <div className="compact-stat">
          <span className="compact-label">CONSULTAS</span>
          <span className="compact-value">{stats?.stats?.reduce((acc, s) => acc + s.calls_count, 0) || 0}</span>
        </div>
        <div className="compact-divider"></div>
        <div className="compact-stat">
          <span className="compact-label">PRESUPUESTO</span>
          <span className="compact-value muted">${limit}</span>
        </div>
        <div className="compact-stat right-aligned">
           <span className={`status-dot-large ${isFallback ? 'warning' : 'success'}`}></span>
           <span className="compact-label">{isFallback ? 'Modo Ahorro' : 'Google Places'}</span>
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

        {/* Logs - Only if errors exist */}
        {logs.some(log => log.status_code !== 200) && (
          <section className="dashboard-section glass-panel error-logs-section">
            <div className="section-header small">
              <h3>Errores / Alertas Recientes</h3>
              <span className="header-note">Últimos eventos críticos detectados</span>
            </div>
            <div className="table-container">
              <table className="clean-table compact">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Endpoint</th>
                    <th>Status</th>
                    <th className="text-right">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.filter(log => log.status_code !== 200).map((log) => (
                    <tr key={log.id} className="log-row error">
                      <td className="text-muted text-xs">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </td>
                      <td className="text-sm">
                        <span className="endpoint-name-compact">{log.endpoint.split(':').pop()}</span>
                      </td>
                      <td>
                        <span className="status-badge-mini error">{log.status_code}</span>
                      </td>
                      <td className="text-right text-xs">
                         ${parseFloat(log.cost_usd).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
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

        /* --- Compact Hero styles --- */
        .compact-hero-row {
          display: flex;
          align-items: center;
          padding: 1rem 2rem;
          margin-bottom: 2rem;
          gap: 3rem;
        }

        .compact-stat {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .compact-stat.right-aligned {
          margin-left: auto;
          flex-direction: row;
          align-items: center;
          gap: 0.75rem;
        }

        .compact-label {
          font-size: 0.7rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
        }

        .compact-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #e2e8f0;
          line-height: 1;
        }

        .compact-value.highlight {
          color: #fff;
          font-size: 1.75rem;
        }

        .compact-value.muted {
          color: #475569;
        }

        .compact-divider {
          width: 1px;
          height: 30px;
          background: rgba(255, 255, 255, 0.05);
        }

        .status-dot-large {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 10px currentColor;
        }
        .status-dot-large.success { background: #4ade80; color: rgba(74, 222, 128, 0.4); }
        .status-dot-large.warning { background: #fbbf24; color: rgba(251, 191, 36, 0.4); }

        /* --- SKU Table Compact --- */
        .sku-info-simple {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sku-primary {
          font-weight: 500;
          color: #cbd5e1;
          font-size: 0.9rem;
        }

        .clean-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          color: #475569;
          font-weight: 700;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 1px solid rgba(148, 163, 184, 0.05);
        }

        .clean-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.02);
          vertical-align: middle;
        }

        .val-main {
          font-weight: 600;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .section-header h3 {
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .text-accent { color: #60a5fa; font-weight: 600; }

        /* Error logs specific */
        .status-badge-mini {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .status-badge-mini.error {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .endpoint-name-compact {
           font-family: 'Space Mono', monospace;
           color: #64748b;
        }

        /* Overall scale reduction */
        .premium-dashboard {
           padding: 1.5rem;
           max-width: 1200px;
           margin: 0 auto;
        }

        .glass-panel {
           padding: 1rem 1.5rem;
           border-radius: 12px;
        }

        .dashboard-grid {
           gap: 1.5rem;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            .premium-dashboard { padding: 1rem 0.5rem !important; }
            .compact-hero-row { flex-direction: column; align-items: flex-start; gap: 1.5rem; padding: 1.5rem; }
            .compact-divider { display: none; }
            .compact-stat.right-aligned { margin-left: 0; }
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

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

      {/* metric-summary-cards: Quick glance at key metrics */}
      <div className="metric-summary-grid">
        <div className="metric-summary-card glass-panel">
          <div className="metric-summary-icon-bg cost">
            <FiDollarSign size={24} />
          </div>
          <div className="metric-summary-details">
            <span className="metric-summary-label">Gasto Mensual</span>
            <div className="metric-summary-value-row">
              <span className="metric-summary-main-value">${totalCost.toFixed(2)}</span>
              <span className="metric-summary-sub-value">/ ${limit}</span>
            </div>
            <div className="metric-summary-mini-progress">
              <div className="mini-progress-track">
                <div 
                  className={`mini-progress-fill ${percentage > 90 ? 'critical' : percentage > 70 ? 'warning' : ''}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="metric-summary-card glass-panel">
          <div className="metric-summary-icon-bg calls">
            <FiActivity size={24} />
          </div>
          <div className="metric-summary-details">
            <span className="metric-summary-label">Total Consultas</span>
            <div className="metric-summary-main-value">{stats?.stats?.reduce((acc, s) => acc + s.calls_count, 0) || 0}</div>
            <span className="metric-summary-sub-text">Mes en curso</span>
          </div>
        </div>

        <div className="metric-summary-card glass-panel">
          <div className="metric-summary-icon-bg status">
            {isFallback ? <FiAlertTriangle size={24} /> : <FiCheckCircle size={24} />}
          </div>
          <div className="metric-summary-details">
            <span className="metric-summary-label">Estado del Proveedor</span>
            <div className={`metric-summary-main-value ${isFallback ? 'text-warning' : 'text-success'}`}>
              {isFallback ? 'Modo Ahorro' : 'Google Places'}
            </div>
            <span className="metric-summary-sub-text">Presupuesto: ${remainingBudget.toFixed(2)} rem.</span>
          </div>
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
                  <th>Proveedor / Tipo</th>
                  <th className="text-right">Volumen</th>
                  <th className="text-right">Costo Estimado</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.stats || []).map((s, idx) => (
                  <tr key={idx} className="hover-row">
                    <td>
                      <div className="sku-group">
                        <div className="sku-icon">
                          {s.sku === 'pro' ? <FiActivity /> : <FiDatabase />}
                        </div>
                        <div className="sku-info">
                          <span className="sku-primary">
                            {s.sku === 'pro' ? 'Google Places API' : 'Servicio Autonómo'}
                          </span>
                          <span className="sku-secondary">{s.sku === 'pro' ? 'Consultas B2B Premium' : 'Búsqueda por Mapa'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="val-stack">
                        <span className="val-main">{s.calls_count}</span>
                        <span className="val-sub">requests</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="val-stack">
                        <span className="val-main text-accent">${parseFloat(s.estimated_cost_usd).toFixed(2)}</span>
                        <span className="val-sub">{s.sku === 'pro' ? '$0.032/u' : 'Gratuitos'}</span>
                      </div>
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

        /* --- Metric Summary Cards --- */
        .metric-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-summary-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
          transition: transform 0.2s;
        }

        .metric-summary-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.1);
        }

        .metric-summary-icon-bg {
          width: 58px;
          height: 58px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .metric-summary-icon-bg.cost { color: #60a5fa; background: rgba(59, 130, 246, 0.08); box-shadow: 0 4px 20px rgba(59, 130, 246, 0.1); }
        .metric-summary-icon-bg.calls { color: #a78bfa; background: rgba(139, 92, 246, 0.08); box-shadow: 0 4px 20px rgba(139, 92, 246, 0.1); }
        .metric-summary-icon-bg.status { color: #4ade80; background: rgba(34, 197, 94, 0.08); box-shadow: 0 4px 20px rgba(34, 197, 94, 0.1); }
        .metric-summary-icon-bg.status.warning { color: #facc15; background: rgba(234, 179, 8, 0.08); box-shadow: 0 4px 20px rgba(234, 179, 8, 0.1); }

        .metric-summary-details {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .metric-summary-label {
          font-size: 0.8rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .metric-summary-main-value {
          font-size: 1.85rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .metric-summary-value-row {
          display: flex;
          align-items: baseline;
          gap: 0.6rem;
        }

        .metric-summary-sub-value {
          font-size: 1rem;
          color: rgba(148, 163, 184, 0.7);
          font-weight: 500;
        }

        .metric-summary-sub-text {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-top: 0.35rem;
          font-weight: 500;
        }

        .metric-summary-mini-progress {
          margin-top: 1rem;
          width: 100%;
        }

        .mini-progress-track {
          height: 8px;
          background: rgba(0,0,0,0.3);
          border-radius: 4px;
          overflow: hidden;
        }

        .mini-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          border-radius: 4px;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
        }

        .mini-progress-fill.warning { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
        .mini-progress-fill.critical { background: linear-gradient(90deg, #ef4444, #f87171); }

        /* --- SKU Styles --- */
        .sku-group {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .sku-icon {
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .sku-info {
          display: flex;
          flex-direction: column;
        }

        .sku-primary {
          font-weight: 600;
          color: #fff;
          font-size: 0.95rem;
        }

        .sku-secondary {
          font-size: 0.75rem;
          color: #64748b;
        }

        .clean-table th {
          text-align: left;
           padding: 1.25rem 1rem;
          color: #94a3b8;
          font-weight: 700;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-bottom: 2px solid rgba(255, 255, 255, 0.05);
        }

        .clean-table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          vertical-align: middle;
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
        }

        .header-note {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 0.25rem;
          display: block;
        }

        .text-success { color: #4ade80; font-weight: 600; }
        .text-warning { color: #facc15; font-weight: 600; }
        .text-accent { color: #60a5fa; font-weight: 700; }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            .premium-dashboard { padding: 1rem 0.5rem !important; }
            .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
            
            .metric-summary-grid {
              grid-template-columns: 1fr;
              gap: 1rem;
            }

            .main-number { font-size: 2rem; }
            .clean-table { font-size: 0.75rem; }
            .clean-table th, .clean-table td { padding: 0.5rem !important; }
            
            .sku-primary { font-size: 0.85rem; }
            .sku-secondary { font-size: 0.7rem; }
            
            .glass-panel { padding: 1rem; }
            .dashboard-grid { gap: 1rem; }
            
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

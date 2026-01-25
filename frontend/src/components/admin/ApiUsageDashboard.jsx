import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config';
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
import './AdminDashboard.css';

function ApiUsageDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('supabase.auth.token');
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

      {/* Hero Section: Consolidated Status */}
      <div className="hero-section">
        <div className="hero-card glass-panel">
          <div className="hero-main">
            <div className="hero-info">
              <h3>Gasto Mensual Estimado</h3>
              <div className="hero-value">
                <span className="main-number">${totalCost.toFixed(2)}</span>
                <span className="separator">/</span>
                <span className="limit-number">${limit.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="hero-progress">
             <div className="progress-labels">
               <span>Uso del Presupuesto</span>
               <strong>{percentage.toFixed(1)}%</strong>
             </div>
             <div className="progress-track-large">
                <div 
                  className={`progress-fill-large ${percentage > 90 ? 'critical' : percentage > 70 ? 'warning' : ''}`}
                  style={{ width: `${percentage}%` }}
                >
                  <div className="glow-effect"></div>
                </div>
             </div>
             <div className="hero-footer">
               <span>Restante: <strong>${remainingBudget.toFixed(2)}</strong></span>
               <span>{isFallback ? 'Límite excedido' : 'Dentro del presupuesto'}</span>
             </div>
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
                  <th>Servicio</th>
                  <th>Características</th>
                  <th className="text-right">Volumen</th>
                  <th className="text-right">Costo Unitario</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.stats || []).map((s, idx) => (
                  <tr key={idx} className="hover-row">
                    <td>
                      <div className="sku-name">
                        {s.sku === 'pro' ? 'Google Places Requests' : s.sku.toUpperCase()}
                      </div>
                    </td>
                    <td>
                      <div className="tags-row">
                        {s.sku === 'pro' ? (
                          <>
                            <span className="mini-tag">Web</span>
                            <span className="mini-tag">Teléfono</span>
                            <span className="mini-tag">Estado</span>
                          </>
                        ) : (
                          <span className="mini-tag basic">Básico</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right font-mono">{s.calls_count}</td>
                    <td className="text-right font-mono text-muted">
                        {s.sku === 'pro' ? '$0.032' : '$0.00'}
                    </td>
                    <td className="text-right font-mono text-accent">
                      ${parseFloat(s.estimated_cost_usd).toFixed(4)}
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
        .header-icon { color: #3b82f6; }
        
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

        /* --- Hero Section --- */
        .hero-section { margin-bottom: 2rem; }
        
        .glass-panel {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          backdrop-filter: blur(10px);
          padding: 1.5rem;
        }

        .hero-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 3rem;
        }

        .hero-main { display: flex; align-items: center; gap: 1.5rem; }
        
        .hero-icon-wrapper {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(147,51,234,0.1));
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          color: #60a5fa;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .hero-info h3 { margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .hero-value { display: flex; align-items: baseline; gap: 0.5rem; }
        .main-number { font-size: 2.5rem; font-weight: 700; color: #fff; line-height: 1; }
        .separator { font-size: 1.5rem; color: #475569; }
        .limit-number { font-size: 1.5rem; color: #64748b; }

        .hero-progress { flex: 1; max-width: 600px; }
        
        .progress-labels { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; color: #cbd5e1; }
        
        .progress-track-large {
          height: 16px;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 0.5rem;
          border: 1px solid rgba(255,255,255,0.05);
        }
        
        .progress-fill-large {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 8px;
          position: relative;
          transition: width 0.8s ease-out;
        }
        
        .progress-fill-large.warning { background: linear-gradient(90deg, #f59e0b, #facc15); }
        .progress-fill-large.critical { background: linear-gradient(90deg, #ef4444, #f87171); }

        .glow-effect {
          position: absolute; top:0; right:0; bottom:0; width: 30px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        .hero-footer { display: flex; justify-content: space-between; font-size: 0.85rem; color: #64748b; }

        /* --- Dashboard Grid --- */
        .dashboard-grid {
          display: grid;
          gap: 2rem;
        }

        .section-header {
            display: flex;
            align-items: baseline;
            gap: 1rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .section-header h3 { margin: 0; font-size: 1.1rem; color: #e2e8f0; display: flex; align-items: center; gap: 0.5rem; }
        .section-icon { color: #60a5fa; }
        .header-note { font-size: 0.8rem; color: #64748b; }

        /* --- Clean Table --- */
        .table-container { overflow-x: auto; }
        
        .clean-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
        .clean-table th { text-align: left; padding: 1rem; color: #64748b; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .clean-table td { padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.02); vertical-align: middle; }
        .clean-table tr:last-child td { border-bottom: none; }
        
        .hover-row:hover { background: rgba(255,255,255,0.02); }

        .sku-name { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #fff; }
        .premium-pill { background: linear-gradient(90deg, #3b82f6, #8b5cf6); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; }

        .tags-row { display: flex; gap: 0.5rem; }
        .mini-tag { font-size: 0.75rem; padding: 2px 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #cbd5e1; }
        .mini-tag.basic { color: #64748b; border-color: transparent; background: transparent; padding-left: 0; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: 'Space Mono', monospace; }
        .text-muted { color: #64748b; }
        .text-accent { color: #4ade80; font-weight: 600; }
        .text-error { color: #ef4444; }
        .text-sm { font-size: 0.85rem; }

        /* --- Logs Compact --- */
        .clean-table.compact th, .clean-table.compact td { padding: 0.6rem 1rem; }
        .log-row .log-endpoint { display: flex; flex-direction: column; }
        .endpoint-name { color: #e2e8f0; font-weight: 500; }
        .log-query { font-size: 0.75rem; color: #64748b; font-style: italic; }
        
        .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
        .status-dot.success { background: #4ade80; box-shadow: 0 0 5px rgba(74, 222, 128, 0.4); }
        .status-dot.error { background: #ef4444; box-shadow: 0 0 5px rgba(239, 68, 68, 0.4); }

        /* Mobile */
        @media (max-width: 768px) {
            .premium-dashboard { padding: 1rem; }
            .hero-card { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
            .hero-progress { width: 100%; max-width: none; }
            .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
            
            /* Typography reduction */
            .header-content h1 { font-size: 1.25rem; }
            .main-number { font-size: 2rem; }
            .separator, .limit-number { font-size: 1.2rem; }
            .clean-table { font-size: 0.75rem; }
            .clean-table th, .clean-table td { padding: 0.5rem; }
            
            /* Hide unimportant columns in Service Breakdown (Table 1) */
            /* Hide Characteristics (2) and Unit Cost (4) */
            .clean-table:not(.compact) th:nth-child(2), 
            .clean-table:not(.compact) td:nth-child(2),
            .clean-table:not(.compact) th:nth-child(4), 
            .clean-table:not(.compact) td:nth-child(4) {
                display: none;
            }
            
            /* Hide unimportant columns in Logs (Table 2 - .compact) */
            /* Hide Duration (4) */
            .clean-table.compact th:nth-child(4), 
            .clean-table.compact td:nth-child(4) {
                display: none;
            }
            
            .sku-name { font-size: 0.8rem; }
            .mini-tag { font-size: 0.65rem; padding: 1px 4px; }
            
            /* FORCE FULL WIDTH on Mobile */
            .premium-dashboard {
                padding: 1rem 0.5rem !important; /* Minimal side padding */
                width: 100% !important;
                max-width: 100vw !important;
                box-sizing: border-box;
                overflow-x: hidden;
            }
            
            .glass-panel {
                border-radius: 12px;
                padding: 1rem;
                margin: 0;
            }
            
            .dashboard-grid {
                gap: 1rem;
            }
            
            /* Ensure tables don't blowout width */
            .table-container {
                width: 100%;
                overflow-x: auto;
            }
        }

        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .dashboard-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; color: #64748b; gap: 1rem; }
        .spinner-ring { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        
        .dashboard-error { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; color: #ef4444; gap: 1rem; text-align: center; }
        .retry-btn { padding: 0.5rem 1.5rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .retry-btn:hover { background: rgba(239, 68, 68, 0.2); }
      `}</style>
    </div>
  );
}

export default ApiUsageDashboard;

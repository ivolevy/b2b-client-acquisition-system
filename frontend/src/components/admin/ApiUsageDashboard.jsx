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
      const response = await axios.get(`${API_URL}/api/admin/usage-stats`, {
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
      const response = await axios.get(`${API_URL}/api/admin/api-logs?limit=50`, {
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
  const limit = 200; // Google Cloud Free Credits
  const percentage = Math.min((totalCost / limit) * 100, 100);
  const isFallback = stats?.provider_status === 'osm';
  const remainingBudget = Math.max(0, limit - totalCost);
  const extraSpending = Math.max(0, totalCost - limit);

  // Formatting for UI Clarity
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const fullMonths = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  
  const now = new Date();
  const currentMonthStr = fullMonths[now.getMonth()];
  const currentYear = now.getFullYear();
  
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthLabel = `01 ${months[nextMonthDate.getMonth()]}`;

  return (
    <div className="premium-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Panel de Control API</h1>
          <p>Monitoreo de consumo Google Places vs OpenStreetMap</p>
        </div>
        <div className="header-actions">
          <span className={`status-badge success`}>
            Google Places Activo
          </span>
          <span className="reset-badge" title="Fecha en que se reinician los créditos gratuitos de Google">
             <FiClock size={12} style={{ marginRight: '6px' }} />
             PRÓXIMO REINICIO: {nextMonthLabel}
          </span>
          <span className="date-badge">
            <span className="period-label">PERIODO ACTUAL:</span>
            <span className="period-value">{currentMonthStr} {currentYear}</span>
          </span>
        </div>
      </header>

      <div className="credit-tracker-box glass-panel">
        <div className="tracker-main-row">
          <div className="tracker-cell">
            <span className="tracker-label">GASTO ACUMULADO</span>
            <span className="tracker-value highlight">${totalCost.toFixed(2)}</span>
          </div>
          
          <div className="tracker-divider"></div>
          
          <div className="tracker-cell">
            <span className="tracker-label">SALDO RESTANTE</span>
            <span className="tracker-value accent">${remainingBudget.toFixed(2)}</span>
          </div>

          <div className="tracker-divider"></div>

          <div className="tracker-cell">
            <span className="tracker-label">TOPE MENSUAL</span>
            <span className="tracker-value muted">${limit}</span>
          </div>

          <div className="tracker-divider"></div>

          <div className="tracker-cell">
            <span className="tracker-label">GASTO EXTRA</span>
            <span className={`tracker-value ${extraSpending > 0 ? 'danger-text' : 'muted'}`}>
              ${extraSpending.toFixed(2)}
            </span>
          </div>

          <div className="tracker-cell right-aligned">
             <div className="progress-mini-ring">
               <div className="progress-bar-bg">
                 <div 
                   className={`progress-bar-fill ${percentage > 85 ? 'danger' : ''}`} 
                   style={{ width: `${percentage}%` }}
                 />
               </div>
               <span className="progress-percent">{percentage.toFixed(0)}% USADO</span>
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
                  <th>TIPO</th>
                  <th className="text-right">COSTO UNIT.</th>
                  <th className="text-right">VOLUMEN</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.stats || []).map((s, idx) => (
                  <tr key={idx} className="hover-row">
                    <td>
                      <div className="sku-info-simple">
                         <span className="sku-primary">
                            {s.sku === 'pro' 
                              ? 'Google Places Pro (B2B Full: Teléfono y Website)' 
                              : 'Google Places Basic (Nombre y Ubicación)'}
                          </span>
                      </div>
                    </td>
                    <td className="text-right">
                       <span className="val-sub-compact">{s.sku === 'pro' ? '$0.032' : '$0.00'}</span>
                    </td>
                    <td className="text-right">
                       <span className="val-main">{s.calls_count}</span>
                    </td>
                  </tr>
                ))}
                 {(!stats?.stats || stats.stats.length === 0) && (
                    <tr><td colSpan="3" className="text-center p-4 text-muted">Sin actividad registrada</td></tr>
                 )}
              </tbody>
            </table>
          </div>

          <div className="pricing-guide mt-4 pt-4 border-t border-white/5">
            <div className="guide-header mb-3">
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">Guía de Referencia de Tiers (Google)</span>
            </div>
            <div className="guide-grid">
              <div className="guide-item">
                <span className="guide-price text-slate-400">$0.017</span>
                <span className="guide-label text-slate-500">Tier Básico:</span>
                <span className="guide-desc text-slate-300">Nombre, Dirección, Ratings y GPS.</span>
              </div>
              <div className="guide-item highlight">
                <span className="guide-price text-blue-400">$0.032</span>
                <span className="guide-label text-blue-500">Tier Avanzado:</span>
                <span className="guide-desc text-slate-300">Teléfono y Website (B2B Full).</span>
              </div>
            </div>
            <p className="guide-note mt-3 text-xs italic text-slate-600">
              * El Tier Básico se incluye sin costo adicional cuando se solicitan campos del Tier Avanzado.
            </p>
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
        .date-badge { 
          background: rgba(255, 255, 255, 0.05); 
          color: #94a3b8; 
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          letter-spacing: 0.05em;
        }
        .period-label { color: #475569; }
        .period-value { color: #cbd5e1; }

        .reset-badge {
          background: rgba(96, 165, 250, 0.05);
          color: #60a5fa;
          border: 1px solid rgba(96, 165, 250, 0.1);
          font-size: 0.65rem;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* --- Credit Tracker Module --- */
        .credit-tracker-box {
          padding: 1.5rem 1.75rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.4)) !important;
        }

        .tracker-main-row {
          display: flex;
          align-items: center;
          gap: 2.5rem;
        }

        .tracker-cell {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .tracker-cell.right-aligned {
          margin-left: auto;
          text-align: right;
        }

        .tracker-label {
          font-size: 0.65rem;
          color: #475569;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .tracker-value {
          font-size: 1.5rem;
          font-weight: 900;
          color: #94a3b8;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .tracker-value.highlight {
          color: #fff;
          font-size: 1.75rem;
        }

        .tracker-value.accent {
          color: #60a5fa;
          filter: drop-shadow(0 0 8px rgba(96, 165, 250, 0.2));
        }

        .tracker-value.muted {
          color: #334155;
        }

        .tracker-value.danger-text {
          color: #ef4444;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.2));
        }

        .tracker-divider {
          width: 1px;
          height: 24px;
          background: rgba(255, 255, 255, 0.05);
        }

        .progress-mini-ring {
           display: flex;
           flex-direction: column;
           gap: 0.4rem;
           width: 120px;
        }

        .progress-bar-bg {
           height: 4px;
           background: rgba(0,0,0,0.3);
           border-radius: 2px;
           overflow: hidden;
        }

        .progress-bar-fill {
           height: 100%;
           background: #3b82f6;
           border-radius: 2px;
           transition: width 0.5s ease;
        }

        .progress-bar-fill.danger { background: #ef4444; }

        .progress-percent {
           font-size: 0.6rem;
           font-weight: 800;
           color: #64748b;
           letter-spacing: 0.05em;
        }

        /* --- SKU Table Compact --- */
        .sku-info-simple {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .sku-primary {
          font-weight: 500;
          color: #cbd5e1;
          font-size: 0.85rem;
        }

        .clean-table th {
          text-align: left;
          padding: 0.6rem 1rem;
          color: #475569;
          font-weight: 700;
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 1px solid rgba(148, 163, 184, 0.05);
        }

        .clean-table td {
          padding: 0.6rem 1rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.02);
          vertical-align: middle;
        }

        .val-main {
          font-weight: 600;
          color: #64748b;
          font-size: 0.8rem;
        }

        .val-sub-compact {
           font-size: 0.75rem;
           color: #475569;
           font-family: 'Space Mono', monospace;
        }

        .section-header h3 {
          font-size: 0.75rem;
          font-weight: 800;
          color: #475569;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        .text-accent { color: #60a5fa; font-weight: 700; opacity: 0.8; }

        /* Error logs specific */
        .status-badge-mini {
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 0.6rem;
          font-weight: 800;
        }
        .status-badge-mini.error {
          background: rgba(239, 68, 68, 0.05);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.15);
        }

        .endpoint-name-compact {
           font-family: 'Space Mono', monospace;
           color: #475569;
           font-size: 0.75rem;
        }

        /* Overall scale reduction */
        .premium-dashboard {
           padding: 1.25rem;
           max-width: 1100px;
           margin: 0 auto;
        }

        .glass-panel {
           padding: 0.75rem 1.25rem;
           border-radius: 10px;
        }

        .dashboard-grid {
           gap: 1.25rem;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            .premium-dashboard { padding: 1rem 0.5rem !important; }
            .tracker-main-row { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
            .tracker-divider { display: none; }
            .tracker-cell.right-aligned { margin-left: 0; width: 100%; }
            .progress-mini-ring { width: 100%; }
            .table-container { width: 100%; overflow-x: auto; }
        }

        .mt-4 { margin-top: 1rem; }
        .pt-4 { padding-top: 1rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mt-3 { margin-top: 0.75rem; }
        .border-t { border-top: 1px solid rgba(255, 255, 255, 0.05); }
        .font-bold { font-weight: 700; }
        .tracking-widest { letter-spacing: 0.1rem; }
        .uppercase { text-transform: uppercase; }

        .dashboard-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; color: #64748b; gap: 1rem; }
        .spinner-ring { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        
        .dashboard-error { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; color: #ef4444; gap: 1rem; text-align: center; }
        
        .pricing-guide {
          background: rgba(255, 255, 255, 0.01);
          border-radius: 0 0 12px 12px;
        }
        .guide-grid {
          display: grid;
          gap: 0.5rem;
        }
        .guide-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.75rem;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        .guide-item.highlight {
          background: rgba(59, 130, 246, 0.05);
          border-color: rgba(59, 130, 246, 0.1);
        }
        .guide-price {
          font-family: 'Monaco', monospace;
          font-weight: 700;
          min-width: 50px;
        }
        .guide-label {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.65rem;
        }
        .guide-desc {
          opacity: 0.8;
        }
        .guide-note {
          line-height: 1.4;
        }

        .text-slate-300 { color: #cbd5e1; }
        .text-slate-400 { color: #94a3b8; }
        .text-slate-500 { color: #64748b; }
        .text-slate-600 { color: #475569; }
        .text-blue-400 { color: #60a5fa; }
        .text-blue-500 { color: #3b82f6; }
        .text-xs { font-size: 0.7rem; }
        .italic { font-style: italic; }
      `}</style>
    </div>
  );
}

export default ApiUsageDashboard;

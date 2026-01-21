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
  FiShield
} from 'react-icons/fi';
import './AdminDashboard.css';

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
          <h1>
            <FiActivity className="header-icon" /> 
            Panel de Control API
          </h1>
          <p>Monitoreo en tiempo real de consumo y costos de Google Places</p>
        </div>
        <div className="header-badges">
          <span className={`badge ${isFallback ? 'warning' : 'success'}`}>
            {isFallback ? <FiAlertTriangle /> : <FiCheckCircle />}
            {isFallback ? 'Modo Ahorro Activo' : 'Sistema Operativo'}
          </span>
          <span className="badge info">
            <FiClock /> {stats?.month || new Date().toISOString().slice(0, 7)}
          </span>
        </div>
      </header>

      <div className="stats-grid">
        {/* Card: Presupuesto Principal */}
        <div className="stat-card main-card">
          <div className="card-header">
            <h3><FiDollarSign /> Presupuesto Mensual</h3>
            <span className="card-tag">Free Tier Limit</span>
          </div>
          <div className="budget-display">
            <div className="budget-values">
              <span className="current-spend">${totalCost.toFixed(2)}</span>
              <span className="total-budget">/ ${limit.toFixed(2)}</span>
            </div>
            <div className="progress-track">
              <div 
                className={`progress-fill ${percentage > 90 ? 'critical' : percentage > 70 ? 'warning' : ''}`}
                style={{ width: `${percentage}%` }}
              >
                <div className="progress-glow"></div>
              </div>
            </div>
            <div className="budget-meta">
              <span>Restante: <strong>${remainingBudget.toFixed(2)}</strong></span>
              <span>Uso: <strong>{percentage.toFixed(1)}%</strong></span>
            </div>
          </div>
        </div>

        {/* Card: Estado del Proveedor */}
        <div className={`stat-card provider-card ${isFallback ? 'fallback' : 'google'}`}>
          <div className="card-header">
            <h3><FiDatabase /> Proveedor de Datos</h3>
          </div>
          <div className="provider-content">
            <div className="provider-icon-wrapper">
              {isFallback ? <FiShield size={32} /> : <FiServer size={32} />}
            </div>
            <div className="provider-details">
              <h4>{isFallback ? 'OpenStreetMap (OSM)' : 'Google Places API (New)'}</h4>
              <p>
                {isFallback 
                  ? 'Fallback activado por límite de presupuesto o error de API.' 
                  : 'Datos premium verificados. Alta precisión en 75M+ empresas.'}
              </p>
            </div>
          </div>
        </div>

        {/* Card: Resumen Rápido */}
        <div className="stat-card summary-card">
          <div className="card-header">
            <h3><FiTrendingUp /> Rendimiento</h3>
          </div>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">Llamadas Totales</span>
              <span className="value">{(stats?.stats || []).reduce((acc, curr) => acc + curr.calls_count, 0)}</span>
            </div>
            <div className="summary-item">
              <span className="label">SKUs Activos</span>
              <span className="value">{(stats?.stats || []).length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="table-section">
        <div className="section-header">
          <h3>Detalle de Consumo por SKU</h3>
        </div>
        <div className="table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Servicio / SKU</th>
                <th>Volumen</th>
                <th>Costo Total</th>
                <th>Última Actividad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.stats || []).map((s, idx) => (
                <tr key={idx}>
                  <td className="sku-cell">
                    <span className="sku-icon"><FiCheckCircle /></span>
                    {s.sku.toUpperCase()}
                  </td>
                  <td className="volume-cell">{s.calls_count} req</td>
                  <td className="cost-cell">${parseFloat(s.estimated_cost_usd).toFixed(4)}</td>
                  <td className="date-cell">{new Date(s.last_update).toLocaleDateString()} {new Date(s.last_update).toLocaleTimeString()}</td>
                  <td>
                    <span className="status-pill active">Activo</span>
                  </td>
                </tr>
              ))}
              {(!stats?.stats || stats.stats.length === 0) && (
                <tr>
                  <td colSpan="5" className="empty-state">
                    <div className="empty-content">
                      <FiDatabase size={24} />
                      <p>No hay actividad registrada este mes</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        /* Variables y Reset */
        .premium-dashboard {
          padding: 2rem;
          background: #0f172a; /* Fondo base oscuro */
          color: #e2e8f0;
          font-family: 'Inter', system-ui, sans-serif;
          min-height: 100%;
        }

        /* Header Styles */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 1.5rem;
        }

        .header-content h1 {
          font-size: 1.8rem;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0 0 0.5rem 0;
        }

        .header-content p {
          color: #94a3b8;
          font-size: 0.95rem;
          margin: 0;
        }

        .header-icon { color: #3b82f6; }

        .header-badges {
          display: flex;
          gap: 1rem;
        }

        .badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 600;
          backdrop-filter: blur(8px);
        }

        .badge.success {
          background: rgba(34, 197, 94, 0.1);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .badge.warning {
          background: rgba(234, 179, 8, 0.1);
          color: #facc15;
          border: 1px solid rgba(234, 179, 8, 0.2);
        }

        .badge.info {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(12px);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.3);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .card-tag {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          color: #94a3b8;
        }

        /* Budget Card Specifics */
        .budget-values {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .current-spend {
          font-size: 2.5rem;
          font-weight: 700;
          color: #fff;
        }

        .total-budget {
          font-size: 1.25rem;
          color: #64748b;
        }

        .progress-track {
          height: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #06b6d4);
          border-radius: 6px;
          position: relative;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .progress-glow {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 20px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shimmer 2s infinite;
        }

        .budget-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: #94a3b8;
        }

        .budget-meta strong { color: #e2e8f0; }

        /* Provider Card */
        .provider-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .provider-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .provider-card.google .provider-icon-wrapper { color: #4ade80; background: rgba(34, 197, 94, 0.1); }
        .provider-card.fallback .provider-icon-wrapper { color: #facc15; background: rgba(234, 179, 8, 0.1); }

        .provider-details h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          color: #fff;
        }

        .provider-details p {
          margin: 0;
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        /* Summary Grid */
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .summary-item {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .summary-item .label {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }

        .summary-item .value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        /* Table Section */
        .table-section {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(12px);
        }

        .section-header { margin-bottom: 1.5rem; }
        .section-header h3 { margin: 0; color: #fff; font-size: 1.2rem; }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .modern-table {
          width: 100%;
          border-collapse: collapse;
          color: #cbd5e1;
        }

        .modern-table th {
          text-align: left;
          padding: 1rem;
          background: rgba(15, 23, 42, 0.6);
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .modern-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .modern-table tr:last-child td { border-bottom: none; }
        .modern-table tr:hover td { background: rgba(255, 255, 255, 0.02); }

        .sku-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          color: #fff;
        }

        .sku-icon { color: #3b82f6; opacity: 0.8; }
        .cost-cell { font-family: 'Space Mono', monospace; color: #4ade80; }
        .volume-cell { font-family: 'Space Mono', monospace; }
        
        .status-pill {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-pill.active {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
        }

        /* Loading & Error States */
        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: #94a3b8;
        }

        .spinner-ring {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .dashboard-error {
          text-align: center;
          padding: 4rem;
          color: #ef4444;
        }

        .retry-btn {
          margin-top: 1rem;
          padding: 0.5rem 1.5rem;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .retry-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        /* Empty State */
        .empty-content {
          text-align: center;
          padding: 2rem;
          color: #64748b;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}

export default ApiUsageDashboard;

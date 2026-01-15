import React, { useState, useEffect } from 'react';
import './AdminApiDashboard.css';

const AdminApiDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // 10s poll
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/quota`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (error) {
      console.error('Error fetching quota:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = async () => {
    if (!stats) return;
    setToggling(true);
    try {
      const token = localStorage.getItem('adminToken');
      const newMode = !stats.forced_osm;
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/quota/mode`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ force_osm: newMode })
      });
      
      if (response.ok) {
        await fetchStats();
      }
    } catch (error) {
      alert('Error changing mode');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div className="api-dashboard-loading">Cargando métricas...</div>;
  if (!stats) return null;

  const percentUsed = (stats.used / stats.limit) * 100;
  const isGoogle = !stats.forced_osm && stats.used < stats.limit;

  return (
    <div className="api-dashboard-card">
      <div className="api-dashboard-header">
        <h3>Google Places Quota</h3>
        <div className={`status-badge ${isGoogle ? 'google' : 'osm'}`}>
          {isGoogle ? '🟢 Google Mode' : '🟠 OSM Mode (Free)'}
        </div>
      </div>

      <div className="quota-visual">
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${Math.min(percentUsed, 100)}%`, backgroundColor: percentUsed > 90 ? '#ff4d4d' : '#10b981' }}
          ></div>
        </div>
        <div className="quota-text">
          <span>Gastado: <strong>${stats.used.toFixed(4)}</strong></span>
          <span>Límite: <strong>${stats.limit.toFixed(2)}</strong></span>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-item">
            <span className="stat-label">Requests API</span>
            <span className="stat-value">{stats.requests}</span>
        </div>
        <div className="stat-item">
            <span className="stat-label">Costo Promedio</span>
            <span className="stat-value">${(stats.used / (stats.requests || 1)).toFixed(4)}</span>
        </div>
      </div>

      <div className="dashboard-actions">
        <button 
          onClick={toggleMode} 
          disabled={toggling}
          className={`toggle-btn ${stats.forced_osm ? 'btn-enable' : 'btn-disable'}`}
        >
          {stats.forced_osm ? '⚡ Reactivar Google' : '🛡️ Forzar Modo Ahorro (OSM)'}
        </button>
      </div>
    </div>
  );
};

export default AdminApiDashboard;

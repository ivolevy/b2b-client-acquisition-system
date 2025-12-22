import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../lib/supabase';
import './AdminDashboard.css';
import './AdminLayout.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [usersByMonth, setUsersByMonth] = useState([]);
  const [searchesByDay, setSearchesByDay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Cargar métricas principales
      const { data: metricsData, error: metricsError } = await adminService.getMetrics();
      if (metricsError) throw metricsError;
      setMetrics(metricsData);

      // Cargar gráfico de usuarios por mes
      const { data: usersData, error: usersError } = await adminService.getUsersByMonth(12);
      if (usersError) throw usersError;
      setUsersByMonth(usersData || []);

      // Cargar gráfico de búsquedas por día
      const { data: searchesData, error: searchesError } = await adminService.getSearchesByDay(30);
      if (searchesError) throw searchesError;
      setSearchesByDay(searchesData || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={loadDashboardData}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <div className="admin-nav">
          <button 
            className="admin-nav-btn active"
            onClick={() => navigate('/backoffice')}
          >
            Dashboard
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/backoffice/users')}
          >
            Usuarios
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/backoffice/promo-codes')}
          >
            Códigos Promocionales
          </button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>Total Usuarios</h3>
            <p className="metric-value">{metrics?.total_users || 0}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⭐</div>
          <div className="metric-content">
            <h3>Usuarios PRO</h3>
            <p className="metric-value">{metrics?.pro_users || 0}</p>
            <p className="metric-subtitle">{metrics?.free_users || 0} usuarios Free</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>Nuevos (30 días)</h3>
            <p className="metric-value">{metrics?.new_users_last_30_days || 0}</p>
            <p className="metric-subtitle">{metrics?.new_users_last_7_days || 0} últimos 7 días</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🔍</div>
          <div className="metric-content">
            <h3>Búsquedas Totales</h3>
            <p className="metric-value">{metrics?.total_searches || 0}</p>
            <p className="metric-subtitle">{metrics?.searches_last_30_days || 0} últimos 30 días</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💎</div>
          <div className="metric-content">
            <h3>Suscripciones Activas</h3>
            <p className="metric-value">{metrics?.active_subscriptions || 0}</p>
            <p className="metric-subtitle">{metrics?.expiring_soon || 0} expiran pronto</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🎫</div>
          <div className="metric-content">
            <h3>Códigos Activos</h3>
            <p className="metric-value">{metrics?.active_promo_codes || 0}</p>
            <p className="metric-subtitle">{metrics?.total_promo_code_uses || 0} usos totales</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        <div className="chart-card">
          <h2>Crecimiento de Usuarios (12 meses)</h2>
          <div className="chart-container">
            {usersByMonth.length > 0 ? (
              <div className="bar-chart">
                {usersByMonth.map((item, index) => {
                  const maxValue = Math.max(...usersByMonth.map(i => i.count));
                  const height = (item.count / maxValue) * 100;
                  return (
                    <div key={index} className="bar-item">
                      <div 
                        className="bar" 
                        style={{ height: `${height}%` }}
                        title={`${item.count} usuarios`}
                      >
                        <span className="bar-value">{item.count}</span>
                      </div>
                      <span className="bar-label">
                        {new Date(item.month).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-data">No hay datos disponibles</p>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h2>Actividad de Búsquedas (30 días)</h2>
          <div className="chart-container">
            {searchesByDay.length > 0 ? (
              <div className="line-chart">
                {searchesByDay.map((item, index) => {
                  const maxValue = Math.max(...searchesByDay.map(i => i.count));
                  const height = (item.count / maxValue) * 100;
                  return (
                    <div key={index} className="line-item">
                      <div 
                        className="line-point" 
                        style={{ bottom: `${height}%` }}
                        title={`${item.count} búsquedas`}
                      >
                        <span className="point-value">{item.count}</span>
                      </div>
                      <span className="line-label">
                        {new Date(item.day).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-data">No hay datos disponibles</p>
            )}
          </div>
        </div>
      </div>

      {/* Distribución de planes */}
      <div className="distribution-card">
        <h2>Distribución de Planes</h2>
        <div className="distribution-content">
          <div className="distribution-item">
            <div className="distribution-bar">
              <div 
                className="distribution-fill free"
                style={{ 
                  width: `${metrics?.total_users > 0 ? (metrics.free_users / metrics.total_users) * 100 : 0}%` 
                }}
              ></div>
            </div>
            <div className="distribution-info">
              <span className="distribution-label">Free</span>
              <span className="distribution-value">{metrics?.free_users || 0}</span>
            </div>
          </div>
          <div className="distribution-item">
            <div className="distribution-bar">
              <div 
                className="distribution-fill pro"
                style={{ 
                  width: `${metrics?.total_users > 0 ? (metrics.pro_users / metrics.total_users) * 100 : 0}%` 
                }}
              ></div>
            </div>
            <div className="distribution-info">
              <span className="distribution-label">PRO</span>
              <span className="distribution-value">{metrics?.pro_users || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;


import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, Card, CardContent, 
  Avatar, Chip, Divider, Stack, CircularProgress, 
  Tooltip, useTheme
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart as BarChartIcon,
  Timeline as TimelineIcon,
  Radar as RadarIcon,
  TrendingUp as TrendingUpIcon,
  FlashOn as FlashIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Schedule as ScheduleIcon,
  AutoAwesome as SparklesIcon,
  ArrowForwardIos as ArrowIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import './Insights.css';

const InsightsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [user?.id]);

  const fetchStats = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/communications/stats`, {
        headers: {
          'X-User-ID': user.id
        }
      });
      setData(response.data);
    } catch (err) {
      console.error('Error fetching insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
        <CircularProgress size={30} sx={{ color: 'var(--primary)' }} />
      </Box>
    );
  }

  const kpis = [
    { label: 'Conversión', value: `${data?.kpis?.conversion_rate || 0}%`, icon: <TrendingUpIcon />, color: 'var(--success)', bg: '#f0fdf4' },
    { label: 'Leads Calientes', value: data?.kpis?.hot_leads || 0, icon: <FlashIcon />, color: 'var(--warning)', bg: '#fffbeb' },
    { label: 'Total Leads', value: data?.kpis?.total_leads || 0, icon: <BarChartIcon />, color: 'var(--primary)', bg: 'var(--primary-light)' },
  ];

  const funnelStages = [
    { id: 'open', label: 'Nuevos', count: data?.funnel?.open || 0, color: 'var(--gray-400)' },
    { id: 'waiting_reply', label: 'Seguimiento', count: data?.funnel?.waiting_reply || 0, color: 'var(--warning)' },
    { id: 'interested', label: 'Interesados', count: data?.funnel?.interested || 0, color: 'var(--primary)' },
    { id: 'converted', label: 'Éxitos', count: data?.funnel?.converted || 0, color: 'var(--success)' },
  ];

  const maxCount = Math.max(...funnelStages.map(s => s.count), 1);

  return (
    <div id="insights-root">
      <header className="insights-header">
        <div className="header-info">
          <h2>
            <TimelineIcon /> Insights
          </h2>
          <p>Tu torre de control para la captación de clientes.</p>
        </div>
        <div className="header-actions">
          <Chip 
            icon={<SparklesIcon sx={{ fontSize: '0.9rem !important' }} />} 
            label="Impulsado por IA" 
            sx={{ bgcolor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, borderRadius: '8px', height: '28px', fontSize: '0.75rem' }} 
          />
        </div>
      </header>

      {/* KPI Cards */}
      <Grid container spacing={3} className="kpi-grid">
        {kpis.map((kpi, idx) => (
          <Grid item xs={12} md={4} key={idx}>
            <div className="premium-kpi-card">
              <div className="kpi-header">
                <div className="kpi-icon-wrapper" style={{ backgroundColor: kpi.bg, color: kpi.color }}>
                  {React.cloneElement(kpi.icon, { sx: { fontSize: '2rem' } })}
                </div>
              </div>
              <div>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value">{kpi.value}</div>
              </div>
            </div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        {/* Funnel Section */}
        <Grid item xs={12} lg={7}>
          <div className="section-card">
            <h3 className="section-title">
              <TimelineIcon sx={{ color: 'var(--primary)' }} /> Embudo de Conversión
            </h3>
            
            <div className="funnel-container">
              {funnelStages.map((stage) => (
                <div key={stage.id} className="funnel-step">
                  <div className="funnel-step-header">
                    <div className="funnel-label">{stage.label}</div>
                    <div className="funnel-count">{stage.count} leads</div>
                  </div>
                  <div className="funnel-bar-bg">
                    <div className="funnel-bar-fill" style={{ 
                      width: `${(stage.count / maxCount) * 100}%`,
                      backgroundColor: stage.color 
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Grid>

        {/* Radar: Forgotten Leads */}
        <Grid item xs={12} lg={5}>
          <div className="section-card">
            <h3 className="section-title">
              <RadarIcon sx={{ color: '#ef4444' }} /> Radar de Atención
            </h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              Leads interesados sin respuesta hace más de 3 días. ¡No los pierdas!
            </p>

            <div className="radar-list">
              {data?.radar?.length > 0 ? data.radar.map((lead) => (
                <div key={lead.id} className="radar-item">
                  <Avatar sx={{ bgcolor: 'var(--gray-200)', color: 'var(--primary)', width: 32, height: 32, fontSize: '0.85rem' }}>
                    {lead.lead_name?.charAt(0) || 'L'}
                  </Avatar>
                  <div className="radar-item-info">
                    <span className="radar-item-name">{lead.lead_name}</span>
                    <span className="radar-item-sub">
                      Sin respuesta hace {Math.floor((new Date() - new Date(lead.last_message_at)) / (1000 * 60 * 60 * 24))} días
                    </span>
                  </div>
                  <span className="urgent-badge">Urgente</span>
                </div>
              )) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-placeholder)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  ¡Todo al día! No hay leads olvidados.
                </div>
              )}
            </div>
          </div>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <div className="section-card">
            <h3 className="section-title">
              <FlashIcon sx={{ color: '#8b5cf6' }} /> Actividad Reciente
            </h3>

            <div className="activity-feed">
              {data?.activity?.map((msg) => (
                <div key={msg.id} className="activity-item">
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <Avatar sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: msg.direction === 'inbound' ? 'var(--primary-light)' : 'var(--gray-100)',
                      color: msg.direction === 'inbound' ? 'var(--primary)' : 'var(--text-tertiary)'
                    }}>
                      {msg.channel === 'whatsapp' ? <WhatsAppIcon fontSize="small" /> : <EmailIcon fontSize="small" />}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="activity-user">
                          {msg.direction === 'inbound' ? (msg.email_conversations?.lead_name || "Lead") : 'Tú'}
                        </span>
                        <span className="activity-time">
                          {new Date(msg.sent_at).toLocaleDateString()} {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="activity-msg">
                        {msg.snippet || "Sin vista previa"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Grid>
      </Grid>
    </div>
  );
};

export default InsightsDashboard;

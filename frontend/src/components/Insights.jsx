import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, Card, CardContent, 
  Avatar, Chip, Divider, Stack, CircularProgress, 
  Tooltip, useTheme
} from '@mui/material';
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

const InsightsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/communications/stats`);
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
        <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
      </Box>
    );
  }

  const kpis = [
    { label: 'Conversión', value: `${data?.kpis?.conversion_rate || 0}%`, icon: <TrendingUpIcon />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Leads Calientes', value: data?.kpis?.hot_leads || 0, icon: <FlashIcon />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Total Leads', value: data?.kpis?.total_leads || 0, icon: <BarChartIcon />, color: '#3b82f6', bg: '#d1fae5' },
  ];

  const funnelStages = [
    { id: 'open', label: 'Nuevos', count: data?.funnel?.open || 0, color: '#94a3b8' },
    { id: 'waiting_reply', label: 'Seguimiento', count: data?.funnel?.waiting_reply || 0, color: '#f59e0b' },
    { id: 'interested', label: 'Interesados', count: data?.funnel?.interested || 0, color: '#3b82f6' },
    { id: 'converted', label: 'Éxitos', count: data?.funnel?.converted || 0, color: '#10b981' },
  ];

  const maxCount = Math.max(...funnelStages.map(s => s.count), 1);

  return (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto', bgcolor: '#f8fafc' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            Insights
          </Typography>
          <Typography sx={{ color: '#64748b' }}>
            Tu torre de control para la captación de clientes.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip 
            label="PRÓXIMAMENTE" 
            sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 800, fontSize: '10px', height: '24px' }} 
          />
          <Chip 
            icon={<SparklesIcon sx={{ fontSize: '1rem !important' }} />} 
            label="Impulsado por IA" 
            sx={{ bgcolor: '#e0f2fe', color: '#3b82f6', fontWeight: 700, borderRadius: '8px' }} 
          />
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {kpis.map((kpi, idx) => (
          <Grid item xs={12} md={4} key={idx}>
            <Card sx={{ 
              borderRadius: '24px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.05)',
              overflow: 'visible',
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'translateY(-5px)' }
            }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: '16px', 
                  bgcolor: kpi.bg, 
                  color: kpi.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {React.cloneElement(kpi.icon, { sx: { fontSize: '2rem' } })}
                </Box>
                <Box>
                  <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>{kpi.label}</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>{kpi.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        {/* Funnel Section */}
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 4, borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', height: '100%' }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TimelineIcon sx={{ color: '#3b82f6' }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Embudo de Conversión</Typography>
            </Box>
            
            <Stack spacing={3}>
              {funnelStages.map((stage) => (
                <Box key={stage.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>{stage.label}</Typography>
                    <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>{stage.count} leads</Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: '12px', bgcolor: '#f1f5f9', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                    <Box sx={{ 
                      width: `${(stage.count / maxCount) * 100}%`, 
                      height: '100%', 
                      bgcolor: stage.color, 
                      borderRadius: '6px',
                      transition: 'width 1s ease-in-out'
                    }} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Radar: Forgotten Leads */}
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 4, borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', height: '100%' }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <RadarIcon sx={{ color: '#ef4444' }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Radar de Atención</Typography>
            </Box>
            <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mb: 3 }}>
              Leads interesados sin respuesta hace más de 3 días. ¡No los pierdas!
            </Typography>

            <Stack spacing={2}>
              {data?.radar?.length > 0 ? data.radar.map((lead) => (
                <Box key={lead.id} sx={{ 
                  p: 2, 
                  bgcolor: '#fff', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  '&:hover': { bgcolor: '#f8fafc' }
                }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{lead.lead_name}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>Último: {new Date(lead.last_message_at).toLocaleDateString()}</Typography>
                  </Box>
                  <ArrowIcon sx={{ fontSize: '0.8rem', color: '#cbd5e1' }} />
                </Box>
              )) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography sx={{ color: '#94a3b8', fontStyle: 'italic' }}>¡Todo al día!</Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 4, borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TimelineIcon sx={{ color: '#8b5cf6' }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Actividad Reciente</Typography>
            </Box>

            <Stack spacing={0}>
              {data?.activity?.map((msg, idx) => (
                <Box key={msg.id} sx={{ 
                  py: 2, 
                  display: 'flex', 
                  gap: 3, 
                  alignItems: 'flex-start',
                  position: 'relative',
                  '&:not(:last-child):after': {
                    content: '""',
                    position: 'absolute',
                    left: '20px',
                    top: '40px',
                    bottom: '-10px',
                    width: '2px',
                    bgcolor: '#f1f5f9',
                    zIndex: 0
                  }
                }}>
                  <Avatar sx={{ 
                    width: 40, 
                    height: 40, 
                    bgcolor: msg.direction === 'inbound' ? '#e0f2fe' : '#f1f5f9',
                    color: msg.direction === 'inbound' ? '#3b82f6' : '#64748b',
                    zIndex: 1
                  }}>
                    {msg.channel === 'whatsapp' ? <WhatsAppIcon fontSize="small" /> : <EmailIcon fontSize="small" />}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>
                        {msg.direction === 'inbound' ? msg.email_conversations?.lead_name : 'Tú'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {msg.snippet || "Sin vista previa"}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InsightsDashboard;

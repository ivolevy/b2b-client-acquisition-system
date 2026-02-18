import React from 'react';
import { 
  Box, Typography, Avatar, IconButton, Divider, 
  Button, Stack, Chip, Paper, CircularProgress
} from '@mui/material';
import { 
  Close as CloseIcon,
  WhatsApp as WhatsAppIcon,
  Send as SendIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  AutoAwesome as SparklesIcon,
  Flag as FlagIcon
} from '@mui/icons-material';

const LeadDetailsPanel = ({ lead, onClose, onAction }) => {
  if (!lead) return null;

  return (
    <Box sx={{ 
      width: '400px', 
      height: '100%', 
      bgcolor: '#ffffff', 
      borderLeft: '1px solid rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.02)',
      animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Header */}
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Avatar sx={{ 
            width: 56, 
            height: 56, 
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            fontSize: '1.2rem',
            fontWeight: 800
          }}>
            {lead.lead_name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {lead.lead_name}
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: '0.8rem' }}>
              {lead.lead_email}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ opacity: 0.5 }} />

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
        {/* AI Insight Section */}
        <Paper sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: 'rgba(59, 130, 246, 0.03)', 
          border: '1px solid rgba(59, 130, 246, 0.1)',
          borderRadius: '16px'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SparklesIcon sx={{ fontSize: '1rem', color: '#3b82f6' }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resumen de IA
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, fontStyle: 'italic' }}>
            {lead.ai_summary || "El lead parece estar interesado en servicios de captación B2B. Solicitó más información sobre los costos iniciales."}
          </Typography>
        </Paper>

        {/* Details List */}
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', mb: 2 }}>
          Información del Lead
        </Typography>
        <Stack spacing={2} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: '8px' }}>
              <FlagIcon sx={{ fontSize: '1rem', color: '#64748b' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>Estado Actual</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {lead.status === 'interested' ? 'Interesado' : lead.status === 'not_interested' ? 'Poco Interés' : lead.status === 'converted' ? '¡Éxito!' : 'Abierto'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: '8px' }}>
              <EmailIcon sx={{ fontSize: '1rem', color: '#64748b' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>Canal Principal</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{lead.channel?.toUpperCase() || 'EMAIL'}</Typography>
            </Box>
          </Box>
        </Stack>

        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', mb: 2 }}>
          Acciones Rápidas
        </Typography>
        <Stack spacing={1.5}>
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<WhatsAppIcon />}
            onClick={() => onAction('whatsapp', lead)}
            sx={{ 
              bgcolor: '#25D366', 
              '&:hover': { bgcolor: '#128C7E' },
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              py: 1.2
            }}
          >
            Enviar WhatsApp
          </Button>
          <Button 
            fullWidth 
            variant="outlined" 
            startIcon={<SendIcon />}
            onClick={() => onAction('proposal', lead)}
            sx={{ 
              borderColor: '#3b82f6', 
              color: '#3b82f6',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              py: 1.2
            }}
          >
            Enviar Propuesta
          </Button>
        </Stack>
      </Box>

      {/* Footer / Meta */}
      <Box sx={{ p: 3, bgcolor: '#f8fafc', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>
          Última actividad: {new Date(lead.last_message_at).toLocaleString()}
        </Typography>
      </Box>

      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

export default LeadDetailsPanel;

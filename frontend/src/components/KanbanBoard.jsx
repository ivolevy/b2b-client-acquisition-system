import React from 'react';
import { 
  Box, Typography, Paper, Grid, Card, CardContent, 
  Avatar, Chip, IconButton, Tooltip, Stack 
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Email as EmailIcon
} from '@mui/icons-material';

const KanbanBoard = ({ conversations, onSelectConversation }) => {
  const columns = [
    { id: 'open', title: 'Nuevos Leads', color: '#94a3b8' },
    { id: 'waiting_reply', title: 'Esperando Respuesta', color: '#f59e0b' },
    { id: 'replied', title: 'Respondido', color: '#10b981' },
    { id: 'interested', title: 'Interesado', color: '#3b82f6' },
    { id: 'not_interested', title: 'No Interesado', color: '#ef4444' },
  ];

  const getStatusLabel = (status) => {
    const col = columns.find(c => c.id === status);
    return col ? col.title : 'Otro';
  };

  const renderCard = (conv) => (
    <Card 
      key={conv.id}
      onClick={() => onSelectConversation(conv)}
      sx={{ 
        mb: 2, 
        bgcolor: '#ffffff', 
        border: '1px solid rgba(0, 0, 0, 0.12)',
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        '&:hover': {
          transform: 'translateY(-4px)',
          bgcolor: '#ffffff',
          borderColor: '#3b82f6',
          boxShadow: '0 16px 32px rgba(0,0,0,0.12)'
        }
      }}
    >
      <CardContent sx={{ p: '16px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Avatar sx={{ 
            width: 32, 
            height: 32, 
            fontSize: '0.8rem', 
            bgcolor: 'rgba(59, 130, 246, 0.2)', 
            color: '#3b82f6',
            fontWeight: 800
          }}>
            {conv.lead_name?.charAt(0).toUpperCase()}
          </Avatar>
          <IconButton size="small" sx={{ color: 'rgba(0,0,0,0.2)' }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
        
        <Typography sx={{ color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', mb: 0.5 }}>
          {conv.lead_name}
        </Typography>
        
        <Typography sx={{ 
          color: '#64748b', 
          fontSize: '0.75rem', 
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5
        }}>
          <EmailIcon sx={{ fontSize: '0.8rem' }} />
          {conv.subject}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <ScheduleIcon sx={{ fontSize: '0.7rem', color: '#94a3b8' }} />
            <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
              {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Typography>
          </Stack>
          
          {conv.unread_count > 0 && (
            <Chip 
              label={conv.unread_count} 
              size="small" 
              sx={{ 
                height: 18, 
                fontSize: '0.65rem', 
                bgcolor: '#3b82f6', 
                color: '#fff',
                fontWeight: 800
              }} 
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3, height: '100%', overflowX: 'auto' }}>
      <Grid container spacing={3} sx={{ minWidth: '1250px', height: '100%' }}>
        {columns.map(column => (
          <Grid item sx={{ width: '250px', height: '100%', display: 'flex', flexDirection: 'column' }} key={column.id}>
            <Box sx={{ 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              px: 1
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ color: '#0f172a', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  {column.title}
                </Typography>
                <Chip 
                  label={conversations.filter(c => c.status === column.id).length} 
                  size="small"
                  sx={{ 
                    height: 20, 
                    bgcolor: '#f1f5f9', 
                    color: '#64748b',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}
                />
              </Box>
              <Box sx={{ width: '100%', height: '2px', bgcolor: column.color, opacity: 0.3, ml: 2, borderRadius: 1 }} />
            </Box>
            
            <Box sx={{ 
              flexGrow: 1, 
              bgcolor: '#f1f5f9', 
              borderRadius: '20px', 
              p: 1.5,
              overflowY: 'auto',
              border: '1px solid rgba(0, 0, 0, 0.08)'
            }}>
              {conversations
                .filter(c => c.status === column.id || (column.id === 'open' && !c.status))
                .map(renderCard)}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default KanbanBoard;

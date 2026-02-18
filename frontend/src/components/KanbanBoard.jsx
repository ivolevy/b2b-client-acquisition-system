import React from 'react';
import { 
  Box, Typography, Paper, Grid, Card, CardContent, 
  Avatar, Chip, IconButton, Tooltip, Stack 
} from '@mui/material';
import { 
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  DeleteOutline as DeleteIcon
} from '@mui/icons-material';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import LeadDetailsPanel from './LeadDetailsPanel';

const KanbanBoard = ({ conversations, onSelectConversation, onDeleteConversation }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [activeConv, setActiveConv] = React.useState(null);
  const [selectedLead, setSelectedLead] = React.useState(null);

  const handleCardClick = (conv) => {
    setSelectedLead(conv);
    onSelectConversation(conv); // Still notify parent
  };

  const handleOpenMenu = (e, conv) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setActiveConv(conv);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActiveConv(null);
  };

  const handleDelete = () => {
    if (activeConv && window.confirm(`¿Estás seguro de que quieres eliminar a ${activeConv.lead_name}?`)) {
        onDeleteConversation(activeConv.id);
    }
    handleCloseMenu();
  };
  const columns = [
    { id: 'open', title: 'Nuevos Leads', color: '#94a3b8' },
    { id: 'waiting_reply', title: 'Seguimiento', color: '#f59e0b' },
    { id: 'interested', title: 'Interesado', color: '#3b82f6' },
    { id: 'not_interested', title: 'Poco Interés', color: '#64748b' },
    { id: 'converted', title: '¡Éxito!', color: '#10b981' },
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
        bgcolor: conv.status === 'interested' ? '#e0f2fe' : conv.status === 'not_interested' ? '#f8fafc' : conv.status === 'converted' ? '#d1fae5' : '#ffffff', 
        border: '1px solid',
        borderColor: conv.status === 'interested' ? 'rgba(59, 130, 246, 0.3)' : conv.status === 'not_interested' ? 'rgba(148, 163, 184, 0.2)' : conv.status === 'converted' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0, 0, 0, 0.12)',
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        '&:hover': {
          transform: 'translateY(-4px)',
          bgcolor: conv.status === 'interested' ? '#bae6fd' : conv.status === 'not_interested' ? '#f1f5f9' : conv.status === 'converted' ? '#a7f3d0' : '#ffffff',
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
          <IconButton 
            size="small" 
            sx={{ color: 'rgba(0,0,0,0.2)' }}
            onClick={(e) => handleOpenMenu(e, conv)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
        
        <Typography sx={{ color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', mb: 0.5 }}>
          {conv.lead_name}
        </Typography>
        

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <ScheduleIcon sx={{ fontSize: '0.7rem', color: '#94a3b8' }} />
            <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
              {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </Typography>
          </Stack>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {conv.status === 'not_interested' && (
              (() => {
                const days = Math.floor((new Date() - new Date(conv.last_message_at)) / (24 * 60 * 60 * 1000));
                if (days >= 7) {
                  return (
                    <Tooltip title={`Lead inactivo por ${days} días. Se eliminará pronto.`}>
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        bgcolor: days >= 14 ? '#ef4444' : '#f59e0b', 
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                      }} />
                    </Tooltip>
                  );
                }
                return null;
              })()
            )}
            
            {conv.unread_count > 0 && (
              <Chip 
                label={conv.unread_count} 
                size="small" 
                sx={{ 
                  height: 18, 
                  fontSize: '0.65rem', 
                  bgcolor: '#3b82f6', 
                  color: '#fff',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                }}
              />
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Box sx={{
        flexGrow: 1,
        p: 3,
        height: '100%',
        overflowX: 'auto',
        transition: 'all 0.3s ease'
      }}>
        <Grid container spacing={3} sx={{ minWidth: selectedLead ? '1000px' : '1250px', height: '100%' }}>
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

      {selectedLead && (
        <LeadDetailsPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onAction={(type, lead) => {
            console.log(`Action ${type} for ${lead.lead_name}`);
            // Here we could open a specific dialog or trigger an automated message
          }}
        />
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: { 
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid rgba(0,0,0,0.05)'
          }
        }}
      >
        <MenuItem onClick={handleDelete} sx={{ color: '#ef4444' }}>
          <ListItemIcon>
            <DeleteIcon sx={{ color: '#ef4444', fontSize: '1.1rem' }} />
          </ListItemIcon>
          <ListItemText primary="Eliminar Lead" />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default KanbanBoard;

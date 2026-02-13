import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Paper, List, ListItem, ListItemText, 
  Divider, Avatar, TextField, Button, IconButton, Chip,
  InputBase, Tooltip, Zoom, Fade, ToggleButton, ToggleButtonGroup,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Menu, MenuItem, ListItemIcon, Drawer
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  Send as SendIcon, 
  AttachFile as AttachFileIcon,
  Search as SearchIcon,
  Circle as CircleIcon,
  MoreVert as MoreVertIcon,
  KeyboardArrowLeft as BackIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  MoreHoriz as MoreHorizIcon,
  Close as CloseIcon,
  Flag as FlagIcon,
  Cancel as CancelIcon,
  Stars as StarsIcon,
  HourglassEmpty as WaitIcon,
  PersonAdd as NewLeadIcon,
  SmartToy as AiIcon,
  AutoAwesome as SparklesIcon
} from '@mui/icons-material';
import ListIcon from '@mui/icons-material/ListAlt';
import KanbanIcon from '@mui/icons-material/Dashboard';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from './KanbanBoard';

const Communications = ({ onOpenAi }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [channelFilter, setChannelFilter] = useState('all'); // 'all', 'email', 'whatsapp'
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [threadSummary, setThreadSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const messagesEndRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/communications/inbox?channel=${channelFilter}`, {
        headers: { 'X-User-ID': user.id }
      });
      setConversations(res.data.conversations || []);
    } catch (error) {
      console.error("Error fetching inbox:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') fetchConversations();
  }, [channelFilter]);

  const fetchMessages = async (convId) => {
    try {
      const res = await axios.get(`${API_URL}/api/communications/thread/${convId}`, {
        headers: { 'X-User-ID': user.id }
      });
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error("Error fetching thread:", error);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;
    
    try {
      setIsSendingReply(true);
      const isEmail = selectedConversation.channel !== 'whatsapp';
      
      // Wrap links with tracker
      const trackedMessage = await wrapLinksInMessage(replyText, selectedConversation);

      if (isEmail) {
        await axios.post(`${API_URL}/api/communications/email/reply`, {
          conversation_id: selectedConversation.id,
          recipient_email: selectedConversation.lead_email,
          subject: selectedConversation.subject ? `Re: ${selectedConversation.subject}` : 'Respuesta',
          message: trackedMessage,
          attachments: attachments.map(a => ({
            filename: a.name,
            content_base64: a.base64,
            content_type: a.type
          }))
        }, {
          headers: { 'X-User-ID': user.id }
        });
        setReplyText('');
        setAttachments([]);
        setShowReplyModal(false);
      } else {
        const phone = selectedConversation.lead_phone?.replace(/\D/g, '');
        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(trackedMessage)}`, '_blank');
        
        await axios.post(`${API_URL}/api/communications/whatsapp/log`, {
            empresa_id: selectedConversation.id,
            phone: phone,
            message: trackedMessage,
            direction: 'outbound'
        }, {
            headers: { 'X-User-ID': user.id }
        });
      }
      
      setReplyText('');
      fetchMessages(selectedConversation.id);
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const response = await axios.patch(`${API_URL}/api/communications/conversations/${selectedConversation.id}/status`, {
        status: newStatus
      }, {
        headers: { 'X-User-ID': user.id }
      });
      
      if (response.data.status === 'success') {
        setSelectedConversation({ ...selectedConversation, status: newStatus });
        fetchConversations();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
    setStatusMenuAnchor(null);
  };

  const handleOpenReplyModal = () => {
    if (messages.length > 0) {
      const lastMsg = [...messages].reverse().find(m => m.direction === 'inbound') || messages[messages.length - 1];
      const dateStr = new Date(lastMsg.sent_at).toLocaleString();
      const senderName = lastMsg.direction === 'inbound' ? selectedConversation.lead_name : 'Mí';
      const quote = `\n\n\n--- El ${dateStr}, ${senderName} escribió:\n> ${lastMsg.body_text?.replace(/\n/g, '\n> ')}`;
      setReplyText(quote);
    } else {
      setReplyText('');
    }
    setAttachments([]);
    setShowReplyModal(true);
  };

  const handleSimulateInbound = async () => {
    try {
      await axios.post(`${API_URL}/api/debug/mock-inbound`, {
          conversation_id: selectedConversation.id,
          lead_email: selectedConversation.lead_email,
          message: "¡Hola! Gracias por el contacto. Me gustaría saber más sobre la propuesta."
      }, {
          headers: { 'X-User-ID': user.id }
      });
      fetchMessages(selectedConversation.id);
      fetchConversations();
    } catch (err) {
      console.error('Error simulating inbound:', err);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          base64: reader.result.split(',')[1]
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSummarizeThread = async () => {
    if (messages.length === 0) return;
    try {
        setIsSummarizing(true);
        const res = await axios.post(`${API_URL}/api/ai/assistant`, { 
            query: "Por favor, generame un resumen de 2 líneas de esta conversación para saber en qué quedamos." 
        }, {
            headers: { 'X-User-ID': user.id }
        });
        setThreadSummary(res.data.response);
    } catch (err) {
        console.error("Summary error:", err);
    } finally {
        setIsSummarizing(false);
    }
  };

  const wrapLinksInMessage = async (text, conv) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    if (!matches) return text;

    let newText = text;
    const uniqueUrls = [...new Set(matches)];
    
    for (const url of uniqueUrls) {
      try {
        const response = await axios.post(`${API_URL}/api/communications/link-tracking`, {
          original_url: url,
          conversation_id: conv.id,
          lead_id: conv.lead_email
        }, {
          headers: { 'X-User-ID': user.id }
        });
        if (response.data.tracked_url) {
          newText = newText.replaceAll(url, response.data.tracked_url);
        }
      } catch (err) {
        console.error('Error wrapping link:', err);
      }
    }
    return newText;
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await axios.post(`${API_URL}/api/communications/sync`, {}, {
        headers: { 'X-User-ID': user.id }
      });
      setTimeout(fetchConversations, 2000);
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box className="communications-container" sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: 'calc(100vh - 250px)', 
        minHeight: '600px',
        bgcolor: '#ffffff',
        borderRadius: '0 0 24px 24px',
        overflow: 'hidden',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Persistent Header */}
      <Box sx={{ 
          p: 3, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          bgcolor: '#fafafa'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, next) => next && setViewMode(next)}
            size="small"
            sx={{ 
              bgcolor: '#f1f5f9', 
              borderRadius: '12px',
              p: 0.5,
              border: '1px solid rgba(0,0,0,0.05)',
              '& .MuiToggleButton-root': {
                color: '#64748b',
                border: 'none',
                borderRadius: '8px',
                px: 1.5,
                py: 0.5,
                textTransform: 'none',
                '&.Mui-selected': {
                  bgcolor: '#ffffff',
                  color: '#3b82f6',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  '&:hover': { bgcolor: '#ffffff' }
                }
              }
            }}
          >
            <ToggleButton value="list">
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Inbox</Typography>
            </ToggleButton>
            <ToggleButton value="kanban">
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Sales Pipeline</Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Vancha (Asistente IA)">
            <IconButton 
              onClick={onOpenAi}
              sx={{ 
                bgcolor: '#f1f5f9', 
                color: '#3b82f6',
                '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.1)' }
              }}>
              <SparklesIcon sx={{ fontSize: '1.2rem' }} />
            </IconButton>
          </Tooltip>

          <ToggleButtonGroup
            value={channelFilter}
            exclusive
            onChange={(e, next) => next && setChannelFilter(next)}
            size="small"
            sx={{ 
                bgcolor: '#f1f5f9', 
                borderRadius: '8px',
                p: 0.3,
                '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: '6px',
                    color: '#64748b',
                    px: 1.5,
                    py: 0.3,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    '&.Mui-selected': {
                        bgcolor: '#ffffff',
                        color: '#3b82f6',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }
                }
            }}
          >
            <ToggleButton value="all">Todos</ToggleButton>
            <ToggleButton value="email">Emails</ToggleButton>
            <ToggleButton value="whatsapp">WhatsApp</ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title="Actualizar">
            <IconButton onClick={handleSync} disabled={syncing} sx={{ 
              bgcolor: '#f1f5f9', 
              '&:hover': { bgcolor: '#e2e8f0', transform: 'rotate(45deg)' },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <RefreshIcon sx={{ color: '#0f172a', fontSize: '1.2rem', animation: syncing ? 'spin 1.5s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {viewMode === 'list' ? (
          <>
            {/* Sidebar: Conversations */}
            <Box sx={{ 
                width: { xs: selectedConversation ? '0%' : '100%', md: '350px' },
                display: { xs: selectedConversation ? 'none' : 'flex', md: 'flex' },
                flexDirection: 'column',
                borderRight: '1px solid rgba(0, 0, 0, 0.05)',
                bgcolor: '#ffffff',
            }}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    px: 2, 
                    py: 1, 
                    borderRadius: '12px', 
                    bgcolor: '#f1f5f9',
                    border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  <SearchIcon sx={{ color: '#64748b', mr: 1, fontSize: '1rem' }} />
                  <InputBase 
                    placeholder="Buscar chats..." 
                    fullWidth 
                    sx={{ 
                        color: '#0f172a', 
                        fontSize: '0.8rem',
                        '& input': {
                            padding: 0,
                            background: 'transparent',
                        }
                    }}
                  />
                </Box>
              </Box>

              <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, py: 0 }}>
                {loading ? (
                  [1,2,3].map(i => (
                    <Box key={i} sx={{ p: 2.5, mb: 1, borderRadius: '20px', bgcolor: 'rgba(255,255,255,0.01)', height: '76px' }} />
                  ))
                ) : conversations.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>No hay chats</Typography>
                  </Box>
                ) : conversations.map((conv) => (
                  <ListItem 
                    key={conv.id}
                    button 
                    onClick={() => setSelectedConversation(conv)}
                    sx={{ 
                        borderRadius: '16px', 
                        mb: 0.5, 
                        py: 1.5,
                        px: 2,
                        bgcolor: selectedConversation?.id === conv.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                        '&:hover': { bgcolor: '#f8fafc' }
                    }}
                  >
                    <Box sx={{ position: 'relative', mr: 1.5 }}>
                        <Avatar 
                          sx={{ 
                              width: 40, 
                              height: 40, 
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                              color: '#fff', 
                              fontWeight: 800,
                              fontSize: '0.9rem'
                          }}>
                          {conv.lead_name?.charAt(0).toUpperCase()}
                        </Avatar>
                    </Box>
                    <ListItemText 
                      primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
                               <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{conv.lead_name}</Typography>
                              <Typography sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                                  {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </Typography>
                          </Box>
                      }
                      secondary={
                          <Typography sx={{ 
                            color: '#64748b', 
                            fontSize: '0.75rem', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis'
                          }}>
                              {conv.subject || 'WhatsApp Chat'}
                          </Typography>
                      } 
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Thread Area */}
            <Box sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                bgcolor: '#fafafa',
                position: 'relative'
            }}>
              {selectedConversation ? (
                <Fade in={true}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <Box sx={{ 
                          p: 2, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                          bgcolor: '#ffffff'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton 
                              onClick={() => setSelectedConversation(null)} 
                              sx={{ mr: 1, display: { xs: 'flex', md: 'none' }, color: '#64748b' }}
                          >
                              <BackIcon />
                          </IconButton>
                          <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                  {selectedConversation.lead_name}
                              </Typography>
                              <Typography sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                {selectedConversation.lead_email} • {selectedConversation.subject}
                              </Typography>
                                  {threadSummary && (
                                      <Box sx={{ mt: 1, p: 1, borderRadius: '8px', bgcolor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                          <Typography sx={{ color: '#2563eb', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                              <b>Resumen IA:</b> {threadSummary}
                                          </Typography>
                                      </Box>
                                  )}
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Resumen IA">
                                <IconButton 
                                    size="small" 
                                    onClick={handleSummarizeThread} 
                                    disabled={isSummarizing}
                                    sx={{ color: 'rgba(255,255,255,0.3)' }}
                                >
                                    {isSummarizing ? <CircularProgress size={16} color="inherit" /> : <StarsIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                             <Chip 
                                icon={<FlagIcon sx={{ fontSize: '0.8rem !important', color: 'inherit !important' }} />}
                                label={
                                    selectedConversation.status === 'open' ? 'Nuevos Leads' :
                                    selectedConversation.status === 'waiting_reply' ? 'Espera' :
                                    selectedConversation.status === 'replied' ? 'Respondido' :
                                    selectedConversation.status === 'interested' ? 'Interesado' :
                                    selectedConversation.status === 'not_interested' ? 'No Interesado' : 'Otro'
                                }
                                size="small"
                                onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
                                sx={{ 
                                    bgcolor: '#f1f5f9', 
                                    color: '#64748b',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    '&:hover': { bgcolor: '#e2e8f0' }
                                }}
                            />
                            
                            <Menu
                                anchorEl={statusMenuAnchor}
                                open={Boolean(statusMenuAnchor)}
                                onClose={() => setStatusMenuAnchor(null)}
                                PaperProps={{
                                    sx: {
                                        bgcolor: '#ffffff',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                        mt: 1,
                                        '& .MuiMenuItem-root': {
                                            fontSize: '0.8rem',
                                            color: '#0f172a',
                                            py: 1,
                                            '&:hover': { bgcolor: '#f1f5f9' }
                                        }
                                    }
                                }}
                            >
                                <MenuItem onClick={() => handleUpdateStatus('open')}>
                                    <ListItemIcon><NewLeadIcon sx={{ fontSize: '1rem', color: '#94a3b8' }} /></ListItemIcon>
                                    Nuevos Leads
                                </MenuItem>
                                <MenuItem onClick={() => handleUpdateStatus('waiting_reply')}>
                                    <ListItemIcon><WaitIcon sx={{ fontSize: '1rem', color: '#f59e0b' }} /></ListItemIcon>
                                    Esperando Respuesta
                                </MenuItem>
                                <MenuItem onClick={() => handleUpdateStatus('replied')}>
                                    <ListItemIcon><CheckCircleIcon sx={{ fontSize: '1rem', color: '#10b981' }} /></ListItemIcon>
                                    Respondido
                                </MenuItem>
                                <MenuItem onClick={() => handleUpdateStatus('interested')}>
                                    <ListItemIcon><StarsIcon sx={{ fontSize: '1rem', color: '#3b82f6' }} /></ListItemIcon>
                                    Interesado
                                </MenuItem>
                                <MenuItem onClick={() => handleUpdateStatus('not_interested')}>
                                    <ListItemIcon><CancelIcon sx={{ fontSize: '1rem', color: '#ef4444' }} /></ListItemIcon>
                                    No Interesado
                                </MenuItem>
                            </Menu>
                        </Box>
                      </Box>

                      <Box sx={{ 
                          flexGrow: 1, 
                          p: 3, 
                          overflowY: 'auto', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 2 
                      }}>
                        {messages.map((msg) => {
                          const isOutbound = msg.direction === 'outbound';
                          const isEmail = selectedConversation.channel !== 'whatsapp';
                          
                          if (isEmail) {
                            // Email Style: Card with headers
                            return (
                                <Box key={msg.id} sx={{ mb: 2 }}>
                                    <Paper sx={{ 
                                        p: 2, 
                                        bgcolor: '#ffffff', 
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                                    }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, borderBottom: '1px solid rgba(0,0,0,0.05)', pb: 1 }}>
                                            <Box>
                                                <Typography sx={{ color: '#0f172a', fontWeight: 700, fontSize: '0.8rem' }}>
                                                    {isOutbound ? 'De: Mí' : `De: ${selectedConversation.lead_name}`}
                                                </Typography>
                                                <Typography sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                                    {isOutbound ? `Para: ${selectedConversation.lead_email}` : 'Para: Mí'}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                                                {new Date(msg.sent_at).toLocaleString()}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ color: '#334155', fontSize: '0.9rem', whiteSpace: 'pre-wrap', pt: 1 }}>
                                            {msg.body_text}
                                        </Typography>
                                    </Paper>
                                </Box>
                            );
                          }

                          // WhatsApp Style: Chat bubbles
                          return (
                              <Box 
                                  key={msg.id} 
                                  sx={{ 
                                      alignSelf: isOutbound ? 'flex-end' : 'flex-start',
                                      maxWidth: '80%',
                                      display: 'flex', 
                                      flexDirection: 'column',
                                      alignItems: isOutbound ? 'flex-end' : 'flex-start'
                                  }}
                              >
                                  <Box sx={{ 
                                      px: 2, 
                                      py: 1.5, 
                                      borderRadius: isOutbound ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                      bgcolor: isOutbound ? '#075e54' : '#ffffff',
                                      boxShadow: isOutbound ? '0 4px 15px rgba(7, 94, 84, 0.2)' : '0 2px 10px rgba(0,0,0,0.05)',
                                      border: isOutbound ? 'none' : '1px solid rgba(0,0,0,0.05)'
                                  }}>
                                      <Typography sx={{ color: isOutbound ? '#fff' : '#0f172a', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                          {msg.body_text}
                                      </Typography>
                                  </Box>
                                  <Typography sx={{ mt: 0.5, color: '#94a3b8', fontSize: '0.6rem' }}>
                                      {new Date(msg.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </Typography>
                              </Box>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </Box>

                      <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.05)', bgcolor: '#ffffff' }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            p: 1.5,
                            borderRadius: '16px',
                            bgcolor: '#f8fafc',
                            border: '1px solid rgba(0, 0, 0, 0.05)'
                        }}>
                          {selectedConversation.channel !== 'whatsapp' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button 
                                    variant="contained"
                                    startIcon={<SendIcon />}
                                    sx={{ 
                                        borderRadius: '10px',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        bgcolor: '#3b82f6',
                                        '&:hover': { bgcolor: '#2563eb' }
                                    }}
                                    onClick={handleOpenReplyModal}
                                >
                                    Responder Email
                                </Button>
                                <Button 
                                  size="small"
                                  onClick={handleSimulateInbound}
                                  sx={{ 
                                    color: 'rgba(0, 0, 0, 0.15)', 
                                    fontSize: '0.65rem', 
                                    textTransform: 'none',
                                    ml: 1,
                                    '&:hover': { color: '#3b82f6', bgcolor: 'transparent' }
                                  }}
                                >
                                  (Simular Respuesta Lead)
                                </Button>
                            </Box>
                          ) : (
                            <>
                                <IconButton size="small" sx={{ color: '#64748b' }}>
                                    <AttachFileIcon fontSize="small" />
                                </IconButton>
                                <InputBase 
                                    multiline
                                    maxRows={4}
                                    fullWidth
                                    placeholder="Escribe por WhatsApp..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    sx={{ color: '#0f172a', fontSize: '0.85rem' }}
                                />
                                <IconButton 
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim() || isSendingReply}
                                    size="small"
                                    sx={{ 
                                        bgcolor: replyText.trim() ? '#25D366' : 'transparent', 
                                        color: replyText.trim() ? '#fff' : 'rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    <SendIcon fontSize="small" />
                                </IconButton>
                            </>
                          )}
                        </Box>
                      </Box>
                  </Box>
                </Fade>
              ) : (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <SendIcon sx={{ fontSize: 60, color: 'rgba(59, 130, 246, 0.05)', mb: 2 }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Selecciona una conversación</Typography>
                </Box>
              )}
            </Box>
          </>
        ) : (
          <KanbanBoard 
            conversations={conversations} 
            onSelectConversation={(conv) => {
              setSelectedConversation(conv);
              setViewMode('list');
            }} 
          />
        )}
      </Box>

      <style>
          {`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .communications-container ::-webkit-scrollbar {
                width: 4px;
            }
            .communications-container ::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.05);
                border-radius: 10px;
            }
          `}
      </style>
      {/* Modal de Respuesta Formal de Email */}
      <Dialog 
        open={showReplyModal} 
        onClose={() => setShowReplyModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#ffffff',
            backgroundImage: 'none',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '24px',
            color: '#0f172a',
            maxHeight: '90vh',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)', pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Responder Email</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                    Para: {selectedConversation?.lead_email} • <b>Re: {selectedConversation?.subject}</b>
                </Typography>
            </Box>
            <IconButton onClick={() => setShowReplyModal(false)} size="small" sx={{ color: 'rgba(0, 0, 0, 0.3)' }}>
                <CloseIcon />
            </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column' }}>
          <TextField
            autoFocus
            multiline
            rows={12}
            fullWidth
            placeholder="Escribe tu correo de respuesta aquí..."
            variant="standard"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            InputProps={{
              disableUnderline: true,
              sx: { color: '#0f172a', fontSize: '0.95rem', fontFamily: 'inherit' }
            }}
          />
          
          {attachments.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {attachments.map((file, idx) => (
                <Chip 
                  key={idx}
                  label={file.name}
                  onDelete={() => removeAttachment(idx)}
                  size="small"
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.05)', 
                    color: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.3)' }
                  }}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.05)', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="file"
              id="email-attach-file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <Tooltip title="Adjuntar archivo">
              <IconButton 
                component="label" 
                htmlFor="email-attach-file"
                sx={{ 
                  color: '#3b82f6', 
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)' }
                }}
              >
                <AttachFileIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button onClick={() => setShowReplyModal(false)} sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSendReply}
              disabled={!replyText.trim() || isSendingReply}
              startIcon={isSendingReply ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              sx={{ 
                  borderRadius: '10px', 
                  px: 4, 
                  bgcolor: '#3b82f6',
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
                  '&:hover': { bgcolor: '#2563eb' }
              }}
            >
              {isSendingReply ? 'Enviando...' : 'Enviar Respuesta'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Communications;

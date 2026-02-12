import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Paper, List, ListItem, ListItemText, 
  Divider, Avatar, TextField, Button, IconButton, Chip,
  InputBase, Tooltip, Zoom, Fade, ToggleButton, ToggleButtonGroup,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  Send as SendIcon, 
  AttachFile as AttachFileIcon,
  Search as SearchIcon,
  Circle as CircleIcon,
  MoreVert as MoreVertIcon,
  KeyboardArrowLeft as BackIcon,
  ViewList as ListIcon,
  ViewKanban as KanbanIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from './KanbanBoard';

const Communications = () => {
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
      
      if (isEmail) {
        await axios.post(`${API_URL}/api/communications/email/reply`, {
          conversation_id: selectedConversation.id,
          recipient_email: selectedConversation.lead_email,
          subject: selectedConversation.subject ? `Re: ${selectedConversation.subject}` : 'Respuesta',
          message: replyText,
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
        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(replyText)}`, '_blank');
        
        await axios.post(`${API_URL}/api/communications/whatsapp/log`, {
            empresa_id: selectedConversation.id,
            phone: phone,
            message: replyText,
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
        bgcolor: 'rgba(10, 15, 25, 0.4)',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Persistent Header */}
      <Box sx={{ 
          p: 3, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          bgcolor: 'rgba(255, 255, 255, 0.02)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography variant="h5" sx={{ 
            fontWeight: 800, 
            letterSpacing: '-1px',
            background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.6) 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            Communications
          </Typography>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, next) => next && setViewMode(next)}
            size="small"
            sx={{ 
              bgcolor: 'rgba(0,0,0,0.2)', 
              borderRadius: '12px',
              p: 0.5,
              border: '1px solid rgba(255,255,255,0.05)',
              '& .MuiToggleButton-root': {
                color: 'rgba(255,255,255,0.3)',
                border: 'none',
                borderRadius: '8px',
                px: 1.5,
                py: 0.5,
                textTransform: 'none',
                '&.Mui-selected': {
                  bgcolor: 'rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6',
                  '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.3)' }
                }
              }
            }}
          >
            <ToggleButton value="list">
              <ListIcon sx={{ fontSize: '1.2rem', mr: 0.8 }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Inbox</Typography>
            </ToggleButton>
            <ToggleButton value="kanban">
              <KanbanIcon sx={{ fontSize: '1.2rem', mr: 0.8 }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Sales Pipeline</Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={channelFilter}
            exclusive
            onChange={(e, next) => next && setChannelFilter(next)}
            size="small"
            sx={{ 
                bgcolor: 'rgba(255,255,255,0.03)', 
                borderRadius: '8px',
                p: 0.3,
                '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: '6px',
                    color: 'rgba(255,255,255,0.4)',
                    px: 1.5,
                    py: 0.3,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    '&.Mui-selected': {
                        bgcolor: 'rgba(255,255,255,0.08)',
                        color: '#fff',
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
              bgcolor: 'rgba(255,255,255,0.03)', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'rotate(45deg)' },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <RefreshIcon sx={{ color: '#fff', fontSize: '1.2rem', animation: syncing ? 'spin 1.5s linear infinite' : 'none' }} />
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
                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                bgcolor: 'rgba(255, 255, 255, 0.01)',
            }}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    px: 2, 
                    py: 1, 
                    borderRadius: '12px', 
                    bgcolor: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <SearchIcon sx={{ color: 'rgba(255,255,255,0.2)', mr: 1, fontSize: '1rem' }} />
                  <InputBase 
                    placeholder="Buscar chats..." 
                    fullWidth 
                    sx={{ color: '#fff', fontSize: '0.8rem' }}
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
                    <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>No hay chats</Typography>
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
                        bgcolor: selectedConversation?.id === conv.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
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
                        <Box sx={{ 
                            position: 'absolute', 
                            bottom: -2, 
                            right: -2, 
                            bgcolor: '#0a0f19', 
                            borderRadius: '50%', 
                            p: 0.2,
                            display: 'flex',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {conv.channel === 'whatsapp' ? 
                                <KanbanIcon sx={{ fontSize: '0.7rem', color: '#25D366' }} /> : 
                                <ListIcon sx={{ fontSize: '0.7rem', color: '#3b82f6' }} />
                            }
                        </Box>
                    </Box>
                    <ListItemText 
                      primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
                              <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>{conv.lead_name}</Typography>
                              <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>
                                  {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </Typography>
                          </Box>
                      }
                      secondary={
                          <Typography sx={{ 
                            color: 'rgba(255,255,255,0.4)', 
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
                bgcolor: 'rgba(0,0,0,0.1)',
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
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          bgcolor: 'rgba(255, 255, 255, 0.01)'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton 
                              onClick={() => setSelectedConversation(null)} 
                              sx={{ mr: 1, display: { xs: 'flex', md: 'none' }, color: 'rgba(255,255,255,0.3)' }}
                          >
                              <BackIcon />
                          </IconButton>
                          <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                                  {selectedConversation.lead_name}
                              </Typography>
                              <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                                {selectedConversation.lead_email} • {selectedConversation.subject}
                              </Typography>
                          </Box>
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
                                        bgcolor: 'rgba(255,255,255,0.03)', 
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '12px'
                                    }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', pb: 1 }}>
                                            <Box>
                                                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>
                                                    {isOutbound ? 'De: Mí' : `De: ${selectedConversation.lead_name}`}
                                                </Typography>
                                                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                                                    {isOutbound ? `Para: ${selectedConversation.lead_email}` : 'Para: Mí'}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                                                {new Date(msg.sent_at).toLocaleString()}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', pt: 1 }}>
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
                                      bgcolor: isOutbound ? '#056162' : 'rgba(255,255,255,0.05)',
                                      boxShadow: isOutbound ? '0 8px 24px rgba(5, 97, 98, 0.2)' : 'none',
                                      border: isOutbound ? 'none' : '1px solid rgba(255,255,255,0.05)'
                                  }}>
                                      <Typography sx={{ color: '#fff', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                          {msg.body_text}
                                      </Typography>
                                  </Box>
                                  <Typography sx={{ mt: 0.5, color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem' }}>
                                      {new Date(msg.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </Typography>
                              </Box>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </Box>

                      <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            p: 1.5,
                            borderRadius: '16px',
                            bgcolor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)'
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
                                    onClick={() => setShowReplyModal(true)}
                                >
                                    Responder Email
                                </Button>
                                <Button 
                                  size="small"
                                  onClick={handleSimulateInbound}
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.15)', 
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
                                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.2)' }}>
                                    <AttachFileIcon fontSize="small" />
                                </IconButton>
                                <InputBase 
                                    multiline
                                    maxRows={4}
                                    fullWidth
                                    placeholder="Escribe por WhatsApp..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    sx={{ color: '#fff', fontSize: '0.85rem' }}
                                />
                                <IconButton 
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim() || isSendingReply}
                                    size="small"
                                    sx={{ 
                                        bgcolor: replyText.trim() ? '#25D366' : 'transparent', 
                                        color: replyText.trim() ? '#fff' : 'rgba(255,255,255,0.1)'
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
                  <SendIcon sx={{ fontSize: 60, color: 'rgba(59, 130, 246, 0.1)', mb: 2 }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem' }}>Selecciona una conversación</Typography>
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
                background: rgba(255,255,255,0.05);
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
            bgcolor: '#0a0f19',
            backgroundImage: 'none',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px',
            color: '#fff',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Responder Email</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                    Para: {selectedConversation?.lead_email} • <b>Re: {selectedConversation?.subject}</b>
                </Typography>
            </Box>
            <IconButton onClick={() => setShowReplyModal(false)} size="small" sx={{ color: 'rgba(255,255,255,0.2)' }}>
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
              sx: { color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', fontFamily: 'inherit' }
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

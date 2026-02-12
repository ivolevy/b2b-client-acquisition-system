import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Paper, List, ListItem, ListItemText, 
  Divider, Avatar, TextField, Button, IconButton, Chip,
  InputBase, Tooltip, Zoom, Fade
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  Send as SendIcon, 
  AttachFile as AttachFileIcon,
  Search as SearchIcon,
  Circle as CircleIcon,
  MoreVert as MoreVertIcon,
  KeyboardArrowLeft as BackIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Communications = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [replyText, setReplyText] = useState('');
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
      const res = await axios.get(`${API_URL}/api/communications/inbox`, {
        headers: { 'X-User-ID': user.id }
      });
      setConversations(res.data.conversations || []);
    } catch (error) {
      console.error("Error fetching inbox:", error);
    } finally {
      setLoading(false);
    }
  };

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
        height: 'calc(100vh - 250px)', 
        minHeight: '600px',
        gap: 0, 
        bgcolor: 'transparent',
        borderRadius: '0 0 32px 32px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: 'none',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
    }}>
      {/* Sidebar: Conversations */}
      <Box sx={{ 
          width: { xs: selectedConversation ? '0%' : '100%', md: '350px' },
          display: { xs: selectedConversation ? 'none' : 'flex', md: 'flex' },
          flexDirection: 'column',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: 'rgba(255, 255, 255, 0.02)',
      }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, background: 'linear-gradient(90deg, #fff 0%, #aaa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Inbox
          </Typography>
          <Tooltip title="Sincronizar correos">
            <IconButton onClick={handleSync} disabled={syncing} sx={{ bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
              <RefreshIcon sx={{ color: '#fff', fontSize: '1.2rem', animation: syncing ? 'spin 2s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ px: 2, pb: 2 }}>
          <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              px: 2, 
              py: 1, 
              borderRadius: '14px', 
              bgcolor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <SearchIcon sx={{ color: 'rgba(255,255,255,0.3)', mr: 1, fontSize: '1.2rem' }} />
            <InputBase 
              placeholder="Buscar conversaciones..." 
              fullWidth 
              sx={{ color: '#fff', fontSize: '0.9rem' }}
            />
          </Box>
        </Box>

        <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1, py: 0 }}>
          {loading ? (
            [1,2,3].map(i => (
              <Box key={i} sx={{ p: 2, mb: 1, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.02)', height: '70px', opacity: 0.5 }} />
            ))
          ) : conversations.map((conv) => (
            <ListItem 
              key={conv.id}
              button 
              onClick={() => setSelectedConversation(conv)}
              sx={{ 
                  borderRadius: '16px', 
                  mb: 1, 
                  py: 2,
                  transition: 'all 0.2s',
                  bgcolor: selectedConversation?.id === conv.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: selectedConversation?.id === conv.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  '&:hover': { bgcolor: selectedConversation?.id === conv.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)' }
              }}
            >
              <Avatar 
                sx={{ 
                    width: 45, 
                    height: 45, 
                    mr: 2, 
                    bgcolor: 'rgba(59, 130, 246, 0.2)', 
                    color: '#fff', 
                    fontWeight: 700,
                    border: '1px solid rgba(59, 130, 246, 0.5)'
                }}>
                {conv.lead_name?.charAt(0).toUpperCase()}
              </Avatar>
              <ListItemText 
                primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{conv.lead_name}</Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                            {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </Typography>
                    </Box>
                }
                secondary={
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.subject}
                    </Typography>
                } 
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Main Area: Thread */}
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
                {/* Thread Header */}
                <Box sx={{ 
                    p: 3, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    bgcolor: 'rgba(255, 255, 255, 0.01)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton 
                        onClick={() => setSelectedConversation(null)} 
                        sx={{ mr: 1, display: { xs: 'flex', md: 'none' }, color: 'rgba(255,255,255,0.5)' }}
                    >
                        <BackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                            {selectedConversation.lead_name}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                            {selectedConversation.lead_email} • {selectedConversation.subject}
                        </Typography>
                    </Box>
                  </Box>
                  <IconButton sx={{ color: 'rgba(255,255,255,0.3)' }}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                {/* Messages List */}
                <Box sx={{ 
                    flexGrow: 1, 
                    p: 4, 
                    overflowY: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 3,
                    height: '100px' // Hack for flex overflow
                }}>
                  {messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
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
                                px: 2.5, 
                                py: 1.5, 
                                borderRadius: isOutbound ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                bgcolor: isOutbound ? '#3b82f6' : 'rgba(255,255,255,0.06)',
                                border: isOutbound ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                boxShadow: isOutbound ? '0 4px 15px rgba(59, 130, 246, 0.2)' : 'none',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': { 
                                    transform: 'translateY(-1px)',
                                    boxShadow: isOutbound ? '0 6px 20px rgba(59, 130, 246, 0.3)' : '0 4px 12px rgba(0,0,0,0.2)'
                                }
                            }}>
                                <Typography sx={{ 
                                    color: isOutbound ? '#fff' : 'rgba(255,255,255,0.9)', 
                                    fontSize: '0.95rem',
                                    whiteSpace: 'pre-wrap',
                                    fontWeight: 500
                                }}>
                                    {msg.body_text}
                                </Typography>
                            </Box>
                            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                                {new Date(msg.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                {isOutbound && ' • Enviado'}
                            </Typography>
                        </Box>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Reply Section */}
                <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.01)' }}>
                  <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-end', 
                      gap: 2, 
                      p: 1.5,
                      borderRadius: '20px',
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    <IconButton sx={{ color: 'rgba(255,255,255,0.4)', p: 1.5 }}>
                        <AttachFileIcon />
                    </IconButton>
                    <InputBase 
                        multiline
                        maxRows={5}
                        fullWidth
                        placeholder="Mensaje..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        sx={{ 
                            color: '#fff', 
                            fontSize: '0.95rem', 
                            py: 1.5,
                            '& .MuiInputBase-input': { p: 0 }
                        }}
                    />
                    <IconButton 
                        disabled={!replyText.trim()}
                        sx={{ 
                            bgcolor: replyText.trim() ? '#3b82f6' : 'rgba(255,255,255,0.05)', 
                            color: '#fff',
                            p: 1.5,
                            transition: 'all 0.3s',
                            '&:hover': { bgcolor: '#2563eb' }
                        }}
                    >
                        <SendIcon sx={{ fontSize: '1.2rem' }} />
                    </IconButton>
                  </Box>
                </Box>
            </Box>
          </Fade>
        ) : (
          <Box sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexDirection: 'column',
              opacity: 0.3
          }}>
            <Box sx={{ 
                width: 120, 
                height: 120, 
                borderRadius: '40px', 
                bgcolor: 'rgba(255,255,255,0.03)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 3,
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <SendIcon sx={{ fontSize: 60, color: '#fff', transform: 'rotate(-45deg)', opacity: 0.2 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', mb: 1 }}>Tus Mensajes</Typography>
            <Typography sx={{ color: '#fff', fontSize: '0.9rem' }}>Selecciona una conversación para empezar a chatear</Typography>
          </Box>
        )}
      </Box>

      <style>
          {`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .communications-container ::-webkit-scrollbar {
                width: 6px;
            }
            .communications-container ::-webkit-scrollbar-track {
                background: transparent;
            }
            .communications-container ::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.05);
                border-radius: 10px;
            }
            .communications-container ::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.1);
            }
          `}
      </style>
    </Box>
  );
};

export default Communications;

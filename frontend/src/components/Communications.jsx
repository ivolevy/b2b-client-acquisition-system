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
        bgcolor: 'rgba(10, 15, 25, 0.4)',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Sidebar: Conversations */}
      <Box sx={{ 
          width: { xs: selectedConversation ? '0%' : '100%', md: '350px' },
          display: { xs: selectedConversation ? 'none' : 'flex', md: 'flex' },
          flexDirection: 'column',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ 
            fontWeight: 800, 
            letterSpacing: '-1px',
            background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.6) 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            Inbox
          </Typography>
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

        <Box sx={{ px: 2, pb: 2 }}>
          <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              px: 2, 
              py: 1, 
              borderRadius: '16px', 
              bgcolor: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.2s',
              '&:focus-within': {
                bgcolor: 'rgba(0,0,0,0.3)',
                borderColor: 'rgba(59, 130, 246, 0.4)'
              }
          }}>
            <SearchIcon sx={{ color: 'rgba(255,255,255,0.2)', mr: 1, fontSize: '1.1rem' }} />
            <InputBase 
              placeholder="Buscar..." 
              fullWidth 
              sx={{ color: '#fff', fontSize: '0.85rem' }}
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
                  borderRadius: '20px', 
                  mb: 1, 
                  py: 2,
                  px: 2,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  bgcolor: selectedConversation?.id === conv.id ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  border: '1px solid',
                  borderColor: selectedConversation?.id === conv.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  '&:hover': { 
                    bgcolor: selectedConversation?.id === conv.id ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255,255,255,0.03)',
                    transform: 'translateX(4px)'
                  }
              }}
            >
              <Avatar 
                sx={{ 
                    width: 48, 
                    height: 48, 
                    mr: 2, 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                    color: '#fff', 
                    fontWeight: 800,
                    fontSize: '1rem',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}>
                {conv.lead_name?.charAt(0).toUpperCase()}
              </Avatar>
              <ListItemText 
                primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', letterSpacing: '-0.2px' }}>{conv.lead_name}</Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: 500 }}>
                            {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </Typography>
                    </Box>
                }
                secondary={
                    <Typography sx={{ 
                      color: selectedConversation?.id === conv.id ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', 
                      fontSize: '0.8rem', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      fontWeight: 400
                    }}>
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
          bgcolor: 'rgba(0,0,0,0.15)',
          position: 'relative'
      }}>
        {selectedConversation ? (
          <Fade in={true} timeout={400}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Thread Header */}
                <Box sx={{ 
                    p: 3, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    bgcolor: 'rgba(255, 255, 255, 0.01)',
                    backdropFilter: 'blur(8px)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton 
                        onClick={() => setSelectedConversation(null)} 
                        sx={{ mr: 1, display: { xs: 'flex', md: 'none' }, color: 'rgba(255,255,255,0.3)' }}
                    >
                        <BackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.1, mb: 0.5, letterSpacing: '-0.3px' }}>
                            {selectedConversation.lead_name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ 
                            px: 1, 
                            py: 0.2, 
                            bgcolor: 'rgba(59, 130, 246, 0.1)', 
                            color: '#3b82f6', 
                            fontSize: '0.7rem', 
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                              {selectedConversation.lead_email}
                          </Typography>
                          <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                            • {selectedConversation.subject}
                          </Typography>
                        </Box>
                    </Box>
                  </Box>
                  <IconButton sx={{ color: 'rgba(255,255,255,0.2)', '&:hover': { color: '#fff' } }}>
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
                    height: '100px',
                    background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.03) 0%, transparent 70%)'
                }}>
                  {messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                        <Box 
                            key={msg.id} 
                            sx={{ 
                                alignSelf: isOutbound ? 'flex-end' : 'flex-start',
                                maxWidth: '75%',
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: isOutbound ? 'flex-end' : 'flex-start'
                            }}
                        >
                            <Box sx={{ 
                                px: 2.5, 
                                py: 1.8, 
                                borderRadius: isOutbound ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                                bgcolor: isOutbound ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                border: isOutbound ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                boxShadow: isOutbound ? '0 10px 30px rgba(59, 130, 246, 0.25)' : 'none',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': { 
                                    transform: isOutbound ? 'translateX(-4px)' : 'translateX(4px)',
                                    bgcolor: isOutbound ? '#2563eb' : 'rgba(255,255,255,0.08)'
                                }
                            }}>
                                <Typography sx={{ 
                                    color: isOutbound ? '#fff' : 'rgba(255,255,255,0.95)', 
                                    fontSize: '0.92rem',
                                    whiteSpace: 'pre-wrap',
                                    fontWeight: 500,
                                    lineHeight: 1.5,
                                    letterSpacing: '0.1px'
                                }}>
                                    {msg.body_text}
                                </Typography>
                            </Box>
                            <Typography sx={{ 
                              mt: 0.8, 
                              color: 'rgba(255,255,255,0.2)', 
                              fontSize: '0.65rem', 
                              fontWeight: 600,
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase'
                            }}>
                                {new Date(msg.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                {isOutbound && ' • Entregado'}
                            </Typography>
                        </Box>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Reply Section */}
                <Box sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.1)' }}>
                  <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-end', 
                      gap: 2, 
                      p: 1.5,
                      borderRadius: '24px',
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.3s',
                      '&:focus-within': {
                        bgcolor: 'rgba(255,255,255,0.05)',
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.05)'
                      }
                  }}>
                    <IconButton sx={{ color: 'rgba(255,255,255,0.3)', p: 1.5, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}>
                        <AttachFileIcon sx={{ fontSize: '1.2rem' }} />
                    </IconButton>
                    <InputBase 
                        multiline
                        maxRows={5}
                        fullWidth
                        placeholder="Escribe tu respuesta..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        sx={{ 
                            color: '#fff', 
                            fontSize: '0.92rem', 
                            py: 1.5,
                            '& .MuiInputBase-input': { 
                                p: 0,
                                '&::placeholder': {
                                  color: 'rgba(255,255,255,0.2)',
                                  opacity: 1
                                }
                            }
                        }}
                    />
                    <IconButton 
                        disabled={!replyText.trim()}
                        sx={{ 
                            bgcolor: replyText.trim() ? '#3b82f6' : 'rgba(255,255,255,0.02)', 
                            color: replyText.trim() ? '#fff' : 'rgba(255,255,255,0.1)',
                            p: 1.5,
                            borderRadius: '16px',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: replyText.trim() ? '0 8px 20px rgba(59, 130, 246, 0.3)' : 'none',
                            '&:hover': { 
                              bgcolor: replyText.trim() ? '#2563eb' : 'rgba(255,255,255,0.05)',
                              transform: replyText.trim() ? 'scale(1.05)' : 'none'
                            },
                            '&:active': { transform: 'scale(0.95)' }
                        }}
                    >
                        <SendIcon sx={{ fontSize: '1.25rem' }} />
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
              background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.05) 0%, transparent 70%)'
          }}>
            <Box sx={{ 
                width: 140, 
                height: 140, 
                borderRadius: '48px', 
                bgcolor: 'rgba(59, 130, 246, 0.05)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 4,
                border: '1px solid rgba(59, 130, 246, 0.1)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
                animation: 'pulse 3s infinite ease-in-out'
            }}>
                <SendIcon sx={{ fontSize: 70, color: '#3b82f6', transform: 'rotate(-45deg)', opacity: 0.4 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 1, letterSpacing: '-1px' }}>Inbox Pro</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', maxWidth: '300px', textAlign: 'center', lineHeight: 1.6 }}>
                Tus conversaciones de Gmail y Outlook unificadas en un solo lugar.
            </Typography>
          </Box>
        )}
      </Box>

      <style>
          {`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
            .communications-container ::-webkit-scrollbar {
                width: 5px;
            }
            .communications-container ::-webkit-scrollbar-track {
                background: transparent;
            }
            .communications-container ::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.05);
                border-radius: 10px;
            }
            .communications-container ::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.12);
            }
          `}
      </style>
    </Box>
  );
};

export default Communications;

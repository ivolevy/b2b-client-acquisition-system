import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, IconButton, InputBase, Drawer, 
  CircularProgress, Avatar, Paper, Fade
} from '@mui/material';
import { 
  Send as SendIcon, 
  Close as CloseIcon,
  Face as FaceIcon,
  AutoAwesome as SparklesIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const AIAssistant = ({ open, onClose }) => {
  const { user } = useAuth();
  const [aiQuery, setAiQuery] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy Vancha, tu asistente impulsado con IA. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiMessagesEndRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        aiMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [aiMessages, open]);

  const handleAiAssistantQuery = async () => {
    if (!aiQuery.trim() || !user?.id) return;
    
    const userMsg = { role: 'user', text: aiQuery };
    setAiMessages(prev => [...prev, userMsg]);
    setAiQuery('');
    setIsAiLoading(true);
    
    try {
      const res = await axios.post(`${API_URL}/api/ai/assistant`, { query: aiQuery }, {
        headers: { 'X-User-ID': user.id }
      });
      setAiMessages(prev => [...prev, { role: 'assistant', text: res.data.response }]);
    } catch (error) {
      console.error("AI Assistant error:", error);
      const errorMsg = error.response?.data?.detail || 'Lo siento, hubo un error al procesar tu consulta.';
      setAiMessages(prev => [...prev, { role: 'assistant', text: errorMsg }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: { backgroundColor: 'transparent' }
        }
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '400px' },
          bgcolor: '#ffffff',
          borderLeft: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
          backgroundImage: 'none'
        }
      }}
    >
      {/* Header */}
      <Box sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          bgcolor: '#fafafa'
      }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ 
                  bgcolor: 'rgba(59, 130, 246, 0.1)', 
                  color: '#3b82f6', 
                  width: 44, 
                  height: 44,
                  border: '1.5px solid rgba(59, 130, 246, 0.1)'
              }}>
                  <FaceIcon sx={{ fontSize: '1.8rem' }} />
              </Avatar>
              <Box>
                  <Typography variant="subtitle1" sx={{ color: '#0f172a', fontWeight: 800, lineHeight: 1.2, fontSize: '1.1rem' }}>
                      Vancha
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>
                      ASISTENTE IA
                  </Typography>
              </Box>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'rgba(0,0,0,0.3)', '&:hover': { color: '#000', bgcolor: 'rgba(0,0,0,0.05)' } }}>
              <CloseIcon />
          </IconButton>
      </Box>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#ffffff' }}>
          {aiMessages.map((msg, idx) => (
              <Box key={idx} sx={{ 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                    <Paper sx={{ 
                        p: 1.8, 
                        borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                        bgcolor: msg.role === 'user' ? '#3b82f6' : '#ffffff',
                        color: msg.role === 'user' ? '#fff' : '#1e293b',
                        border: msg.role === 'user' ? 'none' : '1px solid rgba(0,0,0,0.08)',
                        boxShadow: msg.role === 'user' ? '0 8px 20px rgba(59, 130, 246, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease'
                    }}>
                        <Typography variant="body2" sx={{ 
                            lineHeight: 1.6, 
                            whiteSpace: 'pre-wrap', 
                            fontWeight: msg.role === 'user' ? 450 : 500,
                            fontSize: '0.92rem',
                            letterSpacing: '0.01em'
                        }}>
                            {msg.text}
                        </Typography>
                    </Paper>
                  <Typography variant="caption" sx={{ mt: 0.5, color: '#94a3b8', mx: 1 }}>
                      {msg.role === 'user' ? 'Tú' : 'Vancha'}
                  </Typography>
              </Box>
          ))}
          {isAiLoading && (
              <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                  <CircularProgress size={16} sx={{ color: '#3b82f6' }} />
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Pensando...</Typography>
              </Box>
          )}
          <div ref={aiMessagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.05)', bgcolor: '#ffffff' }}>
          <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: '#f8fafc', 
              borderRadius: '16px',
              border: '1px solid rgba(0,0,0,0.08)',
              p: '4px 8px 4px 16px',
              transition: 'all 0.2s ease',
              '&:focus-within': {
                  borderColor: '#3b82f6',
                  bgcolor: '#ffffff',
                  boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
              }
          }}>
              <InputBase
                  multiline
                  maxRows={6}
                  fullWidth
                  placeholder="Escribe tu mensaje..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAiAssistantQuery();
                      }
                  }}
                  sx={{ 
                      color: '#0f172a', 
                      fontSize: '0.9rem',
                      '& textarea': {
                          padding: '8px 0'
                      }
                  }}
              />
              <IconButton 
                  onClick={handleAiAssistantQuery}
                  disabled={isAiLoading || !aiQuery.trim()}
                  sx={{ 
                      color: '#3b82f6',
                      p: 1,
                      ml: 1,
                      '&.Mui-disabled': { color: 'rgba(0,0,0,0.1)' }
                  }}
              >
                  <SendIcon sx={{ fontSize: '1.2rem' }} />
              </IconButton>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center', color: '#94a3b8', fontSize: '0.65rem' }}>
              Vancha puede cometer errores.
          </Typography>
      </Box>
    </Drawer>
  );
};

export default AIAssistant;

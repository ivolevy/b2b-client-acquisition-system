import React, { useState, useRef } from 'react';
import { FiMic, FiStopCircle, FiTrash2, FiPlay, FiPause, FiFileText, FiArrowRight, FiCheck, FiX, FiRefreshCw, FiRotateCw } from 'react-icons/fi';
import './SmartFilterInput.css';

const SmartFilterInput = ({ value, onChange, onAudioRecord, onTranscribe, onSearch, onInterpret }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Interpretation State
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState(null);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  const handleInterpretationTrigger = async (text) => {
      if (!onInterpret) return;
      
      setIsInterpreting(true);
      setInterpretation(null);
      try {
          const result = await onInterpret(text);
          if (result && result.is_clear) {
              setInterpretation(result);
          } else {
               // Fallback: Show error/unclear message to user instead of silent failure
               setInterpretation({
                   is_clear: false,
                   interpretation_summary: (result && result.interpretation_summary) || "No pudimos interpretar tu búsqueda. Por favor intenta de nuevo o sé más específico."
               });
          }
      } catch (e) {
          console.error("Error interpreting:", e);
          setInterpretation({
              is_clear: false,
              interpretation_summary: "Ocurrió un error de conexión con la IA."
          });
      } finally {
          setIsInterpreting(false);
      }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        if (onAudioRecord) {
            onAudioRecord(blob);
        }
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono. Por favor verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
    if (onAudioRecord) onAudioRecord(null);
  };

  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleTranscribeClick = async () => {
    if (!audioBlob || !onTranscribe) return;
    
    setIsTranscribing(true);
    try {
        await onTranscribe(audioBlob);
    } catch (error) {
        console.error("Error transcribing:", error);
        // alert("Error al transcribir audio."); // User dislikes alerts, maybe toast? kept simple for now
    } finally {
        setIsTranscribing(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand if there is content
  React.useEffect(() => {
    if (value || audioBlob) {
        setIsExpanded(true);
    }
  }, []);

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onSearch && value.trim()) {
        onSearch();
      }
    }
  };

  if (!isExpanded && !value && !audioBlob) {
    return (
            <div 
                className="smart-filter-trigger-text"
                onClick={() => setIsExpanded(true)}
            >
                <span className="trigger-label">Filtro Inteligente (IA)</span>
            </div>
    );
  }

  return (
    <div className="smart-filter-container expanded">
      <div className="smart-filter-header">
        <div 
          className="smart-filter-title clickable" 
          onClick={() => !value && !audioBlob && setIsExpanded(false)}
          title="Minimizar filtro"
        >
          <span className="smart-label-text">Filtro Inteligente</span>
        </div>
        <div className="header-actions">
            <div className="smart-filter-badges">
                <span className="smart-badge">IA</span>
            </div>
        </div>
      </div>
      
      <div className="smart-filter-input-wrapper">
        {!audioBlob ? (
            <div className="textarea-container">
              <textarea
                  className="smart-filter-textarea"
                  placeholder="Describe tu cliente ideal (Ej: 'Empresas de logística con flota propia...')"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (value.trim()) {
                           if (onInterpret) handleInterpretationTrigger(value.trim());
                           else if (onSearch) onSearch();
                        }
                      }
                  }}
                  disabled={isRecording || isTranscribing || isInterpreting}
                  autoFocus
              />
              <div className="input-actions">
                  {!isRecording && value && value.trim().length > 0 && !interpretation && (
                      <button 
                          type="button" 
                          className="btn-icon-action submit"
                          onClick={() => {
                              if (onInterpret) handleInterpretationTrigger(value.trim());
                              else if (onSearch) onSearch();
                          }}
                          title="Analizar filtro (Enter)"
                      >
                          <FiArrowRight />
                      </button>
                  )}
                  {!isRecording ? (
                      <button 
                          type="button" 
                          className="btn-icon-action"
                          onClick={startRecording}
                          title="Grabar audio"
                          disabled={isTranscribing || isInterpreting}
                      >
                          <FiMic />
                      </button>
                  ) : (
                       <button 
                          type="button" 
                          className="btn-icon-action recording"
                          onClick={stopRecording}
                          title="Detener grabación"
                      >
                          <span className="recording-dot"></span>
                          <span className="timer">{formatTime(recordingTime)}</span>
                          <FiStopCircle />
                      </button>
                  )}
              </div>
            </div>
        ) : (
            <div className="audio-preview-compact">
                <audio 
                    ref={audioRef}
                    src={URL.createObjectURL(audioBlob)} 
                    onEnded={() => setIsPlaying(false)}
                    style={{ display: 'none' }}
                />
                
                <div className="audio-controls">
                    <button type="button" onClick={togglePlayback} className="btn-icon-round">
                        {isPlaying ? <FiPause /> : <FiPlay />}
                    </button>
                    <div className="audio-meta">
                        <span className="audio-label">Audio grabado</span>
                        <span className="audio-duration">{formatTime(recordingTime)}</span>
                    </div>
                </div>

                <div className="audio-actions-group">
                    <button 
                        type="button" 
                        onClick={handleTranscribeClick} 
                        className="btn-text-action" 
                        disabled={isTranscribing}
                    >
                        <FiFileText />
                        {isTranscribing ? 'Transcribiendo...' : 'Transcribir'}
                    </button>
                    <button type="button" onClick={clearAudio} className="btn-icon-action delete" title="Eliminar">
                        <FiTrash2 />
                    </button>
                </div>
            </div>
        )}

        {/* AI Interpretation UI */}
        {(isInterpreting || interpretation) && (
            <div className="interpretation-card">
                {isInterpreting ? (
                    <div className="ai-thinking">
                        <div className="ai-spinner"></div>
                        <span>Analizando tu solicitud...</span>
                    </div>
                ) : (
                    <div className="interpretation-content">
                        <div className="interpretation-text">
                            <strong>Entendido:</strong> {interpretation.interpretation_summary}
                        </div>
                        <div className="interpretation-actions">
                            <button 
                                className="btn-confirm"
                                onClick={() => {
                                    // Removed onSearch() call as requested - just accept the interpretation
                                    setInterpretation(null); 
                                }}
                                title="Confirmar"
                                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </button>
                            <button 
                                className="btn-cancel"
                                onClick={() => setInterpretation(null)}
                                title="Volver a intentar"
                                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', minWidth: '24px', minHeight: '24px' }}>
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default SmartFilterInput;

import { useState, useRef, useEffect, useCallback } from 'react';
import { aiService } from '../services/ai.service';
import { leadsService } from '../services/leads.service';
import { searchHistoryService } from '../lib/supabase';
import { API_URL } from '../config';

export function useLeads(user, toasts, fetchCredits) {
  const { success, error: toastError, warning, info } = toasts;

  const [loading, setLoading] = useState(false);
  const [blockingLoading, setBlockingLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [rubros, setRubros] = useState({});
  const [searchProgress, setSearchProgress] = useState({ percent: 0, message: '' });
  const [displayProgress, setDisplayProgress] = useState(0);

  const loadingIntervalRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const displayProgressRef = useRef(0);
  const currentTaskIdRef = useRef(null);

  useEffect(() => {
    displayProgressRef.current = displayProgress;
  }, [displayProgress]);

  const waitForVisualCompletion = async () => {
    let attempts = 0;
    while (displayProgressRef.current < 99 && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    await new Promise(r => setTimeout(r, 1000));
  };

  const loadRubros = useCallback(async () => {
    try {
      const data = await leadsService.getRubros();
      if (data && data.rubros) {
        setRubros(data.rubros);
      } else {
        setRubros({});
      }
    } catch (error) {
      console.error('Error al cargar rubros:', error);
      setRubros({});
    }
  }, []);

  const loadEmpresas = async (showError = true) => {
    try {
      setLoading(true);
      const data = await leadsService.getEmpresas();
      setEmpresas(data.data || []);
    } catch (err) {
      console.error('Error al cargar empresas:', err);
      if (showError) {
        toastError?.('Error al cargar empresas');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async (params, isFromHistory = false, onComplete = null) => {
    try {
      setLoading(true);
      setBlockingLoading(true);
      setSearchProgress({ percent: 0, message: 'Iniciando búsqueda...' });
      setDisplayProgress(0);
      setEmpresas([]); 

      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        if (loading) {
          setBlockingLoading(false);
          setLoading(false);
          toastError?.('Tiempo de espera agotado');
        }
      }, 120000); 

      const paramsWithUser = { ...params, user_id: user?.id };
      
      if (params.smart_filter_audio_blob) {
        try {
            setSearchProgress({ percent: 0, message: '🎙️ Transcribiendo audio...' });
            
            const formData = new FormData();
            formData.append('file', params.smart_filter_audio_blob);
            
            const transcribeData = await aiService.transcribeAudio(formData);
            
            if (transcribeData && transcribeData.text) {
                paramsWithUser.smart_filter_text = transcribeData.text;
                success(`Audio transcribido: "${transcribeData.text.substring(0, 30)}..."`);
            }
        } catch (audioErr) {
            console.error("Error transcribiendo audio:", audioErr);
            warning("No se pudo transcribir el audio. Se usará solo el texto.");
        }
        delete paramsWithUser.smart_filter_audio_blob;
      }

      const response = await fetch(`${API_URL}/api/buscar-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paramsWithUser),
      });

      setSearchProgress({ percent: 0, message: 'Iniciando búsqueda...' });
      setDisplayProgress(0);
      setEmpresas([]); 

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error en la búsqueda');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let accumulatedLeads = [];
      
      const processBuffer = (chunk) => {
        buffer += chunk;
        const parts = buffer.split('\n\n'); 
        buffer = parts.pop();

        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith('data: ')) {
            try {
              const eventPayload = JSON.parse(line.substring(6));
              if (eventPayload.type === 'status') {
                setSearchProgress(prev => ({ ...prev, message: eventPayload.message }));
                if (eventPayload.message.includes('Iniciando')) setDisplayProgress(5);
              } 
              else if (eventPayload.type === 'lead') {
                const exists = accumulatedLeads.some(e => e.google_id === eventPayload.data.google_id);
                if (!exists) accumulatedLeads.push(eventPayload.data);
                setDisplayProgress(prev => Math.min(prev + 0.3, 85));
              }
              else if (eventPayload.type === 'update') {
                accumulatedLeads = accumulatedLeads.map(e => 
                  e.google_id === eventPayload.data.google_id ? { ...e, ...eventPayload.data } : e
                );
              }
              else if (eventPayload.type === 'complete') {
                setEmpresas([...accumulatedLeads]);
                setSearchProgress({ percent: 100, message: '¡Búsqueda completada!' });
                setDisplayProgress(100);
              }
            } catch (e) {
              console.warn('Error parsing stream event:', e);
            }
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        processBuffer(decoder.decode(value, { stream: true }));
      }
      
      if (buffer.trim()) processBuffer('');

      setEmpresas([...accumulatedLeads]);
      setSearchProgress({ percent: 100, message: '¡Listo!' });
      await waitForVisualCompletion();
      
      if (user?.id && !isFromHistory) {
        setEmpresas(currentEmpresas => {
          if (currentEmpresas.length > 0) {
            searchHistoryService.saveSearch(user.id, {
              rubro: params.rubro,
              ubicacion_nombre: params.busqueda_ubicacion_nombre,
              centro_lat: params.busqueda_centro_lat,
              centro_lng: params.busqueda_centro_lng,
              radio_km: params.busqueda_radio_km,
              bbox: params.bbox,
              empresas_encontradas: currentEmpresas.length,
              empresas_validas: currentEmpresas.filter(e => e.email || e.telefono).length
            }).catch(e => console.warn('Error historial:', e));
          }
          return currentEmpresas;
        });
      }

      if (onComplete) onComplete();
      if (fetchCredits) fetchCredits(); 
      success("Búsqueda completada con éxito");

    } catch (err) {
      console.error('Error en búsqueda stream:', err);
      toastError?.(err.message || "Error en la búsqueda");
    } finally {
      setBlockingLoading(false);
      setLoading(false);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    }
  };

  const handleCancelSearch = () => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setLoading(false);
    setBlockingLoading(false);
    setSearchProgress({ percent: 0, message: '' });
    setDisplayProgress(0);
    info("Búsqueda cancelada");
  };

  return {
    empresas, setEmpresas,
    rubros, loadRubros,
    loading, setLoading,
    blockingLoading, setBlockingLoading,
    searchProgress, setSearchProgress,
    displayProgress, setDisplayProgress,
    loadEmpresas,
    handleBuscar,
    handleCancelSearch
  };
}

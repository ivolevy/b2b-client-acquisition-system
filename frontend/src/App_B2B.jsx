import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar';
import FiltersB2B from './components/FiltersB2B';
import TableViewB2B from './components/TableViewB2B';
import EmailSender from './components/EmailSender';
import WhatsAppSender from './components/WhatsAppSender';
import TemplateEditor from './components/TemplateEditor';
import TemplateManager from './components/TemplateManager';
import UserProfile from './components/UserProfile';
import ToastContainer from './components/ToastContainer';
import ProBackground from './components/ProBackground';
import OfflineView from './components/OfflineView';
import Communications from './components/Communications';
import InsightsDashboard from './components/Insights';
import AIAssistant from './components/AIAssistant';
import { Fab, Tooltip, Zoom } from '@mui/material';
import { Face as FaceIcon } from '@mui/icons-material';
const AdminPayments = React.lazy(() => import('./components/admin/AdminPayments'));
import { ToastContainer as ReactToastifyContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from './hooks/useToast';
import { useAuth } from './context/AuthContext';
import { searchHistoryService } from './lib/supabase';
import { API_URL } from './config';
import './App.css';
import './components/TableView.css';

function AppB2B() {
  const location = useLocation();
  const navigate = useNavigate();
  // Estados de carga
  const [loading, setLoading] = useState(false);
  const [blockingLoading, setBlockingLoading] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  
  // Estados de datos
  const [empresas, setEmpresas] = useState([]);
  const [stats, setStats] = useState(null);
  const [rubros, setRubros] = useState({});
  const [creditsInfo, setCreditsInfo] = useState({ credits: 0, total_credits: 0, next_reset: null });
  
  // UI States
  const [searchProgress, setSearchProgress] = useState({ percent: 0, message: '' });
  const [displayProgress, setDisplayProgress] = useState(0); 
  const [showEmailSender, setShowEmailSender] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [historySearchData, setHistorySearchData] = useState(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false);
  const [showGlobalAi, setShowGlobalAi] = useState(false);

  // Determinar la vista basada en la ruta
  const isProfilePage = location.pathname === '/profile';
  const [view, setView] = useState(isProfilePage ? 'profile' : 'table');

  const { toasts, success, error: toastError, warning, info, removeToast } = useToast();
  const { user } = useAuth();
  const loadingIntervalRef = useRef(null);
  const loadingTimeoutRef = useRef(null); 

  const fetchCredits = async () => {
    if (!user?.id) return;
    setCreditsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/users/${user.id}/credits?_t=${Date.now()}`);
      if (response.data) {
        setCreditsInfo(response.data);
      }
    } catch (error) {
      console.error('Error fetching credits in AppB2B:', error);
    } finally {
      setCreditsLoading(false);
    }
  };

  const loadRubros = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rubros`);
      if (response.data && response.data.rubros) {
        setRubros(response.data.rubros);
      } else {
        setRubros({});
      }
    } catch (error) {
      console.error('Error al cargar rubros:', error);
      setRubros({});
    }
  };

  const loadEmpresas = async (showError = true) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/empresas`);
      setEmpresas(response.data.data || []);
    } catch (err) {
      console.error('Error al cargar empresas:', err);
      if (showError) {
        const errorMsg = err.response?.data?.detail || err.message;
        if (err.code === 'ERR_NETWORK' || err.response?.status >= 500) {
          toastError("Error al cargar empresas");
        }
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Sincronizar vista con la ruta cuando cambia
  useEffect(() => {
    // Limpiar estados de carga inmediatamente al cambiar de ruta (incluyendo admin)
    setLoading(false);
    setBlockingLoading(false);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    
    // Si está en admin o backoffice, no hacer nada más
    if (location.pathname.startsWith('/backoffice') || location.pathname.startsWith('/admin')) {
      return;
    }
    
    if (location.pathname === '/profile') {
      setView('profile');
    } else if (view === 'profile') {
      setView('table');
      // Refrescar rubros al volver del perfil por si hubo cambios
      loadRubros();
    }
    
    // Fetch credits whenever ID is available
    if (user?.id) {
      fetchCredits();
    }
  }, [location.pathname, view, user?.id]);

  

  // Manejar feedback de Gmail OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const gmailStatus = params.get('gmail');
    const outlookStatus = params.get('outlook');
    
    if (gmailStatus === 'success') {
      success("Gmail conectado correctamente.");
      navigate('/', { replace: true });
    } else if (gmailStatus === 'error') {
      const reason = params.get('reason');
      toastError("Error al conectar Gmail");
      navigate('/', { replace: true });
    }

    if (outlookStatus === 'success') {
      success("Outlook conectado correctamente.");
      navigate('/', { replace: true });
    } else if (outlookStatus === 'error') {
      const reason = params.get('reason');
      toastError("Error al conectar Outlook");
      navigate('/', { replace: true });
    }
  }, [location.search, navigate, success, toastError]);

  // Efecto para interpolar el progreso visual suavemente
  useEffect(() => {
    if (!blockingLoading) {
      setDisplayProgress(0);
      return;
    }

    const target = searchProgress.percent;
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        // Definir un objetivo efectivo
        // Si estamos en fase inicial (buscando en OSM, <= 15%), aplicamos "creep" para dar feedback visual
        // Si ya estamos validando (> 15%), confiamos en el backend que ahora es granular
        let effectiveTarget = target;
        if (target <= 15) {
           // Fase inicial: simulamos avance hasta 45% mientras busca
           effectiveTarget = Math.max(target, Math.min(prev + 0.5, 45));
        }

        // Si ya llegamos al target real y es 100, fin.
        if (prev >= 100) return 100;
        
        // Calcular velocidad
        // Si es final (100%), disparo rápido
        let speedFactor = target === 100 ? 0.3 : 0.05;
        let step = (effectiveTarget - prev) * speedFactor;
        
        // Ajustes finos de velocidad
        if (target === 100) {
            // Modo disparo: mínimo avance grande
            if (step < 1.0) step = 1.2; 
            // Máximo muy grande
            if (step > 15.0) step = 15.0;
        } else {
            // Modo normal/creep - Reducido para que sea menos agresivo
            if (step < 0.02) step = 0.02;
            if (step > 1.5) step = 1.5; 
        }

        return Math.max(prev, Math.min(prev + step, effectiveTarget)); 
      });
    }, 50);

    return () => clearInterval(interval);
  }, [searchProgress.percent, blockingLoading]);

  useEffect(() => {
    // Intentar recuperar estado del sessionStorage al montar
    const cachedEmpresas = sessionStorage.getItem('b2b_empresas_cache');
    const cachedStats = sessionStorage.getItem('b2b_stats_cache');
    
    if (cachedEmpresas) {
      try {
        setEmpresas(JSON.parse(cachedEmpresas));
      } catch (e) {
        console.error('Error parsing cached empresas', e);
      }
    }
    
    if (cachedStats) {
      try {
        setStats(JSON.parse(cachedStats));
      } catch (e) {
        console.error('Error parsing cached stats', e);
      }
    }

    // No cargar empresas automáticamente de la API si ya recuperamos del cache o si no es necesario
    // Solo cargar estadísticas frescas si no hay cacheadas o para actualizar
    if (!cachedStats) {
      // loadStats();
    }
    loadRubros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Ejecutar al montar y cuando el usuario esté listo

  // Persistir estado en sessionStorage cuando cambia
  useEffect(() => {
    if (empresas.length > 0) {
      sessionStorage.setItem('b2b_empresas_cache', JSON.stringify(empresas));
    }
  }, [empresas]);

  // Scroll lock when searching
  useEffect(() => {
    if (blockingLoading) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh'; // Prevent layout shifts
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
      // Limpiar timeout si se apaga manualmente
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [blockingLoading]);

  // Auto-scroll to results when search finishes
  const resultsRef = useRef(null);
  
  // Ref para rastrear si acabamos de terminar una carga
  const prevLoadingRef = useRef(loading);

  useEffect(() => {
    // Si estaba cargando y ahora no, y tenemos empresas, scrollear
    if (prevLoadingRef.current && !loading && empresas.length > 0 && !isFromHistory) {
      // Pequeño timeout para asegurar que el DOM se renderizó
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
    prevLoadingRef.current = loading;
  }, [loading, empresas.length, isFromHistory]);

  useEffect(() => {
    if (stats) {
      sessionStorage.setItem('b2b_stats_cache', JSON.stringify(stats));
    }
  }, [stats]);
  
  // Manejar selección desde historial de búsquedas
  const handleSelectFromHistory = (searchData) => {
    setIsFromHistory(true);
    setHistorySearchData(searchData);
      info("Búsqueda cargada del historial");
  };


  const loadStats = async () => {
    // Stats disabled per user request
  };

  /* ----------------------------------------------------------------------------------
   * REF PARA SEGUIR EL PROGRESO VISUAL DENTRO DE FUNCIONES ASÍNCRONAS
   * ---------------------------------------------------------------------------------- */
  const displayProgressRef = useRef(0);

  // Mantener el ref sincronizado con el estado visual
  useEffect(() => {
    displayProgressRef.current = displayProgress;
  }, [displayProgress]);

  // Ref para trackear el taskId actual y evitar race conditions
  const currentTaskIdRef = useRef(null);
  
  // Función para esperar a que la barra llegue visualmente al 100%
  const waitForVisualCompletion = async () => {
    // Esperar hasta que la barra esté casi llena (>99%)
    // Timeout de seguridad de 5s por si acaso
    let attempts = 0;
    while (displayProgressRef.current < 99 && attempts < 50) {
      await new Promise(r => setTimeout(r, 100)); // Chequear cada 100ms
      attempts++;
    }
    // Una vez que llegó al 100%, esperar 1 segundo extra para que el usuario lo registre
    await new Promise(r => setTimeout(r, 1000));
  };


  /* ----------------------------------------------------------------------------------
   * MANEJO DE BUSQUEDA
   * ---------------------------------------------------------------------------------- */
  const handleBuscar = async (params) => {
    try {
      setLoading(true);
      setBlockingLoading(true);
      setSearchProgress({ percent: 0, message: 'Iniciando búsqueda...' });
      setDisplayProgress(0);
      setEmpresas([]); 

      // Timeout de seguridad
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        if (loading) {
          setBlockingLoading(false);
          setLoading(false);
          toastError?.('Tiempo de espera agotado');
        }
      }, 120000); 

      const paramsWithUser = { ...params, user_id: user?.id };
      
      // Manejo de Audio para Smart Filter
      if (params.smart_filter_audio_blob) {
        try {
            setSearchProgress({ percent: 0, message: '🎙️ Transcribiendo audio...' });
            
            const formData = new FormData();
            formData.append('file', params.smart_filter_audio_blob);
            
            const transcribeResponse = await axios.post(`${API_URL}/api/ai/transcribe`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (transcribeResponse.data && transcribeResponse.data.text) {
                // Actualizar el texto del filtro con la transcripción
                paramsWithUser.smart_filter_text = transcribeResponse.data.text;
                success(`Audio transcribido: "${transcribeResponse.data.text.substring(0, 30)}..."`);
            }
        } catch (audioErr) {
            console.error("Error transcribiendo audio:", audioErr);
            warning("No se pudo transcribir el audio. Se usará solo el texto.");
        }
        // Limpiar el blob para no enviarlo al endpoint de búsqueda
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
      
      // Procesar cualquier resto en el buffer al cerrar
      if (buffer.trim()) processBuffer('');

      // Garantía final de visualización
      setEmpresas([...accumulatedLeads]);

      // Finalización
      setSearchProgress({ percent: 100, message: '¡Listo!' });
      await waitForVisualCompletion();
      
      if (user?.id && !isFromHistory) {
        // Guardar en historial al finalizar (usamos el estado actual)
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

      // Limpiar estados de búsqueda del historial
      if (isFromHistory) {
        setIsFromHistory(false);
        setHistorySearchData(null);
      }

      fetchCredits(); // Actualizar créditos al finalizar
      success("Búsqueda completada con éxito");

    } catch (err) {
      console.error('Error en búsqueda stream:', err);
      toastError(err.message || "Error en la búsqueda");
    } finally {
      setBlockingLoading(false);
      setLoading(false);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    }
  };

  const handleCancelSearch = () => {
    // 1. Limpiar intervalo de polling y timeout
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    // 2. Resetear estados de carga y progreso
    setLoading(false);
    setBlockingLoading(false);
    setSearchProgress({ percent: 0, message: '' });
    setDisplayProgress(0);

    // 3. Notificar al usuario (opcional, o simplemente cerrar silenciosamente)
    info("Búsqueda cancelada");
  };


  const handleExportCSV = async () => {
    try {
      const response = await axios.post(`${API_URL}/exportar`, {
        formato: 'csv',
        solo_validas: true,
        user_id: user?.id
      });
      
      if (response.data.success) {
        success("Archivo exportado");
      }
    } catch (err) {
      console.error('Error al exportar:', err);
      const errorMsg = err.response?.data?.detail || err.message;
      toastError("Error al exportar");
    }
  };

  const exportToCSVFrontend = (empresasToExport = empresas) => {
    if (empresasToExport.length === 0) {
      warning("Sin datos para exportar");
      return;
    }

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '""';
      // Limpiar saltos de línea y tabulaciones que rompen el CSV
      const stringValue = String(value).replace(/[\r\n\t]+/g, ' ').trim();
      // Siempre encapsular en comillas dobles y escapar comillas internas
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const formatDate = (dateString) => {
      if (!dateString) return '""';
      try {
        const date = new Date(dateString);
        return `"${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}"`;
      } catch (e) {
        return `"${dateString}"`;
      }
    };

    const headers = [
      'Nombre Empresa',
      'Rubro',
      'Sitio Web',
      'Email',
      'Teléfono',
      'Dirección',
      'Ciudad',
      'Código Postal',
      'País',
      'Instagram',
      'Facebook',
      'LinkedIn',
      'Distancia (km)'
    ];

    const rows = empresasToExport.map(e => [
      e.nombre || '',
      (rubros && rubros[e.rubro]) ? rubros[e.rubro] : (e.rubro || ''),
      e.sitio_web || e.website || '',
      e.email || '',
      e.telefono || '',
      e.direccion || '',
      e.ciudad || '',
      e.codigo_postal || '',
      e.pais || '',
      e.instagram || '',
      e.facebook || '',
      e.linkedin || '',
      e.distancia_km !== null ? e.distancia_km.toFixed(2) : ''
    ]);

    const separator = ';';
    const csvContent = [
      headers.map(h => `"${h}"`).join(separator),
      ...rows.map(row => row.map(escapeCSV).join(separator))
    ].join('\r\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Nombre de archivo con fecha legible
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    link.setAttribute('href', url);
    link.setAttribute('download', `Smart_Leads_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    success("Archivo exportado");
  };

  const handleExportPDF = (empresasToExport = empresas) => {
    if (empresasToExport.length === 0) {
      warning("Sin datos para exportar");
      return;
    }

    try {
      // Landscape orientation for better fit
      const doc = new jsPDF({ orientation: 'landscape' });
      
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const filename = `Smart_Leads_${timestamp}.pdf`;

      // Título
      doc.setFontSize(18);
      doc.text('Reporte de Smart Leads', 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado el: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 14, 22);
      
      doc.setFontSize(9);
      doc.setTextColor(233, 30, 99); // Color pink del tema
      doc.text('Para más información contactar a Ivan Levy - CTO de Dota', 14, 28);
      doc.text('LinkedIn: https://www.linkedin.com/in/ivan-levy/ | Email: ivo.levy03@gmail.com', 14, 33);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Total empresas: ${empresasToExport.length}`, 260, 22, { align: 'right' });

      // Columnas para PDF (más columnas aprovechando landscape)
      const tableHead = [['Empresa', 'Rubro', 'Web', 'Email', 'Teléfono', 'Ubicación']];
      
      const tableRows = empresasToExport.map(empresa => [
        empresa.nombre || '',
        (rubros && rubros[empresa.rubro]) ? rubros[empresa.rubro] : (empresa.rubro || ''),
        empresa.sitio_web || empresa.website || '',
        empresa.email || '',
        empresa.telefono || '',
        empresa.direccion || [empresa.ciudad, empresa.pais].filter(Boolean).join(', ') || ''
      ]);

      autoTable(doc, {
        head: tableHead,
        body: tableRows,
        startY: 38,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 45 }, // Nombre
          1: { cellWidth: 35 }, // Rubro
          2: { cellWidth: 50 }, // Web
          3: { cellWidth: 55 }, // Email
          4: { cellWidth: 35 }, // Telefono
          5: { cellWidth: 40 }  // Ubicacion
        },
        headStyles: { fillColor: [233, 30, 99] }, // Pink color matching theme
        alternateRowStyles: { fillColor: [245, 245, 245] },
        theme: 'grid'
      });

      doc.save(filename);

      success("Archivo exportado");
    } catch (err) {
      console.error('Error generando PDF:', err);
       toastError("Error al generar PDF");
    }
  };

  const handleDeleteResults = () => {
    // Solo limpiar estado local, no borrar de la BD
    setEmpresas([]);
    setStats({ total: 0, validadas: 0 });
    // Limpiar también sessionStorage
    sessionStorage.removeItem('b2b_empresas_cache');
    sessionStorage.removeItem('b2b_stats_cache');
    success("Resultados limpiados: Vista reiniciada.");
  };

  // Connectivity State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="app pro-theme">
      {!isOnline && <OfflineView />}
      <ProBackground />
      
      <Navbar creditsInfo={creditsInfo} />
      
      <main className="main-content">
          <FiltersB2B 
            onBuscar={handleBuscar}
            loading={loading}
            rubros={rubros}
            toastWarning={warning}
            onSelectFromHistory={handleSelectFromHistory}
            historySearchData={historySearchData}
          />
          
          {/* El overlay bloqueante se muestra abajo si blockingLoading es true */}
          {blockingLoading && (
            <div className="loading-overlay">
              <div className="loading-progress-container">
                <div className="progress-info">
                  <span>Buscando prospectos...</span>
                  <span className="progress-percentage">{Math.round(displayProgress)}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${Math.min(displayProgress, 100)}%` }}
                  ></div>
                </div>
                <p className="loading-message">{searchProgress.message}</p>
                
                <button 
                  onClick={handleCancelSearch}
                  className="btn-cancel-search"
                  style={{
                    marginTop: '15px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    backdropFilter: 'blur(5px)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.target.style.background = 'transparent'}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Toggle de navegación Tabla/Emails */}
          <div className={`view-toggle-container ${view === 'communications' ? 'connected-header' : ''}`}>
            <div className="view-toggle-inline">
              <button 
                type="button"
                className={view === 'table' ? 'active' : ''}
                onClick={() => {
                  navigate('/');
                  setView('table');
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
                Tabla
              </button>
              <button 
                type="button"
                className={view === 'emails' ? 'active' : ''}
                onClick={() => setView('emails')}
              >
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Emails
              </button>
              <button 
                type="button"
                className={view === 'whatsapp' ? 'active' : ''}
                onClick={() => setView('whatsapp')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                WhatsApp
              </button>
              <button 
                type="button"
                className={view === 'communications' ? 'active' : ''}
                onClick={() => setView('communications')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Leads
              </button>
              <button 
                type="button"
                className={view === 'insights' ? 'active' : ''}
                onClick={() => {
                  // Bloqueado temporalmente
                  info("El módulo de Insights estará disponible próximamente.");
                }}
                style={{ cursor: 'not-allowed', position: 'relative' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <path d="M3 3v18h18"/>
                   <path d="M18 9l-6 6-2-2-4 4"/>
                </svg>
                Insights
                <span style={{ 
                  fontSize: '10px', 
                  background: '#e2e8f0', 
                  color: '#64748b', 
                  padding: '2px 6px', 
                  borderRadius: '10px',
                  fontWeight: '800',
                  marginLeft: '4px'
                }}>PRÓXIMAMENTE</span>
              </button>
            </div>
          </div>

          {view === 'insights' && (
             <InsightsDashboard />
          )}

          {view === 'table' && (
            <TableViewB2B 
              empresas={empresas}
              showAllResults={showAllResults}
              rubros={rubros}
              view={view}
              setView={setView}
              onExportCSV={exportToCSVFrontend}
              onExportPDF={handleExportPDF}
              onDeleteResults={handleDeleteResults}
              loading={loading}
              toastWarning={warning}
            />
          )}
          
          {view === 'emails' && (
            <EmailSender
              empresas={empresas}
              onClose={() => {
                navigate('/');
                setView('table');
              }}
              embedded={true}
              toastSuccess={success}
              toastError={toastError}
              toastWarning={warning}
              toastInfo={info}
            />
          )}
          
          {view === 'whatsapp' && (
            <WhatsAppSender
              empresas={empresas}
              onClose={() => {
                navigate('/');
                setView('table');
              }}
              embedded={true}
              toastSuccess={success}
              toastError={toastError}
              toastWarning={warning}
              toastInfo={info}
            />
          )}

          {view === 'communications' && (
            <Communications 
              onOpenAi={() => setShowGlobalAi(true)}
              onClose={() => {
                navigate('/');
                setView('table');
              }}
            />
          )}
        </main>

      {showEmailSender && (
        <EmailSender
          empresas={empresas}
          onClose={() => setShowEmailSender(false)}
          toastSuccess={success}
          toastError={toastError}
          toastWarning={warning}
          toastInfo={info}
        />
      )}

      {showTemplateManager && (
        <TemplateManager
          onClose={() => setShowTemplateManager(false)}
        />
      )}

      {/* Floating AI Assistant Button */}
      {!isProfilePage && (
        <Zoom in={true} style={{ transitionDelay: '500ms' }}>
          <Tooltip title="Preguntar a la IA" placement="left">
            <Fab 
              onClick={() => setShowGlobalAi(true)}
              sx={{ 
                position: 'fixed', 
                bottom: 30, 
                right: 30, 
                bgcolor: '#ffffff',
                color: '#3b82f6',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
                zIndex: 1100, // Debajo del drawer de comunicaciones si fuera necesario, pero este es global
                '&:hover': {
                  bgcolor: '#2563eb',
                  transform: 'scale(1.1) rotate(5deg)',
                  boxShadow: '0 10px 30px rgba(59, 130, 246, 0.5)',
                },
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              <FaceIcon />
            </Fab>
          </Tooltip>
        </Zoom>
      )}

      {/* Global AI Assistant Drawer */}
      <AIAssistant 
        open={showGlobalAi} 
        onClose={() => setShowGlobalAi(false)} 
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ReactToastifyContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
      
      {/* Eliminado badge PRO flotante */}
    </div>
  );
}

export default AppB2B;


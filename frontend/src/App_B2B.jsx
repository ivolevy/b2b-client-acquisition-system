import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar';
import FiltersB2B from './components/FiltersB2B';
import TableViewB2B from './components/TableViewB2B';
import EmailSender from './components/EmailSender';
import TemplateEditor from './components/TemplateEditor';
import TemplateManager from './components/TemplateManager';
import UserProfile from './components/UserProfile';
import ToastContainer from './components/ToastContainer';
import ProBackground from './components/ProBackground';
import { ToastContainer as ReactToastifyContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from './hooks/useToast';
import { useAuth } from './AuthWrapper';
import { searchHistoryService } from './lib/supabase';
import { API_URL } from './config';
import './App.css';
import './components/TableView.css';

function AppB2B() {
  const location = useLocation();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [blockingLoading, setBlockingLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState({ percent: 0, message: '' });
  const [displayProgress, setDisplayProgress] = useState(0); // Para animación suave
  const loadingIntervalRef = useRef(null);
  const loadingTimeoutRef = useRef(null); // Timeout de seguridad 

  
  // Determinar la vista basada en la ruta
  const isProfilePage = location.pathname === '/profile';
  const [view, setView] = useState(isProfilePage ? 'profile' : 'table');
  
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
  }, [location.pathname, view]);
  const [stats, setStats] = useState(null);
  const [rubros, setRubros] = useState({});
  const [showEmailSender, setShowEmailSender] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState({ credits: 0, next_reset: null });
  const [creditsLoading, setCreditsLoading] = useState(false);
  
  const { toasts, success, error: toastError, warning, info, removeToast } = useToast();
  const { user } = useAuth();
  

  const [historySearchData, setHistorySearchData] = useState(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false);

  // Manejar feedback de Gmail OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const gmailStatus = params.get('gmail');
    const outlookStatus = params.get('outlook');
    
    if (gmailStatus === 'success') {
      success("✓ Gmail conectado correctamente. Ya podés enviar correos.");
      navigate('/', { replace: true });
    } else if (gmailStatus === 'error') {
      const reason = params.get('reason');
      toastError(`✗ Error al conectar con Gmail: ${reason || 'Error desconocido'}`);
      navigate('/', { replace: true });
    }

    if (outlookStatus === 'success') {
      success("✓ Outlook conectado correctamente. Ya podés enviar correos.");
      navigate('/', { replace: true });
    } else if (outlookStatus === 'error') {
      const reason = params.get('reason');
      toastError(`✗ Error al conectar con Outlook: ${reason || 'Error desconocido'}`);
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
    info(
      <>
        <strong>Búsqueda cargada</strong>
        <p>Se cargó "{searchData.rubro}" - {searchData.ubicacion_nombre || 'ubicación personalizada'}</p>
      </>
    );
  };

  const loadRubros = async () => {
    try {
      // Cargar siempre TODOS los rubros disponibles (comportamiento original)
      const response = await axios.get(`${API_URL}/rubros`);
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
      const response = await axios.get(`${API_URL}/empresas`);
      setEmpresas(response.data.data || []);
    } catch (err) {
      console.error('Error al cargar empresas:', err);
      // Solo mostrar error si se solicita explícitamente (por ejemplo, después de una búsqueda)
      // No mostrar error si simplemente no hay empresas en memoria
      if (showError) {
      const errorMsg = err.response?.data?.detail || err.message;
        // Solo mostrar error si es un error de red real, no si simplemente no hay empresas
        if (err.code === 'ERR_NETWORK' || err.response?.status >= 500) {
      toastError(
        <>
          <strong>No se pudieron cargar las empresas</strong>
          <p>{errorMsg}</p>
        </>
      );
        }
      }
    } finally {
      setLoading(false);
    }
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

      // Seguridad: Timeout de 60 segundos por si el socket/poll fallan catastróficamente
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        if (blockingLoading || loading) {
          console.warn('Safety timeout reached for search loading');
          setBlockingLoading(false);
          setLoading(false);
          toastError?.('La búsqueda está tardando más de lo esperado. Se canceló la espera visual, pero los resultados podrían aparecer en breve.');
        }
      }, 60000); 

      
      // Generar Task ID único para tracking
      const taskId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Iniciar polling de progreso
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      
      // Ref para trackear el taskId actual y evitar race conditions
      currentTaskIdRef.current = taskId;
      
      loadingIntervalRef.current = setInterval(async () => {
        try {
          const progressRes = await axios.get(`${API_URL}/buscar/progreso/${taskId}`);
          
          // Verificar si seguimos en la misma tarea
          if (currentTaskIdRef.current !== taskId) return;
          if (!loadingIntervalRef.current) return;

          if (progressRes.data) {
            setSearchProgress(prev => {
              const newPercent = progressRes.data.progress || 0;
              // Evitar retrocesos: solo actualizar si es mayor o igual, 
              // a menos que sea 0 y el anterior sea muy alto (lo cual sería raro en misma task)
              // Mejor estrategia: Nunca bajar del máximo alcanzado en esta sesión de polling
              if (newPercent < prev.percent) {
                return prev; 
              }
              return {
                percent: newPercent,
                message: progressRes.data.message || 'Procesando...'
              };
            });
          }
        } catch (e) {
          console.warn('Error polling progress:', e);
        }
      }, 200);

      const paramsWithTask = { ...params, task_id: taskId, user_id: user?.id };
      const response = await axios.post(`${API_URL}/buscar`, paramsWithTask);
      
      // Detener polling
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
      setSearchProgress({ percent: 100, message: '¡Listo!' });
      
      // ESPERAR A QUE LA BARRA LLEGUE VISUALMENTE AL 100% + RETRASO
      await waitForVisualCompletion();
      
      if (response.data.success) {
        const validas = response.data.validas || 0;
        const total = response.data.total_encontradas || 0;
        const guardadas = response.data.guardadas || 0;
        const empresasEncontradas = response.data.data || [];

        // Guardar búsqueda en historial si es PRO (en background, sin bloquear)
        // NO guardar si viene del historial para evitar duplicados
        if (user?.id && total > 0 && !isFromHistory) {
          // Ejecutar en background sin await para no bloquear la UI
          searchHistoryService.saveSearch(user.id, {
            rubro: params.rubro,
            ubicacion_nombre: params.busqueda_ubicacion_nombre,
            centro_lat: params.busqueda_centro_lat,
            centro_lng: params.busqueda_centro_lng,
            radio_km: params.busqueda_radio_km,
            bbox: params.bbox,
            empresas_encontradas: total,
            empresas_validas: validas
          }).then(({ data, error }) => {
            if (error) console.warn('Historial no guardado:', error.message);
            else console.log('Historial guardado:', data?.id);
          }).catch(e => console.warn('Error historial:', e));
        }
        
        // Resetear flag después de la búsqueda satisfactoria
        if (isFromHistory) {
          setIsFromHistory(false);
          setHistorySearchData(null); // Limpiar para que FiltersB2B sepa que terminó
        }
        
        if (total === 0) {
          warning(
            <>
              <strong>No se encontraron empresas en esa área</strong>
              <ul>
                <li>Aumentar el radio de búsqueda</li>
                <li>Elegir otra ubicación</li>
                <li>Probar otro rubro</li>
              </ul>
            </>
          );
        } else if (validas === 0 && params.solo_validadas) {
          warning(
            <>
              <strong>Se encontraron {total} prospectos brutos</strong>
              <p>Ninguno cumple los criterios de contacto verificado.</p>
              <p>Desmarca "Solo empresas con email..." para ver resultados con datos parciales.</p>
            </>
          );
        } else {
          const descartadas = total - guardadas;
          
          if (params.solo_validadas) {
             success(
               <>
                 <strong>Resultados de la búsqueda</strong>
                 <p><strong>{guardadas} empresas guardadas</strong> (de {total} rastro)</p>
                 <p style={{ marginTop: '4px' }}>✓ 100% con contacto verificado</p>
               </>
             );
          } else {
             success(
               <>
                 <strong>Resultados de la búsqueda</strong>
                 <p><strong>{guardadas} empresas guardadas</strong> de {total} detectadas</p>
                 <ul style={{ margin: '8px 0 0 0', paddingLeft: '15px' }}>
                    <li>{validas} con contacto verificado</li>
                    <li>{guardadas - validas} con datos básicos</li>
                    {descartadas > 0 && (
                        <li style={{ opacity: 0.75 }}>{descartadas} descartadas (fuera de radio / sin nombre)</li>
                    )}
                 </ul>
               </>
             );
          }
        }
        
        // Actualizar la vista con los resultados encontrados inmediatamente
        setEmpresas(empresasEncontradas);
        
        // Actualizamos las estadísticas en background
        loadStats();
        
        console.log('Búsqueda completada exitosamente. Resultados en pantalla:', empresasEncontradas.length);
        
        // NO llamamos a loadEmpresas(false) inmediatamente para evitar race conditions
        // que puedan sobreescribir los resultados recién obtenidos si el servidor
        // aún está persistiendo en la base de datos física.
        // setEmpresas(empresasEncontradas) ya es suficiente para la UI.
      }

    } catch (err) {
      console.error('Error al buscar empresas:', err);
      const errorMsg = err.response?.data?.detail || err.message;
      
      // Si fue cancelado manualmente, no mostrar error
      if (err.message === 'Canceled') return;

      toastError(
        <>
          <strong>Error al buscar empresas</strong>
          <p>{errorMsg}</p>
        </>
      );
    } finally {
      // Limpiar estados y polling
      setBlockingLoading(false);
      setLoading(false);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
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
    info("Búsqueda cancelada por el usuario");
  };


  const handleExportCSV = async () => {
    try {
      const response = await axios.post(`${API_URL}/exportar`, {
        formato: 'csv',
        solo_validas: true,
        user_id: user?.id
      });
      
      if (response.data.success) {
        success(
          <>
            <strong>Exportación backend lista</strong>
            <p>Archivo generado: {response.data.archivo}</p>
          </>
        );
      }
    } catch (err) {
      console.error('Error al exportar:', err);
      const errorMsg = err.response?.data?.detail || err.message;
      toastError(
        <>
          <strong>Error al exportar datos</strong>
          <p>{errorMsg}</p>
        </>
      );
    }
  };

  const exportToCSVFrontend = (empresasToExport = empresas) => {
    if (empresasToExport.length === 0) {
      warning(
        <>
          <strong>No hay datos para exportar</strong>
          <p>Realiza una búsqueda o quita filtros antes de exportar.</p>
        </>
      );
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
      'Twitter',
      'YouTube',
      'TikTok',
      'Distancia (km)',
      'Latitud',
      'Longitud',
      'Fecha Captura'
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
      e.twitter || '',
      e.youtube || '',
      e.tiktok || '',
      e.distancia_km !== null ? e.distancia_km.toFixed(2) : '',
      e.latitud || '',
      e.longitud || '',
      e.created_at || e.fecha_creacion || e.fecha_registro || new Date().toISOString()
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
    
    success(
      <>
        <strong>Exportación completada</strong>
        <p>Se exportaron {empresasToExport.length} empresas.</p>
      </>
    );
  };

  const handleExportPDF = (empresasToExport = empresas) => {
    if (empresasToExport.length === 0) {
      warning(
        <>
          <strong>No hay datos para exportar</strong>
          <p>Realiza una búsqueda o quita filtros antes de exportar.</p>
        </>
      );
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
      const tableHead = [['Empresa', 'Rubro', 'Web', 'Email', 'Teléfono', 'Ubicación', 'Estado']];
      
      const tableRows = empresasToExport.map(empresa => [
        empresa.nombre || '',
        (rubros && rubros[empresa.rubro]) ? rubros[empresa.rubro] : (empresa.rubro || ''),
        empresa.sitio_web || empresa.website || '',
        empresa.email || '',
        empresa.telefono || '',
        empresa.direccion || [empresa.ciudad, empresa.pais].filter(Boolean).join(', ') || '',
        empresa.validada ? 'Validada' : 'Pendiente'
      ]);

      autoTable(doc, {
        head: tableHead,
        body: tableRows,
        startY: 38,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 45 }, // Nombre
          1: { cellWidth: 35 }, // Rubro
          2: { cellWidth: 40 }, // Web
          3: { cellWidth: 45 }, // Email
          4: { cellWidth: 35 }, // Telefono
          5: { cellWidth: 40 }, // Ubicacion
          6: { cellWidth: 20 }  // Estado
        },
        headStyles: { fillColor: [233, 30, 99] }, // Pink color matching theme
        alternateRowStyles: { fillColor: [245, 245, 245] },
        theme: 'grid'
      });

      doc.save(filename);

      success(
        <>
          <strong>Exportación PDF completada</strong>
          <p>Se generó el archivo {filename}</p>
        </>
      );
    } catch (err) {
      console.error('Error generando PDF:', err);
       toastError(
        <>
          <strong>Error al generar PDF</strong>
          <p>{err.message}</p>
        </>
      );
    }
  };

  const handleDeleteResults = () => {
    // Solo limpiar estado local, no borrar de la BD
    setEmpresas([]);
    setStats({ total: 0, validadas: 0 });
    // Limpiar también sessionStorage
    sessionStorage.removeItem('b2b_empresas_cache');
    sessionStorage.removeItem('b2b_stats_cache');
    success(
      <>
        <strong>Resultados limpiados</strong>
        <p>Tu vista ha sido reiniciada.</p>
      </>
    );
  };

  return (
    <div className="app pro-theme">
      <ProBackground />
      
      <Navbar />
      
      <main className="main-content">
          <FiltersB2B 
            onBuscar={handleBuscar}
            loading={loading}
            rubros={rubros}
            toastWarning={warning}
            onSelectFromHistory={handleSelectFromHistory}
            historySearchData={historySearchData}
          />
          
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
          <div className="view-toggle-container">
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
            </div>
          </div>

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
            />
          )}
      </main>

      {showEmailSender && (
        <EmailSender
          empresas={empresas}
          onClose={() => setShowEmailSender(false)}
        />
      )}

      {showTemplateManager && (
        <TemplateManager
          onClose={() => setShowTemplateManager(false)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Eliminado badge PRO flotante */}
    </div>
  );
}

export default AppB2B;


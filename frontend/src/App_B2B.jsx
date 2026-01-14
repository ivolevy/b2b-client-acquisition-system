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
  
  // Determinar la vista basada en la ruta
  const isProfilePage = location.pathname === '/profile';
  const [view, setView] = useState(isProfilePage ? 'profile' : 'table');
  
  // Sincronizar vista con la ruta cuando cambia
  useEffect(() => {
    // Limpiar estados de carga inmediatamente al cambiar de ruta (incluyendo admin)
    setLoading(false);
    setBlockingLoading(false);
    
    // Si está en admin o backoffice, no hacer nada más
    if (location.pathname.startsWith('/backoffice') || location.pathname.startsWith('/admin')) {
      return;
    }
    
    if (location.pathname === '/profile') {
      setView('profile');
    } else if (view === 'profile') {
      setView('table');
    }
  }, [location.pathname, view]);
  const [stats, setStats] = useState(null);
  const [rubros, setRubros] = useState({});
  const [showEmailSender, setShowEmailSender] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  
  const { toasts, success, error: toastError, warning, info, removeToast } = useToast();
  const { user } = useAuth();
  
  const isPro = user?.plan === 'pro';
  const [historySearchData, setHistorySearchData] = useState(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false);

  // Manejar feedback de Gmail OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const gmailStatus = params.get('gmail');
    
    if (gmailStatus === 'success') {
      success("✓ Gmail conectado correctamente. Ya podés enviar correos.");
      // Limpiar parámetros de la URL
      navigate('/', { replace: true });
    } else if (gmailStatus === 'error') {
      const reason = params.get('reason');
      toastError(`✗ Error al conectar con Gmail: ${reason || 'Error desconocido'}`);
      navigate('/', { replace: true });
    }
  }, [location.search, navigate, success, toastError]);

  useEffect(() => {
    // Intentar recuperar estado del localStorage al montar
    const cachedEmpresas = localStorage.getItem('b2b_empresas_cache');
    const cachedStats = localStorage.getItem('b2b_stats_cache');
    
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
      loadStats();
    }
    loadRubros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar

  // Persistir estado en localStorage cuando cambia
  useEffect(() => {
    if (empresas.length > 0) {
      localStorage.setItem('b2b_empresas_cache', JSON.stringify(empresas));
    }
  }, [empresas]);

  useEffect(() => {
    if (stats) {
      localStorage.setItem('b2b_stats_cache', JSON.stringify(stats));
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
      const response = await axios.get(`${API_URL}/rubros`);
      console.log('Respuesta de rubros:', response.data);
      if (response.data && response.data.rubros) {
        setRubros(response.data.rubros);
        console.log('Rubros cargados:', Object.keys(response.data.rubros).length);
      } else {
        console.error('No se encontraron rubros en la respuesta:', response.data);
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
    try {
      const response = await axios.get(`${API_URL}/estadisticas`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const handleBuscar = async (params) => {
    try {
      setLoading(true);
      setBlockingLoading(true);
      const response = await axios.post(`${API_URL}/buscar`, params);
      
      if (response.data.success) {
        const validas = response.data.validas || 0;
        const total = response.data.total_encontradas || 0;
        const guardadas = response.data.guardadas || 0;
        const empresasEncontradas = response.data.data || [];

        // Guardar búsqueda en historial si es PRO (en background, sin bloquear)
        // NO guardar si viene del historial para evitar duplicados
        if (isPro && user?.id && total > 0 && !isFromHistory) {
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
        
        // Resetear flag después de la búsqueda
        if (isFromHistory) {
          setIsFromHistory(false);
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
              <strong>Se encontraron {total} empresas</strong>
              <p>Pero ninguna tiene datos de contacto válidos.</p>
              <p>Desmarca la opción "Solo empresas con email O teléfono válido" para verlas todas.</p>
            </>
          );
        } else {
          if (params.solo_validadas) {
            if (guardadas === total) {
              success(
                <>
                  <strong>{guardadas} empresas guardadas</strong>
                  <p>Todas con contacto válido</p>
                </>
              );
            } else {
              success(
                <>
                  <strong>{guardadas} empresas guardadas de {total} encontradas</strong>
                  <p>Todas las guardadas tienen contacto válido</p>
                </>
              );
            }
          } else {
            if (guardadas === total) {
              success(
                <>
                  <strong>{guardadas} empresas guardadas</strong>
                  <p>{validas} con contacto válido</p>
                </>
              );
            } else {
              const noGuardadas = total - guardadas;
              success(
                <>
                  <strong>{guardadas} empresas guardadas de {total} encontradas</strong>
                  <p>{validas} con contacto válido ({noGuardadas} no se guardaron por falta de datos válidos)</p>
                </>
              );
            }
        }
        }
        
        // Cargar todas las empresas de la base de datos para actualizar la vista completa
        await loadEmpresas();
        await loadStats();
      }
    } catch (err) {
      console.error('Error al buscar empresas:', err);
      const errorMsg = err.response?.data?.detail || err.message;
      toastError(
        <>
          <strong>Error al buscar empresas</strong>
          <p>{errorMsg}</p>
        </>
      );
      // Asegurar que se limpien los estados incluso si hay error
      setLoading(false);
      setBlockingLoading(false);
    } finally {
      setLoading(false);
      setBlockingLoading(false);
    }
  };


  const handleExportCSV = async () => {
    try {
      const response = await axios.post(`${API_URL}/exportar`, {
        formato: 'csv',
        solo_validas: true
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
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return dateString;
      }
    };

    // Formatear como link de Excel
    const formatLink = (url) => {
      if (!url) return '';
      return `=HYPERLINK("${url}", "${url}")`;
    };

    // Encabezados más estéticos y ordenados
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
      'Estado',
      'Fecha Captura'
    ];

    const rows = empresasToExport.map(e => [
      e.nombre || '',
      // Intentar usar nombre del rubro del diccionario si existe y si e.rubro es una key
      (rubros && rubros[e.rubro]) ? rubros[e.rubro] : (e.rubro || ''),
      formatLink(e.sitio_web || e.website),
      e.email || '',
      e.telefono || '',
      e.direccion || '',
      e.ciudad || '',
      e.codigo_postal || '',
      e.pais || '',
      formatLink(e.instagram),
      formatLink(e.facebook),
      formatLink(e.linkedin),
      formatLink(e.twitter),
      formatLink(e.youtube),
      formatLink(e.tiktok),
      e.validada ? 'Validada' : 'Pendiente',
      formatDate(e.created_at || e.fecha_creacion)
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Nombre de archivo con fecha legible
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    link.setAttribute('href', url);
    link.setAttribute('download', `Resultados_B2B_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    success(
      <>
        <strong>Exportación completada</strong>
        <p>Se exportaron {empresasToExport.length} empresas con el nuevo formato.</p>
      </>
    );
  };

  const handleDeleteResults = () => {
    // Solo limpiar estado local, no borrar de la BD
    setEmpresas([]);
    setStats({ total: 0, validadas: 0 });
    // Limpiar también localStorage
    localStorage.removeItem('b2b_empresas_cache');
    localStorage.removeItem('b2b_stats_cache');
    success(
      <>
        <strong>Resultados limpiados</strong>
        <p>Tu vista ha sido reiniciada.</p>
      </>
    );
  };

  return (
    <div className={`app ${isPro ? 'pro-theme' : ''}`}>
      {/* Fondo animado PRO */}
      {isPro && <ProBackground />}
      
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
              <div className="spinner"></div>
              <p>Buscando y validando empresas...</p>
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
                className={`${view === 'emails' ? 'active' : ''} ${!isPro ? 'disabled-feature' : ''}`}
                onClick={() => {
                  if (!isPro) {
                    warning(
                      <>
                        <strong>Función exclusiva PRO</strong>
                        <p>Actualiza tu plan para enviar emails masivos.</p>
                      </>
                    );
                    return;
                  }
                  setView('emails');
                }}
                style={!isPro ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Emails
                {!isPro && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '6px' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                )}
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
              onDeleteResults={handleDeleteResults}
              loading={loading}
              toastWarning={warning}
            />
          )}
          
          {view === 'emails' && isPro && (
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
      
      {/* Badge PRO flotante */}
      {isPro && (
        <div className="pro-floating-badge">
          <span className="pro-icon">⚡</span>
          <span>Plan PRO</span>
        </div>
      )}
    </div>
  );
}

export default AppB2B;


import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import FiltersB2B from './components/FiltersB2B';
import TableViewB2B from './components/TableViewB2B';
import GoogleMapView from './components/GoogleMapView';
import EmailSender from './components/EmailSender';
import TemplateEditor from './components/TemplateEditor';
import TemplateManager from './components/TemplateManager';
import ToastContainer from './components/ToastContainer';
import ProBackground from './components/ProBackground';
import { useToast } from './hooks/useToast';
import { useAuth } from './AuthWrapper';
import { searchHistoryService } from './lib/supabase';
import { API_URL } from './config';
import './App.css';

function AppB2B() {
  const [empresas, setEmpresas] = useState([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [blockingLoading, setBlockingLoading] = useState(false);
  const [view, setView] = useState('table');
  const [stats, setStats] = useState(null);
  const [rubros, setRubros] = useState({});
  const [showEmailSender, setShowEmailSender] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const { toasts, success, error: toastError, warning, info, removeToast } = useToast();
  const { user } = useAuth();
  
  // Verificar si el usuario es PRO
  const isPro = user?.plan === 'pro';
  
  // Estado para pasar datos desde historial a los filtros
  const [historySearchData, setHistorySearchData] = useState(null);
  
  // Estado para mostrar todos los resultados sin paginación (PRO)
  const [showAllResults, setShowAllResults] = useState(false);

  useEffect(() => {
    loadEmpresas();
    loadStats();
    loadRubros();
  }, []);
  
  // Manejar selección desde historial de búsquedas
  const handleSelectFromHistory = (searchData) => {
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
      setRubros(response.data.rubros || {});
    } catch (error) {
      console.error('Error al cargar rubros:', error);
    }
  };

  const loadEmpresas = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/empresas`);
      setEmpresas(response.data.data || []);
      setFilteredEmpresas(response.data.data || []);
    } catch (err) {
      console.error('Error al cargar empresas:', err);
      const errorMsg = err.response?.data?.detail || err.message;
      toastError(
        <>
          <strong>No se pudieron cargar las empresas</strong>
          <p>{errorMsg}</p>
        </>
      );
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

        // Guardar búsqueda en historial si es PRO
        if (isPro && user?.id && total > 0) {
          try {
            console.log('Intentando guardar búsqueda en historial...', {
              userId: user.id,
              rubro: params.rubro,
              total,
              validas
            });
            const { data: savedSearch, error: saveError } = await searchHistoryService.saveSearch(user.id, {
              rubro: params.rubro,
              ubicacion_nombre: params.busqueda_ubicacion_nombre,
              centro_lat: params.busqueda_centro_lat,
              centro_lng: params.busqueda_centro_lng,
              radio_km: params.busqueda_radio_km,
              bbox: params.bbox,
              empresas_encontradas: total,
              empresas_validas: validas
            });
            if (saveError) {
              console.error('Error al guardar en historial:', saveError);
            } else {
              console.log('Búsqueda guardada exitosamente:', savedSearch);
            }
          } catch (historyError) {
            console.error('Excepción al guardar en historial:', historyError);
          }
        } else {
          console.log('No se guarda en historial:', { isPro, userId: user?.id, total });
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
    } finally {
      setLoading(false);
      setBlockingLoading(false);
    }
  };

  const handleFiltrar = async (filters) => {
    // Si no hay filtros, mostrar todas las empresas
    if (!filters.rubro && !filters.ciudad && !filters.con_email && !filters.con_telefono && 
        !filters.distancia && !filters.con_redes) {
      setFilteredEmpresas(empresas);
      return;
    }

    // Filtrar en el frontend
    let filtered = [...empresas];

    if (filters.rubro) {
      filtered = filtered.filter(e => e.rubro === filters.rubro);
    }

    if (filters.ciudad) {
      filtered = filtered.filter(e => 
        e.ciudad && e.ciudad.toLowerCase().includes(filters.ciudad.toLowerCase())
      );
    }

    if (filters.con_email) {
      filtered = filtered.filter(e => e.email && e.email.trim() !== '');
    }

    if (filters.con_telefono) {
      filtered = filtered.filter(e => e.telefono && e.telefono.trim() !== '');
    }

    // Filtro por distancia
    if (filters.distancia !== null && filters.distancia !== undefined) {
      const distanciaValue = parseFloat(filters.distancia);
      if (!isNaN(distanciaValue)) {
        if (filters.distancia_operador === 'mayor') {
          filtered = filtered.filter(e => 
            e.distancia_km !== null && e.distancia_km !== undefined && e.distancia_km > distanciaValue
          );
        } else if (filters.distancia_operador === 'menor') {
          filtered = filtered.filter(e => 
            e.distancia_km !== null && e.distancia_km !== undefined && e.distancia_km < distanciaValue
          );
    }
      }
    }

    // Filtro por redes sociales
    if (filters.con_redes === 'con') {
      filtered = filtered.filter(e => 
        e.instagram || e.facebook || e.twitter || e.linkedin || e.youtube || e.tiktok
      );
    } else if (filters.con_redes === 'sin') {
      filtered = filtered.filter(e => 
        !e.instagram && !e.facebook && !e.twitter && !e.linkedin && !e.youtube && !e.tiktok
      );
    }

    setFilteredEmpresas(filtered);
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

  const exportToCSVFrontend = () => {
    if (filteredEmpresas.length === 0) {
      warning(
        <>
          <strong>No hay datos filtrados</strong>
          <p>Realiza una búsqueda o quita filtros antes de exportar.</p>
        </>
      );
      return;
    }

    // Función para escapar valores CSV correctamente
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Si contiene comillas, comas o saltos de línea, debe ir entre comillas
      if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        // Duplicar las comillas dobles y envolver en comillas
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Headers completos con todos los campos importantes
    const headers = [
      'ID', 'Nombre', 'Rubro', 'Email', 'Email Válido', 
      'Teléfono', 'Teléfono Válido', 'Dirección', 'Ciudad', 'País', 'Código Postal',
      'Sitio Web', 'LinkedIn', 'Estado',
      'Ubicación de Búsqueda', 'Distancia (km)',
      'Fecha Creación'
    ];

    // Mapear los datos de las empresas
    const rows = filteredEmpresas.map(e => [
      e.id || '',
      e.nombre || '',
      e.rubro || '',
      e.email || '',
      e.email_valido ? 'Sí' : 'No',
      e.telefono || '',
      e.telefono_valido ? 'Sí' : 'No',
      e.direccion || '',
      e.ciudad || '',
      e.pais || '',
      e.codigo_postal || '',
      e.sitio_web || e.website || '',
      e.linkedin || '',
      e.validada ? 'Válida' : 'Pendiente',
      e.busqueda_ubicacion_nombre || '',
      e.distancia_km !== null && e.distancia_km !== undefined ? e.distancia_km.toFixed(2) : '',
      e.created_at || e.fecha_creacion || ''
    ]);

    // Construir el CSV con valores escapados correctamente
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Agregar BOM UTF-8 para que Excel reconozca correctamente los caracteres especiales
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `empresas_b2b_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar la URL después de la descarga
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    success(
      <>
        <strong>Exportación completada</strong>
        <p>Se exportaron {filteredEmpresas.length} empresas a CSV</p>
      </>
    );
  };

  const handleDeleteResults = async () => {
    try {
      setLoading(true);
      setBlockingLoading(true);
      const response = await axios.delete(`${API_URL}/clear`);

      if (response.data.success) {
        success(
          <>
            <strong>Resultados eliminados</strong>
            <p>Se borraron todas las empresas almacenadas.</p>
          </>
        );
        setEmpresas([]);
        setFilteredEmpresas([]);
        setStats({ total: 0, validadas: 0 });
      }
    } catch (err) {
      console.error('Error al borrar resultados:', err);
      const errorMsg = err.response?.data?.detail || err.message;
      toastError(
        <>
          <strong>No se pudieron borrar</strong>
          <p>{errorMsg}</p>
        </>
      );
    } finally {
      setLoading(false);
      setBlockingLoading(false);
    }
  };

  return (
    <div className={`app ${isPro ? 'pro-theme' : ''}`}>
      {/* Fondo animado PRO */}
      {isPro && <ProBackground />}
      
      <Navbar />
      
      <main className="main-content">
        <FiltersB2B 
          onBuscar={handleBuscar}
          onFiltrar={handleFiltrar}
          onExportCSV={exportToCSVFrontend}
          loading={loading}
          rubros={rubros}
          view={view}
          setView={setView}
          toastWarning={warning}
          onSelectFromHistory={handleSelectFromHistory}
          historySearchData={historySearchData}
          onShowAllResultsChange={setShowAllResults}
        />

        {view === 'table' && (
          <section className="results-module">
            <div className="results-module__header">
              <div>
                <h2>Resultados obtenidos</h2>
                <p>
                  {filteredEmpresas.length} en pantalla · {empresas.length} totales
                </p>
              </div>
              <button
                type="button"
                className="results-delete-btn"
                onClick={handleDeleteResults}
                disabled={loading || empresas.length === 0}
              >
                Borrar resultados
              </button>
            </div>
          </section>
        )}
        
        {blockingLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Buscando y validando empresas...</p>
          </div>
        )}

        {view === 'table' && (
          <TableViewB2B empresas={filteredEmpresas} showAllResults={showAllResults} />
        )}
        {view === 'map' && (
          <GoogleMapView empresas={filteredEmpresas} />
        )}
      {view === 'emails' && (
        <EmailSender
          empresas={filteredEmpresas}
          onClose={() => setView('table')}
          embedded={true}
        />
        )}
      </main>

      {showEmailSender && (
        <EmailSender
          empresas={filteredEmpresas}
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


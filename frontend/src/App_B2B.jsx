import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import FiltersB2B from './components/FiltersB2B';
import TableViewB2B from './components/TableViewB2B';
import MapView from './components/MapView';
import EmailSender from './components/EmailSender';
import TemplateEditor from './components/TemplateEditor';
import TemplateManager from './components/TemplateManager';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import { API_URL } from './config';
import './App.css';

function AppB2B() {
  const [empresas, setEmpresas] = useState([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('table');
  const [stats, setStats] = useState(null);
  const [rubros, setRubros] = useState({});
  const [showEmailSender, setShowEmailSender] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const { toasts, success, error: toastError, warning, info, removeToast } = useToast();

  useEffect(() => {
    loadEmpresas();
    loadStats();
    loadRubros();
  }, []);

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
      const response = await axios.post(`${API_URL}/buscar`, params);
      
      if (response.data.success) {
        const validas = response.data.validas || 0;
        const total = response.data.total_encontradas || 0;
        const guardadas = response.data.guardadas || 0;
        const empresasEncontradas = response.data.data || [];
        
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
            success(
              <>
                <strong>{guardadas} empresas guardadas</strong>
                <p>Todas con contacto válido (de {total} encontradas)</p>
              </>
            );
          } else {
            success(
              <>
                <strong>{guardadas} empresas guardadas</strong>
                <p>{validas} con contacto válido de {total} encontradas</p>
              </>
            );
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

  const handleClearResults = () => {
    setEmpresas([]);
    setFilteredEmpresas([]);
    setStats({ total: 0, validadas: 0 });
    info(
      <>
        <strong>Resultados limpiados</strong>
        <p>La vista ha sido limpiada. Los datos permanecen en la base de datos.</p>
      </>
    );
  };

  const handleDeleteResults = async () => {
    try {
      setLoading(true);
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
    }
  };

  return (
    <div className="app">
      <Navbar />
      
      <main className="main-content">
        <FiltersB2B 
          onBuscar={handleBuscar}
          onFiltrar={handleFiltrar}
          onClearResults={handleClearResults}
          onDeleteResults={handleDeleteResults}
          onExportCSV={exportToCSVFrontend}
          loading={loading}
          rubros={rubros}
          view={view}
          setView={setView}
          toastWarning={warning}
        />
        
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Buscando y validando empresas...</p>
          </div>
        )}

        {view === 'table' && (
          <TableViewB2B empresas={filteredEmpresas} />
        )}
        {view === 'map' && (
          <MapView properties={filteredEmpresas} />
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
    </div>
  );
}

export default AppB2B;


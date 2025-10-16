import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import FiltersB2B from './components/FiltersB2B';
import TableViewB2B from './components/TableViewB2B';
import MapView from './components/MapView';
import Dashboard from './components/Dashboard';
import DatabaseViewer from './components/DatabaseViewer';
import './App.css';

const API_URL = 'http://localhost:8000';

function AppB2B() {
  const [empresas, setEmpresas] = useState([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('table');
  const [stats, setStats] = useState(null);
  const [rubros, setRubros] = useState({});
  const [showDatabaseViewer, setShowDatabaseViewer] = useState(false);

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
    } catch (error) {
      console.error('Error al cargar empresas:', error);
      alert('Error al cargar las empresas');
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
        
        if (total === 0) {
          alert('❌ No se encontraron empresas en esa área.\n\nIntenta:\n• Aumentar el radio de búsqueda\n• Elegir otra ubicación\n• Probar otro rubro');
        } else if (validas === 0) {
          alert(`⚠️ Se encontraron ${total} empresas pero NINGUNA tiene datos de contacto válidos.\n\n💡 Desmarca la opción "Solo empresas con email O teléfono válido" para verlas todas.`);
        } else {
          alert(`✓ ${guardadas} empresas guardadas (${validas} con contacto válido de ${total} encontradas)`);
        }
        
        await loadEmpresas();
        await loadStats();
      }
    } catch (error) {
      console.error('Error al buscar empresas:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      alert('❌ Error al buscar empresas:\n\n' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = async (filters) => {
    // Si no hay filtros, mostrar todas las empresas
    if (!filters.rubro && !filters.ciudad && !filters.con_email && !filters.con_telefono && !filters.solo_validas && !filters.solo_pendientes) {
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

    // Filtro por estado de validación
    if (filters.solo_validas) {
      filtered = filtered.filter(e => e.validada === true || e.validada === 1);
    }

    if (filters.solo_pendientes) {
      filtered = filtered.filter(e => !e.validada || e.validada === false || e.validada === 0);
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
        alert(`✓ Datos exportados a: ${response.data.archivo}`);
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar datos');
    }
  };

  const exportToCSVFrontend = () => {
    if (filteredEmpresas.length === 0) {
      alert('No hay datos para exportar');
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
      'Teléfono', 'Teléfono Válido', 'Dirección', 'Ciudad', 'País',
      'Sitio Web', 'LinkedIn', 'Estado', 'Fecha Creación'
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
      e.sitio_web || e.website || '',
      e.linkedin || '',
      e.validada ? 'Válida' : 'Pendiente',
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
    
    alert(`✓ Se exportaron ${filteredEmpresas.length} empresas a CSV`);
  };

  const handleClearResults = () => {
    if (!window.confirm('🧹 ¿Limpiar los resultados mostrados?\n\nEsto solo limpia la vista. Los datos permanecen en la base de datos.')) {
      return;
    }
    
    setEmpresas([]);
    setFilteredEmpresas([]);
    setStats({ total: 0, validadas: 0 });
    alert('✓ Resultados limpiados de la vista');
  };

  const handleClearDatabase = async () => {
    if (!window.confirm('⚠️ ¿ELIMINAR TODAS las empresas de la base de datos?\n\n🚨 Esta acción es PERMANENTE y no se puede deshacer.\n\nSe perderán todos los datos guardados.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete(`${API_URL}/clear`);
      
      if (response.data.success) {
        alert('✓ Base de datos eliminada correctamente');
        setEmpresas([]);
        setFilteredEmpresas([]);
        await loadStats();
      }
    } catch (error) {
      console.error('Error al limpiar base de datos:', error);
      alert('❌ Error al limpiar la base de datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <Navbar 
        onExport={exportToCSVFrontend}
        onViewDatabase={() => setShowDatabaseViewer(true)}
        onClearDatabase={handleClearDatabase}
        stats={stats}
      />
      
      <main className="main-content">
        <FiltersB2B 
          onBuscar={handleBuscar}
          onFiltrar={handleFiltrar}
          onClearResults={handleClearResults}
          onExportCSV={exportToCSVFrontend}
          loading={loading}
          rubros={rubros}
          view={view}
          setView={setView}
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
        {view === 'dashboard' && (
          <Dashboard 
            empresas={filteredEmpresas}
            onBulkStatusUpdated={(ids, nuevoEstado) => {
              setEmpresas(prev => prev.map(e => ids.includes(e.id) ? { ...e, estado: nuevoEstado } : e));
              setFilteredEmpresas(prev => prev.map(e => ids.includes(e.id) ? { ...e, estado: nuevoEstado } : e));
            }}
          />
        )}
      </main>

      {showDatabaseViewer && (
        <DatabaseViewer 
          empresas={empresas}
          stats={stats || { total: 0, validadas: 0, con_email: 0, con_telefono: 0 }}
          onClose={() => setShowDatabaseViewer(false)}
        />
      )}
    </div>
  );
}

export default AppB2B;


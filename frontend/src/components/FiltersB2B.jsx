import React, { useState } from 'react';
import LocationPicker from './LocationPicker';
import './Filters.css';

function FiltersB2B({ onBuscar, onFiltrar, onClearResults, onExportCSV, loading, rubros, view, setView }) {
  // Estados para búsqueda
  const [rubro, setRubro] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [scrapearWebsites, setScrapearWebsites] = useState(true); // ✅ ACTIVADO - Scraping de redes sociales
  const [soloValidadas, setSoloValidadas] = useState(false); // Desmarcado por defecto para ver todas
  
  // Estados para filtros
  const [filtroRubro, setFiltroRubro] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroConEmail, setFiltroConEmail] = useState(false);
  const [filtroConTelefono, setFiltroConTelefono] = useState(false);
  const [filtroValidacion, setFiltroValidacion] = useState('todas'); // 'todas', 'validadas', 'pendientes'

  const handleBuscarSubmit = (e) => {
    e.preventDefault();
    
    if (!rubro) {
      alert('Por favor selecciona un rubro');
      return;
    }

    if (!locationData) {
      alert('Por favor selecciona una ubicación en el mapa');
      return;
    }

    const params = {
      rubro: rubro,
      bbox: locationData.bbox.bbox_string,
      scrapear_websites: scrapearWebsites,
      solo_validadas: soloValidadas
    };

    onBuscar(params);
  };

  const handleFiltrarSubmit = (e) => {
    e.preventDefault();
    onFiltrar({
      rubro: filtroRubro || null,
      ciudad: filtroCiudad || null,
      solo_validas: filtroValidacion === 'validadas',
      solo_pendientes: filtroValidacion === 'pendientes',
      con_email: filtroConEmail,
      con_telefono: filtroConTelefono
    });
  };

  const handleLimpiarFiltros = () => {
    setFiltroRubro('');
    setFiltroCiudad('');
    setFiltroConEmail(false);
    setFiltroConTelefono(false);
    setFiltroValidacion('todas');
    onFiltrar({});
  };

  return (
    <div className="filters-container">
      {/* Sección de Búsqueda B2B */}
      <div className="filter-section fetch-section">
        <h3>🔍 Buscar Empresas por Rubro y Ubicación</h3>
        <form onSubmit={handleBuscarSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Rubro Empresarial *</label>
              <select 
                value={rubro} 
                onChange={(e) => setRubro(e.target.value)}
                disabled={loading}
                required
              >
                <option value="">-- Selecciona un rubro --</option>
                {Object.entries(rubros).map(([key, nombre]) => (
                  <option key={key} value={key}>{nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de ubicación en mapa */}
          <div className="location-section">
            <LocationPicker onLocationChange={setLocationData} />
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={scrapearWebsites}
                  onChange={(e) => setScrapearWebsites(e.target.checked)}
                  disabled={loading}
                />
                <span>🔄 Scrapear sitios web para obtener redes sociales <span style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginLeft: '6px' }}>✅ ACTIVO</span></span>
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={soloValidadas}
                  onChange={(e) => setSoloValidadas(e.target.checked)}
                  disabled={loading}
                />
                <span>
                  {soloValidadas ? '✅ Solo con contacto válido' : '📋 Mostrar todas (con y sin contacto)'}
                  {' '}
                  <span style={{ 
                    fontSize: '11px', 
                    color: soloValidadas ? '#dc2626' : '#059669',
                    fontWeight: 'bold'
                  }}>
                    {soloValidadas ? '⚠️ Menos resultados' : '✓ Recomendado'}
                  </span>
                </span>
              </label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !locationData}>
            {loading ? 'Buscando y validando...' : '🚀 Buscar Empresas en el Área'}
          </button>
          
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
            💡 El sistema busca empresas, valida emails/teléfonos y extrae redes sociales (Instagram, Facebook, LinkedIn, etc.)
          </p>
        </form>
      </div>

      {/* Sección de Filtros Compacta */}
      <div className="filter-section compact-filters">
        <div className="filter-header">
          <h3>🎯 Filtrar Resultados</h3>
          <div className="view-toggle">
            <button 
              type="button"
              className={view === 'table' ? 'active' : ''}
              onClick={() => setView('table')}
            >
              📊 Tabla
            </button>
            <button 
              type="button"
              className={view === 'map' ? 'active' : ''}
              onClick={() => setView('map')}
            >
              🗺️ Mapa
            </button>
          </div>
        </div>
        <form onSubmit={handleFiltrarSubmit}>
          {/* Fila de filtros */}
          <div className="filters-row-compact">
            <select 
              value={filtroRubro} 
              onChange={(e) => setFiltroRubro(e.target.value)}
              className="filter-input"
            >
              <option value="">🏢 Todos los rubros</option>
              {Object.entries(rubros).map(([key, nombre]) => (
                <option key={key} value={key}>{nombre}</option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="🏙️ Filtrar por ciudad..."
              value={filtroCiudad}
              onChange={(e) => setFiltroCiudad(e.target.value)}
              className="filter-input"
            />

            <select 
              value={filtroValidacion} 
              onChange={(e) => setFiltroValidacion(e.target.value)}
              className="filter-input"
            >
              <option value="todas">📊 Todas</option>
              <option value="validadas">✓ Válidas</option>
              <option value="pendientes">⚠️ Pendientes</option>
            </select>

            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filtroConEmail}
                onChange={(e) => setFiltroConEmail(e.target.checked)}
              />
              <span>📧 Email</span>
            </label>

            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filtroConTelefono}
                onChange={(e) => setFiltroConTelefono(e.target.checked)}
              />
              <span>📞 Teléfono</span>
            </label>
          </div>

          {/* Fila de acciones */}
          <div className="actions-row-compact">
            <button type="submit" className="btn btn-secondary btn-compact">
              Aplicar Filtros
            </button>
            <button 
              type="button" 
              className="btn btn-outline btn-compact" 
              onClick={handleLimpiarFiltros}
            >
              Limpiar
            </button>
            <button 
              type="button" 
              className="btn btn-success btn-compact" 
              onClick={onExportCSV}
            >
              📥 Exportar CSV
            </button>
            <button 
              type="button" 
              className="btn btn-warning btn-compact" 
              onClick={onClearResults}
            >
              🧹 Limpiar Vista
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FiltersB2B;

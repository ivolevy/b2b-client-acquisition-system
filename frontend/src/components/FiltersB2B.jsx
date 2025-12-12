import React, { useState, useEffect } from 'react';
import GoogleLocationPicker from './GoogleLocationPicker';
import LocationPicker from './LocationPicker';
import { useAuth } from '../AuthWrapper';
import SearchHistory from './SearchHistory';
import './Filters.css';

function FiltersB2B({ onBuscar, onFiltrar, onExportCSV, loading, rubros, view, setView, toastWarning, hayResultados, onSelectFromHistory, historySearchData, onShowAllResultsChange }) {
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  
  // Estados para búsqueda
  const [rubro, setRubro] = useState('');
  const [locationData, setLocationData] = useState(null);
  
  // Estado para inicializar el mapa desde historial
  const [initialMapLocation, setInitialMapLocation] = useState(null);
  
  // Estado para elegir entre Google Maps y OpenStreetMap
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [mapProvider, setMapProvider] = useState(GOOGLE_API_KEY ? 'google' : 'osm'); // 'google' o 'osm'
  
  // Efecto para cargar datos desde historial
  useEffect(() => {
    if (historySearchData) {
      setRubro(historySearchData.rubro);
      // Si hay datos de ubicación, pasarlos al mapa
      if (historySearchData.centro_lat && historySearchData.centro_lng) {
        setInitialMapLocation({
          lat: historySearchData.centro_lat,
          lng: historySearchData.centro_lng,
          name: historySearchData.ubicacion_nombre,
          radius: historySearchData.radio_km ? historySearchData.radio_km * 1000 : 5000
        });
      }
    }
  }, [historySearchData]);
  const [scrapearWebsites, setScrapearWebsites] = useState(true); //  ACTIVADO - Scraping de redes sociales
  const [soloValidadas, setSoloValidadas] = useState(false); // Desmarcado por defecto para ver todas
  const [modoBusqueda, setModoBusqueda] = useState('nueva'); // 'nueva' o 'agregar'
  
  // Estados para filtros
  const [filtroRubro, setFiltroRubro] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroConEmail, setFiltroConEmail] = useState(false);
  const [filtroConTelefono, setFiltroConTelefono] = useState(false);
  const [filtroDistancia, setFiltroDistancia] = useState('');
  const [filtroDistanciaOperador, setFiltroDistanciaOperador] = useState('mayor'); // 'mayor', 'menor'
  const [filtroConRedes, setFiltroConRedes] = useState('todas'); // 'todas', 'con', 'sin'
  const [showAllResults, setShowAllResults] = useState(false); // PRO: Ver todos sin paginación

  const handleBuscarSubmit = (e) => {
    e.preventDefault();
    
    if (!rubro) {
      toastWarning?.(
        <>
          <strong>Selecciona un rubro</strong>
          <p>Necesitas elegir un rubro antes de lanzar la búsqueda.</p>
        </>
      );
      return;
    }

    if (!locationData) {
      toastWarning?.(
        <>
          <strong>Ubicación requerida</strong>
          <p>Marca un punto en el mapa para definir el área a analizar.</p>
        </>
      );
      return;
    }

    const params = {
      rubro: rubro,
      bbox: locationData.bbox.bbox_string,
      scrapear_websites: scrapearWebsites,
      solo_validadas: soloValidadas,
      limpiar_anterior: modoBusqueda === 'nueva', // true = nueva búsqueda, false = agregar
      // Información de ubicación de búsqueda
      busqueda_ubicacion_nombre: locationData.ubicacion_nombre || null,
      busqueda_centro_lat: locationData.center?.lat || null,
      busqueda_centro_lng: locationData.center?.lng || null,
      busqueda_radio_km: locationData.radius ? (locationData.radius / 1000) : null // Convertir metros a km
    };

    onBuscar(params);
  };

  const handleFiltrarSubmit = (e) => {
    e.preventDefault();
    onFiltrar({
      rubro: filtroRubro || null,
      ciudad: filtroCiudad || null,
      con_email: filtroConEmail,
      con_telefono: filtroConTelefono,
      distancia: filtroDistancia ? parseFloat(filtroDistancia) : null,
      distancia_operador: filtroDistancia ? filtroDistanciaOperador : null,
      con_redes: filtroConRedes
    });
  };

  const handleLimpiarFiltros = () => {
    setFiltroRubro('');
    setFiltroCiudad('');
    setFiltroConEmail(false);
    setFiltroConTelefono(false);
    setFiltroDistancia('');
    setFiltroDistanciaOperador('mayor');
    setFiltroConRedes('todas');
    onFiltrar({});
  };

  // Manejar selección desde historial
  const handleSelectFromHistory = (searchData) => {
    setRubro(searchData.rubro);
    // Notificar al componente padre para configurar la ubicación
    if (onSelectFromHistory) {
      onSelectFromHistory(searchData);
    }
  };

  return (
    <div className="filters-container">
      {/* Sección de Búsqueda B2B */}
      <div className="filter-section fetch-section">
        <div className="section-header-with-action">
          <h3>Buscar Empresas por Rubro y Ubicación</h3>
          {user?.plan === 'pro' && (
            <button 
              type="button" 
              className="btn-history"
              onClick={() => setShowHistory(true)}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Últimas búsquedas
            </button>
          )}
        </div>
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

          {/* Selector de proveedor de mapa (solo si hay API key de Google) */}
          {GOOGLE_API_KEY && (
            <div className="map-provider-selector" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--gray-700)', fontWeight: 500 }}>
                Proveedor de mapa:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMapProvider('google')}
                  className={`mode-btn ${mapProvider === 'google' ? 'active' : ''}`}
                  style={{ fontSize: '0.875rem', padding: '6px 12px' }}
                >
                  Google Maps
                </button>
                <button
                  type="button"
                  onClick={() => setMapProvider('osm')}
                  className={`mode-btn ${mapProvider === 'osm' ? 'active' : ''}`}
                  style={{ fontSize: '0.875rem', padding: '6px 12px' }}
                >
                  OpenStreetMap
                </button>
              </div>
            </div>
          )}

          {/* Selector de ubicación en mapa */}
          <div className="location-section">
            {mapProvider === 'google' && GOOGLE_API_KEY ? (
              <GoogleLocationPicker 
                onLocationChange={setLocationData}
                initialLocation={initialMapLocation}
              />
            ) : (
              <LocationPicker 
                onLocationChange={setLocationData}
                initialLocation={initialMapLocation}
              />
            )}
          </div>

          <div className="filters-row-compact">
            <div className="option-card">
              <div className="option-head">
                <div className="option-title">Extraer redes sociales</div>
                <div className={`status-badge ${scrapearWebsites ? 'success' : 'off'}`}>
                  {scrapearWebsites ? 'Activo' : 'Inactivo'}
                </div>
              </div>
              <div className="option-desc">Si la empresa tiene sitio web, intentaremos obtener Instagram, LinkedIn, etc.</div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={scrapearWebsites}
                  onChange={(e) => setScrapearWebsites(e.target.checked)}
                  disabled={loading}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="option-card">
              <div className="option-head">
                <div className="option-title">Solo con contacto válido</div>
                <div className={`status-badge ${soloValidadas ? 'warn' : 'info'}`}>
                  {soloValidadas ? 'Menos resultados' : 'Más resultados'}
                </div>
              </div>
              <div className="option-desc">Filtra los resultados a empresas con email o teléfono válido.</div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={soloValidadas}
                  onChange={(e) => setSoloValidadas(e.target.checked)}
                  disabled={loading}
                />
                <span className="slider" />
              </label>
            </div>

            {/* Selector de modo de búsqueda */}
            <div className="option-card">
              <div className="option-head">
                <div className="option-title">Modo de búsqueda</div>
                <div className={`status-badge ${modoBusqueda === 'nueva' ? 'info' : 'success'}`}>
                  {modoBusqueda === 'nueva' ? 'Reemplazar' : 'Acumular'}
                </div>
              </div>
              <div className="option-desc">
                {modoBusqueda === 'nueva' 
                  ? 'Limpia resultados anteriores antes de buscar.' 
                  : 'Agrega los nuevos resultados a los existentes.'}
              </div>
              <div className="mode-toggle">
                <button 
                  type="button"
                  className={`mode-btn ${modoBusqueda === 'nueva' ? 'active' : ''}`}
                  onClick={() => setModoBusqueda('nueva')}
                  disabled={loading}
                >
                  Nueva búsqueda
                </button>
                <button 
                  type="button"
                  className={`mode-btn ${modoBusqueda === 'agregar' ? 'active' : ''}`}
                  onClick={() => setModoBusqueda('agregar')}
                  disabled={loading}
                >
                  Agregar resultados
                </button>
              </div>
            </div>

            <div className="option-actions">
              <button type="submit" className="btn btn-success btn-compact btn-cta" disabled={loading || !locationData}>
                {loading ? 'Buscando...' : ' Buscar en el área'}
              </button>
            </div>
          </div>

          <div className="hint-row">
            <span> Busca empresas, valida email/teléfono y extrae redes (Instagram, Facebook, LinkedIn, etc.).</span>
          </div>
        </form>
      </div>

      {/* Sección de Filtros Compacta */}
      <div className="filter-section compact-filters">
        <div className="filter-header">
          <h3> Filtrar Resultados</h3>
          <div className="view-toggle">
            <button 
              type="button"
              className={view === 'table' ? 'active' : ''}
              onClick={() => setView('table')}
            >
               Tabla
            </button>
            <button 
              type="button"
              className={view === 'map' ? 'active' : ''}
              onClick={() => setView('map')}
            >
               Mapa
            </button>
            <button 
              type="button"
              className={view === 'emails' ? 'active' : ''}
              onClick={() => setView('emails')}
            >
               Emails
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
              <option value=""> Todos los rubros</option>
              {Object.entries(rubros).map(([key, nombre]) => (
                <option key={key} value={key}>{nombre}</option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder=" Filtrar por ciudad..."
              value={filtroCiudad}
              onChange={(e) => setFiltroCiudad(e.target.value)}
              className="filter-input"
            />

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select 
                value={filtroDistanciaOperador} 
                onChange={(e) => setFiltroDistanciaOperador(e.target.value)}
                className="filter-input"
                style={{ width: '90px', flexShrink: 0 }}
              >
                <option value="mayor">Mayor que</option>
                <option value="menor">Menor que</option>
              </select>
              <input
                type="number"
                placeholder="Distancia (km)"
                value={filtroDistancia}
                onChange={(e) => setFiltroDistancia(e.target.value)}
                min="0"
                step="0.1"
                className="filter-input"
                style={{ width: '130px', flexShrink: 0 }}
              />
            </div>

            <select 
              value={filtroConRedes} 
              onChange={(e) => setFiltroConRedes(e.target.value)}
              className="filter-input"
            >
              <option value="todas">Todas las redes</option>
              <option value="con">Con redes sociales</option>
              <option value="sin">Sin redes sociales</option>
            </select>

            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filtroConEmail}
                onChange={(e) => setFiltroConEmail(e.target.checked)}
              />
              <span> Email</span>
            </label>

            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={filtroConTelefono}
                onChange={(e) => setFiltroConTelefono(e.target.checked)}
              />
              <span> Teléfono</span>
            </label>

            {user?.plan === 'pro' && (
              <label className="checkbox-inline pro-feature">
                <input
                  type="checkbox"
                  checked={showAllResults}
                  onChange={(e) => {
                    setShowAllResults(e.target.checked);
                    onShowAllResultsChange?.(e.target.checked);
                  }}
                />
                <span>📄 Ver todos</span>
              </label>
            )}
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
            {user?.plan === 'pro' ? (
              <button 
                type="button" 
                className="btn btn-success btn-compact" 
                onClick={onExportCSV}
              >
                 Exportar CSV
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-outline btn-compact pro-locked"
                onClick={() => toastWarning?.(
                  <>
                    <strong>Función PRO</strong>
                    <p>Exportar a CSV es una función exclusiva del plan PRO.</p>
                  </>
                )}
                title="Exportar CSV (solo PRO)"
              >
                 Exportar CSV 🔒
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Modal de historial de búsquedas (solo PRO) */}
      {user?.plan === 'pro' && (
        <SearchHistory 
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          onSelectSearch={handleSelectFromHistory}
        />
      )}
    </div>
  );
}

export default FiltersB2B;

import React, { useState, useEffect } from 'react';
import GoogleLocationPicker from './GoogleLocationPicker';
import LocationPicker from './LocationPicker';
import { useAuth } from '../AuthWrapper';
import SearchHistory from './SearchHistory';
import './Filters.css';

function FiltersB2B({ onBuscar, loading, rubros, toastWarning, onSelectFromHistory, historySearchData }) {
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  
  // Estados para búsqueda
  const [rubro, setRubro] = useState('');
  const [locationData, setLocationData] = useState(null);
  
  // Estado para inicializar el mapa desde historial
  const [initialMapLocation, setInitialMapLocation] = useState(null);
  
  // Estado para elegir entre Google Maps y OpenStreetMap
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [mapProvider, setMapProvider] = useState(GOOGLE_API_KEY ? 'google' : 'osm');
  
  // Efecto para cargar datos desde historial
  useEffect(() => {
    if (historySearchData) {
      setRubro(historySearchData.rubro);
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
  
  const [scrapearWebsites, setScrapearWebsites] = useState(true);
  const [soloValidadas, setSoloValidadas] = useState(false);
  const [modoBusqueda, setModoBusqueda] = useState('nueva');

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
      limpiar_anterior: modoBusqueda === 'nueva',
      busqueda_ubicacion_nombre: locationData.ubicacion_nombre || null,
      busqueda_centro_lat: locationData.center?.lat || null,
      busqueda_centro_lng: locationData.center?.lng || null,
      busqueda_radio_km: locationData.radius ? (locationData.radius / 1000) : null
    };

    onBuscar(params);
  };

  const handleSelectFromHistory = (searchData) => {
    setRubro(searchData.rubro);
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
          <div className="form-row form-row-compact">
            <div className="form-group form-group-compact">
              <label>Rubro Empresarial *</label>
              <select 
                value={rubro} 
                onChange={(e) => setRubro(e.target.value)}
                disabled={loading}
                required
                className="select-rubro-compact"
              >
                <option value="">-- Selecciona un rubro --</option>
                {Object.entries(rubros).map(([key, nombre]) => (
                  <option key={key} value={key}>{nombre}</option>
                ))}
              </select>
            </div>

            {/* Selector de proveedor de mapa (solo si hay API key de Google) */}
            {GOOGLE_API_KEY && (
              <div className="form-group form-group-compact map-provider-group">
                <label>Proveedor de mapa</label>
                <div className="map-provider-toggle">
                  <button
                    type="button"
                    onClick={() => setMapProvider('google')}
                    className={`map-provider-btn ${mapProvider === 'google' ? 'active' : ''}`}
                  >
                    Google Maps
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapProvider('osm')}
                    className={`map-provider-btn ${mapProvider === 'osm' ? 'active' : ''}`}
                  >
                    OpenStreetMap
                  </button>
                </div>
              </div>
            )}
          </div>

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

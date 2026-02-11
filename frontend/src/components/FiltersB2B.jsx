import React, { useState, useEffect, useRef } from 'react';
import GoogleLocationPicker from './GoogleLocationPicker';
import LocationPicker from './LocationPicker';
import { useAuth } from '../context/AuthContext';
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
  
  // Ref para evitar ejecuciones múltiples de búsqueda desde historial
  const historySearchExecutedRef = useRef(false);
  
  // Verificar si hay API key de Google Maps - Migración a GPA desactivada temporalmente
  const GOOGLE_API_KEY = null; // import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Efecto para cargar datos desde historial
  useEffect(() => {
    if (historySearchData) {
      console.log('🔄 FiltersB2B: Cargando desde historial:', historySearchData);
      historySearchExecutedRef.current = false;
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
  
  const [scrapearWebsites, setScrapearWebsites] = useState(false);
  const [modoBusqueda, setModoBusqueda] = useState('nueva');
  
  // Efecto separado para ejecutar búsqueda cuando locationData esté listo después de cargar historial
  useEffect(() => {
    if (historySearchData && locationData && historySearchData.rubro && !historySearchExecutedRef.current) {
      // Solo ejecutar si el locationData coincide con el historial (para evitar loops)
      const matchesHistory = 
        locationData.center?.lat &&
        locationData.center?.lng &&
        Math.abs(locationData.center.lat - historySearchData.centro_lat) < 0.0001 &&
        Math.abs(locationData.center.lng - historySearchData.centro_lng) < 0.0001;
      
      if (matchesHistory && historySearchData.bbox) {
        historySearchExecutedRef.current = true;
        const params = {
          rubro: historySearchData.rubro,
          bbox: historySearchData.bbox,
          scrapear_websites: scrapearWebsites,
          limpiar_anterior: false,
          busqueda_ubicacion_nombre: historySearchData.ubicacion_nombre || null,
          busqueda_centro_lat: historySearchData.centro_lat || null,
          busqueda_centro_lng: historySearchData.centro_lng || null,
          busqueda_radio_km: historySearchData.radio_km || null
        };
        
        onBuscar(params);
      }
    }
  }, [locationData, historySearchData, scrapearWebsites, onBuscar]);

  const handleBuscarSubmit = (e) => {
    e.preventDefault();
    
    if (!rubro) {
      toastWarning?.("Selecciona un rubro");
      return;
    }

    if (!locationData) {
      toastWarning?.("Selecciona una ubicación");
      return;
    }

    if (!locationData?.radius) {
      toastWarning?.("Selecciona un radio de búsqueda en el mapa");
      return;
    }

    const params = {
      rubro: rubro,
      bbox: locationData.bbox.bbox_string,
      scrapear_websites: scrapearWebsites,
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
          <h3>Buscar empresas por rubro y ubicación</h3>
          <button 
            type="button" 
            className="btn-history"
            onClick={() => {
              setShowHistory(true);
            }}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Próximamente
          </button>
        </div>
        <form onSubmit={handleBuscarSubmit}>
          {/* Controles en una sola línea: Rubro + Radio + Dirección + Botón */}
          {GOOGLE_API_KEY ? (
            <GoogleLocationPicker 
              onLocationChange={setLocationData}
              initialLocation={initialMapLocation}
              loading={loading}
              rubroSelect={
                <div className="form-group-compact rubro-inline">
                  <label>Rubro Empresarial *</label>
                  <select 
                    value={rubro} 
                    onChange={(e) => setRubro(e.target.value)}
                    disabled={loading}
                    required
                    className="select-rubro-compact"
                    aria-label="Seleccionar rubro empresarial"
                  >
                    <option value="" disabled>-- Selecciona un rubro --</option>
                    {rubros && Object.keys(rubros).length > 0 ? (
                      Object.entries(rubros).map(([key, nombre]) => (
                      <option key={key} value={key}>{nombre}</option>
                      ))
                    ) : (
                      <option value="" disabled>Cargando rubros...</option>
                    )}
                  </select>
                </div>
              }
            />
          ) : (
            <LocationPicker 
              onLocationChange={setLocationData}
              initialLocation={initialMapLocation}
              loading={loading}
              rubroSelect={
                <div className="form-group-compact rubro-inline">
                  <label>Rubro Empresarial *</label>
                  <select 
                    value={rubro} 
                    onChange={(e) => setRubro(e.target.value)}
                    disabled={loading}
                    required
                    className="select-rubro-compact"
                    aria-label="Seleccionar rubro empresarial"
                  >
                    <option value="" disabled>-- Selecciona un rubro --</option>
                    {rubros && Object.keys(rubros).length > 0 ? (
                      Object.entries(rubros).map(([key, nombre]) => (
                      <option key={key} value={key}>{nombre}</option>
                      ))
                    ) : (
                      <option value="" disabled>Cargando rubros...</option>
                    )}
                  </select>
                </div>
              }
            />
          )}

          {/* Toolbar de opciones compactas */}
          <div className="filters-bottom-row">
            <div className="filters-toolbar">
              
              <div className="toolbar-group">
                <button
                  type="button"
                  className={`filter-pill ${scrapearWebsites ? 'active' : ''}`}
                  onClick={() => setScrapearWebsites(!scrapearWebsites)}
                  disabled={loading}
                  title="Si la empresa tiene sitio web, intentaremos obtener Instagram, LinkedIn, etc."
                >
                  <div className="pill-icon">
                    {scrapearWebsites ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                    )}
                  </div>
                  <span>Redes Sociales</span>
                </button>

              </div>

              <div className="toolbar-divider"></div>

              <div className="toolbar-group">
                <div className="search-mode-segment">
                  <button 
                    type="button"
                    className={`segment-btn ${modoBusqueda === 'nueva' ? 'active' : ''}`}
                    onClick={() => setModoBusqueda('nueva')}
                    disabled={loading}
                  >
                    Nueva
                  </button>
                  <button 
                    type="button"
                    className={`segment-btn ${modoBusqueda === 'agregar' ? 'active' : ''}`}
                    onClick={() => setModoBusqueda('agregar')}
                    disabled={loading}
                  >
                    Agregar
                  </button>
                </div>
              </div>

            </div>

            <button 
              type="submit" 
              className="btn-search-distinct" 
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Buscar
            </button>
          </div>

          {/* Texto de ayuda dinámico */}
          <div className="filters-helper-text">
            {scrapearWebsites && (
              <div className="helper-pill info">
                <span><strong>Redes Sociales:</strong> Intentaremos extraer Instagram/LinkedIn de la web.</span>
              </div>
            )}
            {modoBusqueda === 'agregar' && (
              <div className="helper-pill neutral">
                <span>
                  <strong>Modo Adición:</strong> Se agregarán los nuevos resultados a la lista existente.
                </span>
              </div>
            )}
          </div>


        </form>
      </div>

      {/* Modal de historial de búsquedas (solo PRO) */}
      <SearchHistory 
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectSearch={handleSelectFromHistory}
      />
    </div>
  );
}

export default FiltersB2B;

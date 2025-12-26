import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';
import { useToast } from '../hooks/useToast';
import ToastContainer from './ToastContainer';
import './LocationPicker.css';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const libraries = ['places'];

// Helper para calcular bounding box (debe estar fuera del componente)
const calculateBoundingBox = (lat, lng, radiusMeters) => {
  const R = 6371000; // Radio de la Tierra en metros
  const latDelta = (radiusMeters / R) * (180 / Math.PI);
  const lngDelta = (radiusMeters / (R * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);
  
  return {
    bbox_string: `${lat - latDelta},${lng - lngDelta},${lat + latDelta},${lng + lngDelta}`,
    south: lat - latDelta,
    west: lng - lngDelta,
    north: lat + latDelta,
    east: lng + lngDelta
  };
};

function GoogleLocationPicker({ onLocationChange, initialLocation, rubroSelect = null }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [radius, setRadius] = useState(5000); // 5km por defecto
  const [mapCenter, setMapCenter] = useState({ lat: -34.6037, lng: -58.3816 }); // Buenos Aires, Argentina por defecto
  const [searchQuery, setSearchQuery] = useState('');
  const [map, setMap] = useState(null);
  const mapRef = useRef(null); // Ref para evitar stale closures
  const autocompleteInputRef = useRef(null);
  const [initialLocationApplied, setInitialLocationApplied] = useState(false);
  // Renombrar warning para evitar conflictos y asegurar que se use
  const { success, error, warning: toastWarning, info, removeToast, toasts } = useToast();
  
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const handleManualGeocodeRef = useRef(null);
  const suggestionsRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_API_KEY || '',
    libraries,
  });

  // Reset initialLocationApplied cuando cambia initialLocation
  useEffect(() => {
    if (initialLocation) {
      setInitialLocationApplied(false);
    } else {
      setInitialLocationApplied(false);
    }
  }, [initialLocation]);

  const handleLocationSelect = useCallback((lat, lng, ubicacionNombre = null) => {
    const location = { lat, lng };
    setSelectedLocation(location);
    
    const bbox = calculateBoundingBox(lat, lng, radius);
    
    onLocationChange({
      center: location,
      radius: radius,
      bbox: bbox,
      ubicacion_nombre: ubicacionNombre || searchQuery || `Ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    });
  }, [radius, searchQuery, onLocationChange]);

  const handleManualGeocode = useCallback(() => {
    const query = searchQuery?.trim();
    if (!query || query.length < 3) {
      toastWarning(
        <>
          <strong>Búsqueda muy corta</strong>
          <p>Escribe al menos 3 caracteres para buscar una dirección.</p>
        </>
      );
      return;
    }

    if (!isLoaded || !window.google?.maps?.Geocoder) {
      error(
        <>
          <strong>Error</strong>
          <p>Google Maps no está disponible. Intenta recargar la página.</p>
        </>
      );
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    // Priorizar Argentina en la búsqueda
    let searchQueryStr = query;
    if (!query.toLowerCase().includes('argentina') && !query.toLowerCase().includes('buenos aires')) {
      searchQueryStr = `${query}, Buenos Aires, Argentina`;
    }
    geocoder.geocode({ 
      address: searchQueryStr,
      componentRestrictions: { country: 'ar' }
    }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
        const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
        const nombre = results[0].formatted_address;
        setSearchQuery(nombre);
        setMapCenter({ lat, lng });
        setSelectedLocation({ lat, lng });
        setShowSuggestions(false);
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(15);
        }
        handleLocationSelect(lat, lng, nombre);
        success(
          <>
            <strong>Dirección encontrada</strong>
            <p>Se ha establecido la ubicación en el mapa.</p>
          </>
        );
      } else {
        error(
          <>
            <strong>No se encontró la dirección</strong>
            <p>No se pudo encontrar esa dirección. Intenta con otra búsqueda.</p>
          </>
        );
      }
    });
  }, [searchQuery, isLoaded, handleLocationSelect, toastWarning, error, success]);

  const handleMapClick = useCallback((event) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      handleLocationSelect(lat, lng, null);
    }
  }, [handleLocationSelect]);

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    if (selectedLocation) {
      const bbox = calculateBoundingBox(selectedLocation.lat, selectedLocation.lng, newRadius);
      onLocationChange({
        center: selectedLocation,
        radius: newRadius,
        bbox: bbox,
        ubicacion_nombre: searchQuery
      });
    }
  };

  // Actualizar ref cuando cambia la función
  useEffect(() => {
    handleManualGeocodeRef.current = handleManualGeocode;
  }, [handleManualGeocode]);

  // Manejar selección de sugerencia (usa ref para evitar dependencia circular)
  const handleSuggestionSelect = useCallback((prediction) => {
    if (!placesServiceRef.current || !prediction.place_id) {
      // Si no hay place_id, usar geocoding directo
      if (handleManualGeocodeRef.current) {
        handleManualGeocodeRef.current();
      }
      return;
    }

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['formatted_address', 'geometry', 'name']
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const location = place.geometry.location;
          const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
          const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
          const nombre = place.formatted_address || place.name || searchQuery;
          
          setSearchQuery(nombre);
          setMapCenter({ lat, lng });
          setSelectedLocation({ lat, lng });
          setShowSuggestions(false);
          
          if (mapRef.current) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(15);
          }
          
          handleLocationSelect(lat, lng, nombre);
        } else {
          // Fallback a geocoding manual
          if (handleManualGeocodeRef.current) {
            handleManualGeocodeRef.current();
          }
        }
      }
    );
  }, [handleLocationSelect, searchQuery]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      error(
        <>
          <strong>Geolocalización no disponible</strong>
          <p>Tu navegador no soporta la geolocalización.</p>
        </>
      );
      return;
    }

    const loadingToast = info('Obteniendo tu ubicación...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        removeToast(loadingToast);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const location = { lat, lng };
        
        setMapCenter(location);
        setSelectedLocation(location);
        setSearchQuery('Mi ubicación actual');
        
        if (mapRef.current) {
          mapRef.current.panTo(location);
          mapRef.current.setZoom(15);
        }
        
        handleLocationSelect(lat, lng, 'Mi ubicación actual');
        success(
          <>
            <strong>Ubicación obtenida</strong>
            <p>Se ha establecido tu ubicación actual en el mapa.</p>
          </>
        );
      },
      (err) => {
        removeToast(loadingToast);
        let errorMsg = 'No se pudo obtener tu ubicación.';
        if (err.code === 1) {
          errorMsg = 'Permiso de ubicación denegado. Por favor, permite el acceso en la configuración de tu navegador.';
        } else if (err.code === 2) {
          errorMsg = 'Ubicación no disponible. Verifica tu conexión GPS.';
        } else if (err.code === 3) {
          errorMsg = 'Tiempo de espera agotado. Intenta nuevamente.';
        }
        error(
          <>
            <strong>Error al obtener ubicación</strong>
            <p>{errorMsg}</p>
          </>
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Actualizar mapa cuando cambia mapCenter (optimizado para evitar movimientos innecesarios)
  useEffect(() => {
    if (isLoaded && mapRef.current && mapCenter) {
      const currentCenter = mapRef.current.getCenter();
      const centerLat = currentCenter?.lat();
      const centerLng = currentCenter?.lng();
      
      // Solo mover el mapa si el centro cambió significativamente (más de 100 metros)
      if (!centerLat || !centerLng || 
          Math.abs(centerLat - mapCenter.lat) > 0.001 || 
          Math.abs(centerLng - mapCenter.lng) > 0.001) {
        mapRef.current.panTo(mapCenter);
        if (selectedLocation) {
          mapRef.current.setZoom(15);
        } else {
          mapRef.current.setZoom(10);
        }
      }
    }
  }, [isLoaded, mapCenter, selectedLocation]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteInputRef.current && !autocompleteInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!GOOGLE_API_KEY) {
    return (
      <div className="location-picker">
        <div className="map-instruction" style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}>
          <p>Falta la clave de Google Maps. Configura VITE_GOOGLE_MAPS_API_KEY.</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="location-picker">
        <div className="map-instruction" style={{ background: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}>
          <p>Error al cargar Google Maps: {loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="location-picker">
        <div className="map-instruction">
          <p>Cargando mapa de Google Maps...</p>
        </div>
      </div>
    );
  }

  const controlsRow = (
    <div className="search-row">
      <div className="radius-control">
        <label className="radius-label">Radio de búsqueda</label>
        <select
          value={radius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
        >
          <option value={1000}>1 km</option>
          <option value={2000}>2 km</option>
          <option value={5000}>5 km</option>
          <option value={10000}>10 km</option>
          <option value={20000}>20 km</option>
          <option value={50000}>50 km</option>
        </select>
      </div>

      <div className="address-search" style={{ position: 'relative' }}>
        <label htmlFor="address-input">Buscar dirección</label>
        <div className="address-input-wrapper">
            <input
              ref={autocompleteInputRef}
              id="address-input"
              type="text"
              className="address-input"
              placeholder="Ej: Plaza de Mayo, Buenos Aires"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onKeyDown={(e) => {
                // Manejar Enter para buscar dirección
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowSuggestions(false);
                  if (suggestions.length > 0 && showSuggestions) {
                    handleSuggestionSelect(suggestions[0]);
                  } else {
                    handleManualGeocode();
                  }
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              autoComplete="off"
          />
          <button 
            type="button" 
            className="btn-search-address"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowSuggestions(false);
              if (suggestions.length > 0 && showSuggestions) {
                handleSuggestionSelect(suggestions[0]);
              } else {
                handleManualGeocode();
              }
            }}
            disabled={!searchQuery || searchQuery.trim().length < 3}
            title="Buscar dirección"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <span className="location-text">
            <span>o</span> <button type="button" className="btn-location-inline" onClick={handleUseCurrentLocation}>usar ubicacion actual</button>
          </span>
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul ref={suggestionsRef} className="address-suggestions" style={{ position: 'absolute', zIndex: 1000, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', width: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', listStyle: 'none', padding: 0, margin: 0 }}>
            {suggestions.map((prediction) => (
              <li 
                key={prediction.place_id} 
                onClick={() => handleSuggestionSelect(prediction)}
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#374151' }}>
                  {prediction.structured_formatting?.main_text || prediction.description}
                </div>
                {prediction.structured_formatting?.secondary_text && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                    {prediction.structured_formatting.secondary_text}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );



  return (
    <>
      <div className="form-row form-row-compact">
        {rubroSelect}
        {controlsRow}
      </div>
      
      <div className="location-picker">

        <div className="map-instruction">
          También puedes hacer clic directamente en el mapa para seleccionar una ubicación
        </div>

        <div className="location-map">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '12px' }}
            center={mapCenter}
            zoom={selectedLocation ? 15 : 10}
            onClick={handleMapClick}
            onLoad={(mapInstance) => {
              setMap(mapInstance);
              mapRef.current = mapInstance; // Actualizar ref también
            }}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: true,
              fullscreenControl: true,
            }}
          >
            {selectedLocation && (
              <>
                <Marker position={selectedLocation} />
                <Circle
                  center={selectedLocation}
                  radius={radius}
                  options={{
                    fillColor: '#667eea',
                    fillOpacity: 0.2,
                    strokeColor: '#667eea',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                />
              </>
            )}
          </GoogleMap>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </>
  );
}

export default GoogleLocationPicker;

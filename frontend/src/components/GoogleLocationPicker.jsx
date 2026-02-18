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

function GoogleLocationPicker(props) {
  const { onLocationChange, initialLocation, rubroSelect = null, smartFilterComponent = null } = props;
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [radius, setRadius] = useState(''); // "Selecciona un radio" por defecto
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

  // Memoize options to prevent re-renders and flickering controls
  const mapOptions = React.useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
  }), []);

  const circleOptions = React.useMemo(() => ({
    fillColor: '#667eea',
    fillOpacity: 0.2,
    strokeColor: '#667eea',
    strokeOpacity: 0.8,
    strokeWeight: 2,
  }), []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_API_KEY || '',
    libraries,
  });

  const handleLocationSelect = useCallback((lat, lng, ubicacionNombre = null) => {
    const location = { lat, lng };
    setSelectedLocation(location);
    
    const bbox = radius ? calculateBoundingBox(lat, lng, radius) : null;
    
    onLocationChange({
      center: location,
      radius: radius || 0,
      bbox: bbox,
      ubicacion_nombre: ubicacionNombre || searchQuery || `Ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    });
  }, [radius, searchQuery, onLocationChange]);

  // Reset initialLocationApplied cuando cambia initialLocation
  useEffect(() => {
    if (initialLocation && initialLocation.lat && initialLocation.lng) {
      setInitialLocationApplied(false);
      
      const { lat, lng } = initialLocation;
      setMapCenter({ lat, lng });
      setSelectedLocation({ lat, lng });
      
      if (initialLocation.radius) {
        setRadius(initialLocation.radius); 
      }
      
      if (initialLocation.name) {
        setSearchQuery(initialLocation.name);
      }

      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(15);
      }
      
      // Trigger update
      handleLocationSelect(lat, lng, initialLocation.name);
    }
  }, [initialLocation, handleLocationSelect]);

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
    // Búsqueda global
    geocoder.geocode({ 
      address: query,
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
      
      // Intentar obtener dirección por reverse geocoding
      if (isLoaded && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const nombre = results[0].formatted_address;
            setSearchQuery(nombre);
            handleLocationSelect(lat, lng, nombre);
          } else {
            handleLocationSelect(lat, lng, null);
          }
        });
      } else {
        handleLocationSelect(lat, lng, null);
      }
    }
  }, [handleLocationSelect, isLoaded]);

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    if (selectedLocation && newRadius) {
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

  // Inicializar servicios cuando la API de Google Maps esté cargada
  useEffect(() => {
    if (isLoaded && window.google?.maps?.places) {
      if (!autocompleteServiceRef.current) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      }
      // PlacesService requiere un elemento mapa o nodo HTML. 
      // Lo inicializaremos mejor cuando el mapa cargue si es posible, o usaremos un div oculto.
      // Pero como ya tenemos onMapLoad, podemos confiar en que se inicialice ahí o aquí si el mapa ya existe.
      if (mapRef.current && !placesServiceRef.current) {
        placesServiceRef.current = new window.google.maps.places.PlacesService(mapRef.current);
      }
    }
  }, [isLoaded]);

  // Efecto para buscar sugerencias
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchQuery || searchQuery.length < 3 || !autocompleteServiceRef.current) {
        setSuggestions([]);
        return;
      }

      try {
        const request = {
          input: searchQuery,
          // types: ['address'] // Opcional
        };

        autocompleteServiceRef.current.getPlacePredictions(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setSuggestions(results);
          } else {
            setSuggestions([]);
          }
        });
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      }
    };

    // Debounce simple
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, isLoaded]);

  // Actualizar PlacesService cuando el mapa carga
  useEffect(() => {
    if (map && isLoaded && window.google?.maps?.places) {
        placesServiceRef.current = new window.google.maps.places.PlacesService(map);
    }
  }, [map, isLoaded]);

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

    // Función recursiva con reintentos
    const tryGetLocation = (options, attempt = 1) => {
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
          // Si es un timeout y es el primer intento, reintentar con un tiempo más largo
          if (attempt === 1) {
            removeToast(loadingToast);
            const retryToast = info('La primera vez puede tardar un poco más, reintentando...');
            
            tryGetLocation({
              enableHighAccuracy: true,
              timeout: 20000, // Aumentar a 20 segundos
              maximumAge: 60000
            }, attempt + 1);
            
            setTimeout(() => removeToast(retryToast), 3000);
            return;
          }

          removeToast(loadingToast);
          let errorMsg = 'No se pudo obtener tu ubicación.';
          if (err.code === 1) {
            errorMsg = 'Permiso de ubicación denegado. Por favor, permite el acceso en la configuración de tu navegador.';
          } else if (err.code === 2) {
            errorMsg = 'Ubicación no disponible. Verifica tu conexión GPS.';
          } else if (err.code === 3) {
            errorMsg = 'Tiempo de espera agotado. Intentá de nuevo o buscá una dirección manualmente.';
          }
          error(
            <>
              <strong>Error al obtener ubicación</strong>
              <p>{errorMsg}</p>
            </>
          );
        },
        options
      );
    };

    // Intentar primero con opciones rápidas (permitiendo caché)
    tryGetLocation({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000 // 5 mins caché
    });
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
            <div className="skeleton skeleton-box" style={{ width: '100%', height: '400px', minHeight: '350px' }}></div>
      </div>
    );
  }

  const controlsRow = (
    <div className="search-row">
      <div className="radius-control">
        <label className="radius-label">Radio de búsqueda</label>
        <select
          value={radius}
          onChange={(e) => handleRadiusChange(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="" disabled>-- Selecciona un radio --</option>
          {[...Array(15)].map((_, i) => {
            const km = i + 1;
            return (
              <option key={km} value={km * 1000}>
                {km} km
              </option>
            );
          })}
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
      
      {/* Smart Filter Component Injected Here */}
      {smartFilterComponent}

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
            options={mapOptions}
          >
            {selectedLocation && (
              <>
                <Marker position={selectedLocation} />
                {radius && (
                  <Circle
                    center={selectedLocation}
                    radius={radius}
                    options={circleOptions}
                  />
                )}
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

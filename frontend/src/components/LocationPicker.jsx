import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import './LocationPicker.css';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px'
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false
};

const formatNominatimResult = (item) => {
  if (!item) return null;

  const mainName = item.display_name?.split(',')[0] || 'Ubicación sin nombre';
  const secondary = item.display_name?.split(',').slice(1).join(', ').trim() || '';

  return {
    place_id: item.place_id,
    display_name: mainName,
    full_label: secondary ? `${mainName}, ${secondary}` : mainName,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon)
  };
};

function LocationPicker({ onLocationChange, initialLocation, rubroSelect = null }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_API_KEY,
    libraries: ['places']
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [radius, setRadius] = useState(''); // Sin radio por defecto para mostrar placeholder
  const [mapCenter, setMapCenter] = useState({ lat: -34.6037, lng: -58.3816 }); // Buenos Aires por defecto
  const [mapZoom, setMapZoom] = useState(12);
  const [map, setMap] = useState(null);
  const [initialLocationApplied, setInitialLocationApplied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [useGooglePlaces, setUseGooglePlaces] = useState(false);
  const { toasts, success, error, warning, info, removeToast } = useToast();

  const suggestionsRef = useRef(null);
  const autocompleteRef = useRef(null);
  const placesServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const isSelectionUpdate = useRef(false);

  // Efecto para aplicar ubicación inicial desde historial
  useEffect(() => {
    if (initialLocation && !initialLocationApplied) {
      const { lat, lng, name, radius: initialRadius } = initialLocation;
      const location = { lat, lng };

      const effectiveRadius = initialRadius || radius || 5000;

      // Configurar radio
      setRadius(effectiveRadius);

      // Configurar ubicación
      setSelectedLocation(location);
      setMapCenter(location);
      setMapZoom(15);
      setSearchQuery(name || '');

      // Notificar al padre CON LOS VALORES CORRECTOS
      const bbox = calculateBoundingBox(lat, lng, effectiveRadius);
      onLocationChange({
        center: location,
        radius: effectiveRadius,
        bbox: bbox,
        ubicacion_nombre: name || `Ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      });

      setInitialLocationApplied(true);
    }
  }, [initialLocation, initialLocationApplied, radius, onLocationChange]);

  // Resetear flag cuando cambia initialLocation
  useEffect(() => {
    if (initialLocation) {
      setInitialLocationApplied(false);
    }
  }, [initialLocation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Si ya hay una ubicación inicial, no usar geolocalización
    if (initialLocation && initialLocationApplied) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapCenter(userLocation);
          setMapZoom(12);
        },
        (error) => {
          console.log('No se pudo obtener ubicación:', error);
        }
      );
    }
  }, [initialLocation, initialLocationApplied]);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
    // Inicializar servicios si no están
    if (window.google?.maps?.places && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(map);
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      setUseGooglePlaces(true);
    }
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      setShowSuggestions(false);
    }

    if (isSelectionUpdate.current) {
      isSelectionUpdate.current = false;
      return;
    }

    if (useGooglePlaces && autocompleteRef.current && typeof window !== 'undefined') {
      setIsSearching(true);
      autocompleteRef.current.getPlacePredictions(
        {
          input: searchQuery,
          sessionToken: sessionTokenRef.current,
          types: ['geocode']
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
            const mapped = predictions.map((prediction) => ({
              place_id: prediction.place_id,
              display_name: prediction.structured_formatting?.main_text || prediction.description,
              full_label: prediction.description
            }));
            setSuggestions(mapped);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
          setIsSearching(false);
        }
      );
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timeoutId = setTimeout(async () => {
      try {
        // Búsqueda global
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              'Accept-Language': 'es',
              'User-Agent': 'b2b-client-acquisition-system/1.0'
            },
            signal: controller.signal
          }
        );
        const data = await response.json();
        const formatted = data.map(formatNominatimResult).filter(Boolean);
        setSuggestions(formatted);
        setShowSuggestions(true);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error buscando direcciones:', error);
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery, useGooglePlaces]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMapClickFromMap = async (latlng) => {
    try {
      // Notificar selección inmediata de coordenadas
      handleLocationSelect(latlng, null);

      // Intentar obtener nombre de la dirección (Reverse Geocoding)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es',
            'User-Agent': 'b2b-client-acquisition-system/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const nombre = data.display_name || `Ubicación (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`;
        setSearchQuery(nombre);
        handleLocationSelect(latlng, nombre);
      }
    } catch (error) {
      console.error('Error en reverse geocoding:', error);
    }
  };

  const handleLocationSelect = (latlng, ubicacionNombre = null) => {
    setSelectedLocation(latlng);

    const bbox = calculateBoundingBox(latlng.lat, latlng.lng, radius);

    onLocationChange({
      center: latlng,
      radius: radius,
      bbox: bbox,
      ubicacion_nombre: ubicacionNombre || searchQuery || `Ubicación (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`
    });
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);

    if (selectedLocation) {
      const bbox = calculateBoundingBox(selectedLocation.lat, selectedLocation.lng, newRadius);
      onLocationChange({
        center: selectedLocation,
        radius: newRadius,
        bbox: bbox
      });
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setShowSuggestions(false);

    if (
      useGooglePlaces &&
      placesServiceRef.current &&
      typeof window !== 'undefined' &&
      (suggestion.lat === undefined || suggestion.lon === undefined)
    ) {
      setIsSearching(true);
      placesServiceRef.current.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ['geometry', 'formatted_address', 'name'],
          sessionToken: sessionTokenRef.current
        },
        (place, status) => {
          setIsSearching(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const nombreUbicacion = suggestion.full_label || suggestion.display_name || place?.formatted_address;

            isSelectionUpdate.current = true;
            setSearchQuery(nombreUbicacion);
            if (window.google?.maps?.places) {
              sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
            }
            setMapCenter({ lat, lng });
            handleLocationSelect({ lat, lng }, nombreUbicacion);
          } else {
            error(
              <>
                <strong>Error al obtener dirección</strong>
                <p>No se pudo obtener esa dirección. Intenta nuevamente.</p>
              </>
            );
          }
        }
      );
      return;
    }

    if (suggestion.lat != null && suggestion.lon != null) {
      const lat = parseFloat(suggestion.lat);
      const lng = parseFloat(suggestion.lon);
      const nombreUbicacion = suggestion.full_label || suggestion.display_name;

      isSelectionUpdate.current = true;
      setSearchQuery(nombreUbicacion);
      setMapCenter({ lat, lng });
      setMapZoom(15);
      handleLocationSelect({ lat, lng }, nombreUbicacion);
    }
  };

  const searchWithNominatim = async (query) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept-Language': 'es',
            'User-Agent': 'b2b-client-acquisition-system/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const formatted = formatNominatimResult(data[0]);
        if (formatted) {
          handleSuggestionSelect(formatted);
          setIsSearching(false);
          return;
        }
      }

      setIsSearching(false);
      warning(
        <>
          <strong>No se encontraron resultados</strong>
          <p>No se encontraron coincidencias para esa dirección. Intenta con otra búsqueda.</p>
        </>,
        4000
      );
    } catch (error) {
      console.error('Error con Nominatim:', error);
      setIsSearching(false);
      throw error;
    }
  };

  const handleAddressSubmit = async (e = null) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const query = searchQuery?.trim();
    if (!query || query.length < 3) {
      warning(
        <>
          <strong>Búsqueda muy corta</strong>
          <p>Escribe al menos 3 caracteres para buscar una dirección.</p>
        </>
      );
      return;
    }

    setShowSuggestions(false);

    // Si hay sugerencias visibles, usar la primera
    if (suggestions.length > 0 && showSuggestions) {
      handleSuggestionSelect(suggestions[0]);
      return;
    }

    try {
      setIsSearching(true);

      // Intentar con Google Geocoding si está disponible
      if (useGooglePlaces && GOOGLE_API_KEY && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        // Búsqueda global
        geocoder.geocode({
          address: query,
        }, (results, status) => {
          setIsSearching(false);
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
            const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
            const nombreUbicacion = results[0].formatted_address;
            setSearchQuery(nombreUbicacion);
            setMapCenter({ lat, lng });
            handleLocationSelect({ lat, lng }, nombreUbicacion);
            if (window.google?.maps?.places) {
              sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
            }
            setSuggestions([]);
            success(
              <>
                <strong>Dirección encontrada</strong>
                <p>Se ha establecido la ubicación en el mapa.</p>
              </>
            );
          } else {
            // Fallback a Nominatim
            searchWithNominatim(query).catch(err => {
              console.error('Error con Nominatim:', err);
              setIsSearching(false);
              error(
                <>
                  <strong>No se encontró la dirección</strong>
                  <p>No se pudo encontrar esa dirección. Intenta con otra búsqueda.</p>
                </>
              );
            });
          }
        });
        return;
      }

      // Usar Nominatim como fallback o principal
      await searchWithNominatim(query);
    } catch (error) {
      console.error('Error buscando dirección manual:', error);
      setIsSearching(false);
      error(
        <>
          <strong>Error en la búsqueda</strong>
          <p>No se pudo buscar la dirección. Intenta nuevamente.</p>
        </>
      );
    }
  };

  const handleAddressKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      setShowSuggestions(false);
      handleAddressSubmit();
    } else if (event.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      error(
        <>
          <strong>Geolocalización no disponible</strong>
          <p>Tu navegador no soporta la geolocalización. Por favor, busca una dirección manualmente.</p>
        </>
      );
      return;
    }

    // Mostrar mensaje de carga
    const loadingToast = info('Obteniendo tu ubicación...');

    // Función recursiva con reintentos
    const tryGetLocation = (options, attempt = 1) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          removeToast(loadingToast);
          const latlng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Reverse geocoding with Nominatim to get the address
          let addressName = 'Mi ubicación actual';
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`,
              {
                headers: {
                  'Accept-Language': 'es',
                  'User-Agent': 'b2b-client-acquisition-system/1.0'
                }
              }
            );
            if (response.ok) {
              const data = await response.json();
              if (data && data.display_name) {
                addressName = data.display_name;
              }
            }
          } catch (err) {
            console.error('Error in reverse geocoding:', err);
          }

          setSearchQuery(addressName);
          setMapCenter({ lat: latlng.lat, lng: latlng.lng });
          setMapZoom(15);
          handleLocationSelect(latlng, addressName);
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

            // Reintentar con opciones más relajadas o más precisas según sea el caso
            tryGetLocation({
              enableHighAccuracy: attempt === 1 ? true : options.enableHighAccuracy,
              timeout: 20000, // Aumentar a 20 segundos
              maximumAge: 60000
            }, attempt + 1);

            setTimeout(() => removeToast(retryToast), 3000);
            return;
          }

          removeToast(loadingToast);
          let errorMessage = 'No se pudo obtener tu ubicación.';
          let errorDetails = '';

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Permiso de ubicación denegado';
              errorDetails = 'Por favor, permite el acceso a tu ubicación en la configuración del navegador.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Error al obtener ubicación';
              errorDetails = 'Ubicación no disponible. Verifica tu conexión GPS.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Error al obtener ubicación';
              errorDetails = 'Ubicación no disponible. Verifica tu conexión GPS.';
              break;
            default:
              errorDetails = err.message || 'Error desconocido.';
              break;
          }

          error(
            <>
              <strong>{errorMessage || 'Error al obtener ubicación'}</strong>
              {errorDetails && <p>{errorDetails}</p>}
            </>
          );
        },
        options
      );
    };

    // Intentar primero con opciones rápidas
    tryGetLocation({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000 // 5 mins caché
    });
  };

  const controlsRow = (
    <div className="search-row" ref={suggestionsRef}>
      <div className="radius-control">
        <label className="radius-label">Radio de búsqueda</label>
        <select
          value={radius}
          onChange={(e) => handleRadiusChange(e.target.value ? parseInt(e.target.value) : '')}
          aria-label="Seleccionar radio de búsqueda"
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

      <div className="address-search">
        <label htmlFor="address-input" className="address-label-compact">BUSCAR DIRECCIÓN</label>
        <div className="address-input-group-modern">
          <div className="address-input-wrapper">
            <input
              id="address-input"
              type="text"
              className="address-input"
              placeholder="Ej: Plaza de Mayo, Buenos Aires"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleAddressKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-search-address"
              onClick={(e) => {
                e.preventDefault();
                handleAddressSubmit();
              }}
              disabled={isSearching || !searchQuery || searchQuery.trim().length < 3}
              title="Buscar dirección"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>

          <button type="button" className="btn-location-link-compact" onClick={handleUseCurrentLocation}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            USAR MI UBICACIÓN
          </button>
        </div>
        {isSearching && <div className="address-status">Buscando coincidencias...</div>}

        {showSuggestions && suggestions.length > 0 && (
          <ul className="address-suggestions">
            {suggestions.map((suggestion) => (
              <li key={suggestion.place_id} onClick={() => handleSuggestionSelect(suggestion)}>
                <span className="suggestion-title">
                  {suggestion.display_name}
                </span>
                {suggestion.full_label && (
                  <span className="suggestion-subtitle">
                    {suggestion.full_label.replace(`${suggestion.display_name}, `, '')}
                  </span>
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

        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={mapZoom}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={(e) => handleMapClickFromMap({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
            options={options}
            className="location-map"
          >
            {selectedLocation && (
              <>
                <Marker position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }} />
                <Circle
                  center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                  radius={radius}
                  options={{
                    strokeColor: '#667eea',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#667eea',
                    fillOpacity: 0.2,
                  }}
                />
              </>
            )}
          </GoogleMap>
        ) : (
          <div className="skeleton skeleton-box" style={{ width: '100%', height: '400px', borderRadius: '12px' }}></div>
        )}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </>
  );
}

function calculateBoundingBox(lat, lng, radiusMeters) {
  const earthRadius = 6371000;

  const latDelta = (radiusMeters / earthRadius) * (180 / Math.PI);
  const lngDelta = (radiusMeters / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

  return {
    south: lat - latDelta,
    west: lng - lngDelta,
    north: lat + latDelta,
    east: lng + lngDelta,
    bbox_string: `${lat - latDelta},${lng - lngDelta},${lat + latDelta},${lng + lngDelta}`
  };
}

export default LocationPicker;


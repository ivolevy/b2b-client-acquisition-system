import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import './LocationPicker.css';

// Arreglar iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

// Componente para actualizar el mapa cuando cambia el centro
function MapUpdater({ center, zoom = 15 }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center, zoom);
      // Invalidar tamaño para asegurar que el mapa se renderice correctamente
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [center, zoom, map]);
  
  return null;
}

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
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [radius, setRadius] = useState(5000); // 5km por defecto
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Madrid por defecto
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

  // Efecto para aplicar ubicación inicial desde historial
  useEffect(() => {
    if (initialLocation && !initialLocationApplied) {
      const { lat, lng, name, radius: initialRadius } = initialLocation;
      const location = { lat, lng };
      
      // Configurar radio si viene
      if (initialRadius) {
        setRadius(initialRadius);
      }
      
      // Configurar ubicación
      setSelectedLocation(location);
      setMapCenter([lat, lng]);
      setSearchQuery(name || '');
      
      // Notificar al padre
      const bbox = calculateBoundingBox(lat, lng, initialRadius || radius);
      onLocationChange({
        center: location,
        radius: initialRadius || radius,
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
          setMapCenter([userLocation.lat, userLocation.lng]);
        },
        (error) => {
          console.log('No se pudo obtener ubicación:', error);
        }
      );
    }
  }, [initialLocation, initialLocationApplied]);

  useEffect(() => {
    if (!GOOGLE_API_KEY || typeof window === 'undefined') return;

    const initPlaces = () => {
      if (window.google?.maps?.places) {
        autocompleteRef.current = new window.google.maps.places.AutocompleteService();
        placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        setUseGooglePlaces(true);
      }
    };

    const scriptId = 'google-places-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      if (window.google?.maps?.places) {
        initPlaces();
      } else {
        existingScript.addEventListener('load', initPlaces);
      }
      return () => existingScript.removeEventListener('load', initPlaces);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&language=es&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = initPlaces;
    script.onerror = () => console.error('No se pudo cargar Google Places API');
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', initPlaces);
    };
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      setShowSuggestions(false);
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
        // Priorizar Argentina en las sugerencias
        let searchQueryWithCountry = searchQuery;
        if (!searchQuery.toLowerCase().includes('argentina') && !searchQuery.toLowerCase().includes('buenos aires')) {
          searchQueryWithCountry = `${searchQuery}, Argentina`;
        }
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=ar&q=${encodeURIComponent(searchQueryWithCountry)}`,
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
            setSearchQuery(nombreUbicacion);
            if (window.google?.maps?.places) {
              sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
            }
            setMapCenter([lat, lng]);
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
      setSearchQuery(nombreUbicacion);
      setMapCenter([lat, lng]);
      handleLocationSelect({ lat, lng }, nombreUbicacion);
    }
  };

  const searchWithNominatim = async (query, tryWithArgentina = true) => {
    try {
      // Primero intentar con restricción a Argentina
      let searchQuery = query;
      if (tryWithArgentina && !query.toLowerCase().includes('argentina') && !query.toLowerCase().includes('buenos aires')) {
        searchQuery = `${query}, Argentina`;
      }
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=ar&q=${encodeURIComponent(searchQuery)}`,
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
      
      // Si no se encontró con Argentina y es el primer intento, intentar sin restricción
      if (tryWithArgentina && !query.toLowerCase().includes('argentina')) {
        setIsSearching(false);
        return await searchWithNominatim(query, false);
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
        // Priorizar Argentina en la búsqueda
        let searchQuery = query;
        if (!query.toLowerCase().includes('argentina') && !query.toLowerCase().includes('buenos aires')) {
          searchQuery = `${query}, Buenos Aires, Argentina`;
        }
        geocoder.geocode({ 
          address: searchQuery,
          componentRestrictions: { country: 'ar' }
        }, (results, status) => {
          setIsSearching(false);
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
            const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
            const nombreUbicacion = results[0].formatted_address;
            setSearchQuery(nombreUbicacion);
            setMapCenter([lat, lng]);
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
            // Si no encontró con Argentina, intentar sin restricción
            if (!query.toLowerCase().includes('argentina')) {
              geocoder.geocode({ address: query }, (results2, status2) => {
                setIsSearching(false);
                if (status2 === 'OK' && results2 && results2[0]) {
                  const location = results2[0].geometry.location;
                  const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
                  const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
                  const nombreUbicacion = results2[0].formatted_address;
                  setSearchQuery(nombreUbicacion);
          setMapCenter([lat, lng]);
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
        (position) => {
          removeToast(loadingToast);
          const latlng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapCenter([latlng.lat, latlng.lng]);
          handleLocationSelect(latlng, 'Mi ubicación actual');
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
              errorMessage = 'Ubicación no disponible';
              errorDetails = 'Tu ubicación no está disponible actualmente. Verifica que el GPS esté activado.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado';
              errorDetails = 'La solicitud de ubicación tardó demasiado. Intentá de nuevo o buscá una dirección manualmente.';
              break;
            default:
              errorDetails = err.message || 'Error desconocido.';
              break;
          }

          error(
            <>
              <strong>{errorMessage}</strong>
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
        <select value={radius} onChange={(e) => handleRadiusChange(parseInt(e.target.value))}>
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
        <label htmlFor="address-input">Buscar dirección</label>
        <div className="address-input-wrapper">
          <input
            id="address-input"
            type="text"
            className="address-input"
            placeholder="Ej: Paseo de la Castellana 100, Madrid"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleAddressKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            autoComplete="off"
            style={{
              background: '#ffffff',
              backgroundColor: '#ffffff',
              color: '#1a1a1a',
              WebkitTextFillColor: '#1a1a1a'
            }}
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
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <span className="location-text">
            <span>o</span> <button type="button" className="btn-location-inline" onClick={handleUseCurrentLocation}>usar ubicacion actual</button>
          </span>
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

        <MapContainer
          center={mapCenter}
          zoom={12}
          className="location-map"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          <MapUpdater center={mapCenter} zoom={selectedLocation ? 15 : 12} />
          
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          
          {selectedLocation && (
            <>
              <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
              <Circle
                center={[selectedLocation.lat, selectedLocation.lng]}
                radius={radius}
                pathOptions={{
                  color: '#667eea',
                  fillColor: '#667eea',
                  fillOpacity: 0.2
                }}
              />
            </>
          )}
        </MapContainer>
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


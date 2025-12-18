import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
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
            setSearchQuery(suggestion.full_label || suggestion.display_name);
            if (window.google?.maps?.places) {
              sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
            }
            setMapCenter([lat, lng]);
            const nombreUbicacion = suggestion.full_label || suggestion.display_name || place?.formatted_address;
            setSearchQuery(nombreUbicacion);
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

  const handleAddressSubmit = async (e = null) => {
    if (e) {
      e.preventDefault();
    }
    if (!searchQuery || searchQuery.trim().length < 3) {
      warning(
        <>
          <strong>Búsqueda muy corta</strong>
          <p>Escribe al menos 3 caracteres para buscar una dirección.</p>
        </>
      );
      return;
    }

    if (suggestions.length > 0) {
      handleSuggestionSelect(suggestions[0]);
      return;
    }

    try {
      setIsSearching(true);
      if (useGooglePlaces && GOOGLE_API_KEY) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const result = data.results[0];
          setSearchQuery(result.formatted_address);
          const { lat, lng } = result.geometry.location;
          const nombreUbicacion = result.formatted_address;
          setMapCenter([lat, lng]);
          handleLocationSelect({ lat, lng }, nombreUbicacion);
          if (window.google?.maps?.places) {
            sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
          }
          setSuggestions([]);
        } else {
          warning(
            <>
              <strong>No se encontraron resultados</strong>
              <p>No se encontraron coincidencias para esa dirección. Intenta con otra búsqueda.</p>
            </>
          );
        }
        return;
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      if (data.length > 0) {
        const formatted = formatNominatimResult(data[0]);
        if (formatted) {
          handleSuggestionSelect(formatted);
        }
      } else {
        warning(
          <>
            <strong>No se encontraron resultados</strong>
            <p>No se encontraron coincidencias para esa dirección. Intenta con otra búsqueda.</p>
          </>,
          4000
        );
      }
    } catch (error) {
      console.error('Error buscando dirección manual:', error);
      error(
        <>
          <strong>Error en la búsqueda</strong>
          <p>No se pudo buscar la dirección. Intenta nuevamente.</p>
        </>
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddressSubmit();
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

    // Primero intentar con opciones más permisivas (permite usar caché)
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
          // Si falla con opciones permisivas y es el primer intento, intentar con high accuracy
          if (attempt === 1 && !options.enableHighAccuracy) {
            removeToast(loadingToast);
            const retryToast = info('Intentando con mayor precisión...');
            tryGetLocation({
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 60000 // Permitir caché de hasta 1 minuto
            }, 2);
            setTimeout(() => removeToast(retryToast), 2000);
            return;
          }

          removeToast(loadingToast);
          let errorMessage = 'No se pudo obtener tu ubicación.';
          let errorDetails = '';

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Permiso de ubicación denegado';
              errorDetails = 'Por favor, permite el acceso a tu ubicación en la configuración del navegador. En Chrome/Edge: Configuración > Privacidad y seguridad > Ubicación. En Firefox: Configuración > Privacidad y seguridad > Permisos > Ubicación.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Ubicación no disponible';
              errorDetails = 'Tu ubicación no está disponible. Verifica que el GPS esté activado y que tengas señal. También puedes buscar una dirección manualmente.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado';
              errorDetails = 'La solicitud de ubicación tardó demasiado. Verifica tu conexión y que el GPS esté activado, o busca una dirección manualmente.';
              break;
            default:
              errorDetails = err.message || 'Error desconocido. Intenta buscar una dirección manualmente.';
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

    // Intentar primero con opciones más permisivas
    tryGetLocation({
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000 // Permitir caché de hasta 5 minutos
    });
  };

  const controlsRow = (
    <div className="search-row" ref={suggestionsRef}>
      <div className="radius-control">
        <label className="radius-label">Radio de búsqueda</label>
        <select value={radius} onChange={(e) => handleRadiusChange(parseInt(e.target.value))}>
          <option value="1000">1 km</option>
          <option value="2000">2 km</option>
          <option value="5000">5 km</option>
          <option value="10000">10 km</option>
          <option value="20000">20 km</option>
          <option value="50000">50 km</option>
        </select>
      </div>

      <div className="address-search" onKeyDown={handleAddressKeyDown}>
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
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            autoComplete="off"
          />
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

      <button type="button" className="btn-location" onClick={handleUseCurrentLocation}>
        Usar mi ubicación actual
      </button>
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
          key={`${mapCenter[0]}-${mapCenter[1]}`}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
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


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';
import { useToast } from '../hooks/useToast';
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
  const autocompleteRef = useRef(null);
  const [initialLocationApplied, setInitialLocationApplied] = useState(false);
  const boundsUpdateTimeoutRef = useRef(null); // Para debounce de bounds
  const { success, error, warning, info, removeToast } = useToast();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_API_KEY || '',
    libraries,
  });
  
  // Efecto para aplicar ubicación inicial desde historial
  useEffect(() => {
    if (initialLocation && !initialLocationApplied && mapRef.current && isLoaded) {
      const { lat, lng, name, radius: initialRadius } = initialLocation;
      const location = { lat, lng };
      const finalRadius = initialRadius || radius;
      
      if (initialRadius) {
        setRadius(initialRadius);
      }
      
      setSelectedLocation(location);
      setMapCenter(location);
      setSearchQuery(name || '');
      
      if (mapRef.current) {
        mapRef.current.panTo(location);
        mapRef.current.setZoom(15);
      }
      
      const bbox = calculateBoundingBox(lat, lng, finalRadius);
      onLocationChange({
        center: location,
        radius: finalRadius,
        bbox: bbox,
        ubicacion_nombre: name || `Ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      });
      
      setInitialLocationApplied(true);
    }
  }, [initialLocation, initialLocationApplied, isLoaded, radius, onLocationChange]);
  
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

  const handleMapClick = useCallback((e) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const location = { lat, lng };
      
      // Actualizar searchQuery con coordenadas cuando se hace click
      setSearchQuery(`Ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      setMapCenter(location);
      setSelectedLocation(location);
      
      handleLocationSelect(lat, lng, `Ubicación (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    }
  }, [handleLocationSelect]);

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

  // Inicializar Autocomplete de Google Places
  useEffect(() => {
    if (isLoaded && autocompleteInputRef.current && window.google?.maps?.places) {
      if (!autocompleteRef.current) {
        // Establecer bounds de Argentina para priorizar resultados de allí
        const argentinaBounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(-55.0, -73.6), // Sudoeste (Tierra del Fuego)
          new window.google.maps.LatLng(-21.8, -53.6)  // Noreste (Misiones)
        );
        
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          autocompleteInputRef.current,
          {
            bounds: argentinaBounds,
            fields: ['formatted_address', 'geometry', 'name']
          }
        );
        
        autocompleteRef.current.addListener('place_changed', () => {
          try {
            const place = autocompleteRef.current.getPlace();
            
            // Validar que place y geometry existan
            if (!place || !place.geometry || !place.geometry.location) {
              console.warn('Place selection invalid:', place);
              return;
            }
            
            // Manejar tanto location como función como objeto
            let lat, lng;
            const locationObj = place.geometry.location;
            
            if (typeof locationObj.lat === 'function') {
              lat = locationObj.lat();
              lng = locationObj.lng();
            } else if (typeof locationObj.lat === 'number' && typeof locationObj.lng === 'number') {
              lat = locationObj.lat;
              lng = locationObj.lng;
            } else {
              console.error('Invalid location format:', locationObj);
              return;
            }
            
            // Validar que lat y lng sean números válidos
            if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
              console.error('Invalid coordinates:', { lat, lng });
              return;
            }
            
            const nombre = place.formatted_address || place.name || '';
            const location = { lat, lng };
            
            setSearchQuery(nombre);
            setMapCenter(location);
            setSelectedLocation(location);
            
            // Mover el mapa usando el ref para evitar stale closure
            const currentMap = mapRef.current;
            if (currentMap) {
              currentMap.panTo(location);
              currentMap.setZoom(15);
            } else {
              // Si el mapa no está listo, esperar un poco y volver a intentar
              setTimeout(() => {
                const retryMap = mapRef.current;
                if (retryMap) {
                  retryMap.panTo(location);
                  retryMap.setZoom(15);
                }
              }, 100);
            }
            
            handleLocationSelect(lat, lng, nombre);
        } catch (error) {
            console.error('Error handling place selection:', error);
            error(
              <>
                <strong>Error al seleccionar ubicación</strong>
                <p>Hubo un problema al procesar la dirección seleccionada. Intenta nuevamente.</p>
              </>
            );
          }
        });
      }
    }
    
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, handleLocationSelect, error]);

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

  // Actualizar bounds del autocomplete cuando el mapa cambie (con debounce para evitar loops)
  useEffect(() => {
    if (isLoaded && mapRef.current && autocompleteRef.current) {
      const updateBounds = () => {
        // Limpiar timeout anterior
        if (boundsUpdateTimeoutRef.current) {
          clearTimeout(boundsUpdateTimeoutRef.current);
        }
        
        // Debounce para evitar actualizaciones excesivas
        boundsUpdateTimeoutRef.current = setTimeout(() => {
          const currentMap = mapRef.current;
          const currentAutocomplete = autocompleteRef.current;
          
          if (currentMap && currentAutocomplete) {
            try {
              const bounds = currentMap.getBounds();
              if (bounds && bounds.isValid && bounds.isValid()) {
                currentAutocomplete.setBounds(bounds);
              }
            } catch (error) {
              console.warn('Error updating autocomplete bounds:', error);
            }
          }
        }, 300); // 300ms de debounce
      };
      
      const boundsListener = mapRef.current.addListener('bounds_changed', updateBounds);
      const centerListener = mapRef.current.addListener('center_changed', updateBounds);
      
      return () => {
        if (boundsUpdateTimeoutRef.current) {
          clearTimeout(boundsUpdateTimeoutRef.current);
          boundsUpdateTimeoutRef.current = null;
        }
        if (mapRef.current) {
          try {
            window.google?.maps?.event?.removeListener?.(boundsListener);
            window.google?.maps?.event?.removeListener?.(centerListener);
          } catch (error) {
            console.warn('Error removing map listeners:', error);
          }
        }
      };
    }
  }, [isLoaded]);
  
  // Cleanup general al desmontar el componente
  useEffect(() => {
    return () => {
      if (boundsUpdateTimeoutRef.current) {
        clearTimeout(boundsUpdateTimeoutRef.current);
        boundsUpdateTimeoutRef.current = null;
      }
      if (autocompleteRef.current) {
        try {
          window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
        } catch (error) {
          console.warn('Error clearing autocomplete listeners:', error);
        }
        autocompleteRef.current = null;
      }
      mapRef.current = null;
    };
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

      <div className="address-search">
        <label htmlFor="address-input">Buscar dirección</label>
        <div className="address-input-wrapper">
            <input
              ref={autocompleteInputRef}
              id="address-input"
              type="text"
              className="address-input"
            placeholder="Ej: Plaza de Mayo, Buenos Aires"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
          />
          <span className="location-text">
            <span>o</span> <button type="button" className="btn-location-inline" onClick={handleUseCurrentLocation}>usar ubicacion actual</button>
          </span>
        </div>
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
      </div>
    </>
  );
}

export default GoogleLocationPicker;

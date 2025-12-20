import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader, Autocomplete } from '@react-google-maps/api';
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
  const [mapCenter, setMapCenter] = useState({ lat: 40.4168, lng: -3.7038 }); // Madrid por defecto
  const [searchQuery, setSearchQuery] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const [map, setMap] = useState(null);
  const [initialLocationApplied, setInitialLocationApplied] = useState(false);
  const { success, error, warning, info, removeToast } = useToast();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_API_KEY || '',
    libraries,
  });
  
  // Efecto para aplicar ubicación inicial desde historial
  useEffect(() => {
    if (initialLocation && !initialLocationApplied && map && isLoaded) {
      const { lat, lng, name, radius: initialRadius } = initialLocation;
      const location = { lat, lng };
      
      // Configurar radio si viene
      if (initialRadius) {
        setRadius(initialRadius);
      }
      
      // Configurar ubicación
      setSelectedLocation(location);
      setMapCenter(location);
      setSearchQuery(name || '');
      map.panTo(location);
      
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
  }, [initialLocation, initialLocationApplied, map, isLoaded, radius, onLocationChange]);
  
  // Resetear flag cuando cambia initialLocation
  useEffect(() => {
    if (initialLocation) {
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
      handleLocationSelect(lat, lng);
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

  const handlePlaceSelect = useCallback(() => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const nombre = place.formatted_address || place.name;
        setSearchQuery(nombre);
        setMapCenter({ lat, lng });
        if (map) {
          map.panTo({ lat, lng });
        }
        handleLocationSelect(lat, lng, nombre);
      }
    }
  }, [autocomplete, map, handleLocationSelect]);

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
        if (map) {
          map.panTo(location);
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

  useEffect(() => {
    if (isLoaded && map && selectedLocation) {
      map.panTo(selectedLocation);
    }
  }, [isLoaded, map, selectedLocation]);

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
          <Autocomplete
            onLoad={(autocomplete) => setAutocomplete(autocomplete)}
            onPlaceChanged={handlePlaceSelect}
          >
            <input
              id="address-input"
              type="text"
              className="address-input"
              placeholder="Ej: Paseo de la Castellana 100, Madrid"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </Autocomplete>
        </div>
      </div>

      <div className="btn-location-wrapper">
        <label className="btn-location-label">o usa tu ubicacion</label>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="btn-location"
        >
          usar ubicacion actual
        </button>
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
            zoom={selectedLocation ? 13 : 10}
            onClick={handleMapClick}
            onLoad={(mapInstance) => setMap(mapInstance)}
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


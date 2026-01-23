import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import './MapView.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

const defaultCenter = {
  lat: 40.4168,
  lng: -3.7038 // Madrid por defecto
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
};

function MapView({ properties, loading = false }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const [map, setMap] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [center, setCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(6);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  useEffect(() => {
    if (properties && properties.length > 0) {
      const validProperties = properties.filter(p => {
        const lat = parseFloat(p.latitud);
        const lng = parseFloat(p.longitud);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      });
      
      if (validProperties.length > 0) {
        const avgLat = validProperties.reduce((sum, p) => sum + parseFloat(p.latitud), 0) / validProperties.length;
        const avgLng = validProperties.reduce((sum, p) => sum + parseFloat(p.longitud), 0) / validProperties.length;
        
        setCenter({ lat: avgLat, lng: avgLng });
        setZoom(validProperties.length === 1 ? 15 : 12);

        // Ajustar el mapa para mostrar todos los marcadores si hay varios
        if (map && validProperties.length > 1) {
          const bounds = new window.google.maps.LatLngBounds();
          validProperties.forEach(p => {
            bounds.extend({ 
              lat: parseFloat(p.latitud), 
              lng: parseFloat(p.longitud) 
            });
          });
          map.fitBounds(bounds);
        }
      }
    }
  }, [properties, map]);

  const validProperties = (properties || []).filter(p => {
    const lat = parseFloat(p.latitud);
    const lng = parseFloat(p.longitud);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  if (!isLoaded || loading) {
    return (
      <div className="map-container" style={{ position: 'relative', zIndex: 1, minHeight: '600px', border: 'none' }}>
        <div className="map-header">
           <div className="skeleton skeleton-text" style={{ width: '300px', height: '32px' }}></div>
        </div>
        <div className="skeleton skeleton-box" style={{ width: '100%', height: '600px' }}></div>
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"></div>
        <h3>No hay empresas para mostrar en el mapa</h3>
        <p>Utiliza el formulario de búsqueda para obtener empresas</p>
      </div>
    );
  }

  if (validProperties.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"></div>
        <h3>No hay ubicaciones disponibles</h3>
        <p>Las empresas encontradas no tienen coordenadas geográficas</p>
      </div>
    );
  }

  return (
    <div className="map-container" style={{ position: 'relative', zIndex: 1, minHeight: '600px' }}>
      <div className="map-header">
        <h2>Mapa de Empresas: {validProperties.length} {validProperties.length === 1 ? 'ubicación' : 'ubicaciones'}</h2>
      </div>
      
      <div style={{ position: 'relative', width: '100%', height: '600px' }}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={zoom}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={options}
        >
          {validProperties.map((property) => {
            const position = {
              lat: parseFloat(property.latitud),
              lng: parseFloat(property.longitud)
            };
            
            return (
              <Marker
                key={property.id || `marker-${position.lat}-${position.lng}`}
                position={position}
                onClick={() => setSelectedProperty(property)}
              />
            );
          })}

          {selectedProperty && (
            <InfoWindow
              position={{
                lat: parseFloat(selectedProperty.latitud),
                lng: parseFloat(selectedProperty.longitud)
              }}
              onCloseClick={() => setSelectedProperty(null)}
            >
              <div className="popup-content">
                <h3>{selectedProperty.nombre || 'Sin nombre'}</h3>
                <div className="popup-info">
                  <p><strong>Rubro:</strong> {selectedProperty.rubro || 'N/A'}</p>
                  <p><strong>Ciudad:</strong> {selectedProperty.ciudad || 'N/A'}</p>
                  {selectedProperty.direccion && (
                    <p><strong>Dirección:</strong> {selectedProperty.direccion}</p>
                  )}
                  {(selectedProperty.website || selectedProperty.sitio_web) && (
                    <p>
                      <strong>Web:</strong>{' '}
                      <a href={selectedProperty.website || selectedProperty.sitio_web} target="_blank" rel="noopener noreferrer">
                        Ver sitio
                      </a>
                    </p>
                  )}
                  {selectedProperty.email && (
                    <p>
                      <strong>Email:</strong>{' '}
                      <a href={`mailto:${selectedProperty.email}`}>{selectedProperty.email}</a>
                    </p>
                  )}
                  {selectedProperty.telefono && (
                    <p>
                      <strong>Teléfono:</strong>{' '}
                      <a href={`tel:${selectedProperty.telefono}`}>{selectedProperty.telefono}</a>
                    </p>
                  )}
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}

export default MapView;


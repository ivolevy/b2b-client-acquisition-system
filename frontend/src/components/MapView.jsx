import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import './MapView.css';

// Arreglar el problema de los iconos de Leaflet con Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapView({ properties }) {
  const [center, setCenter] = useState([40.4168, -3.7038]); // Madrid por defecto
  const [zoom, setZoom] = useState(6);

  useEffect(() => {
    // Calcular centro basado en propiedades
    if (properties.length > 0) {
      const validProperties = properties.filter(p => p.latitud && p.longitud);
      
      if (validProperties.length > 0) {
        const avgLat = validProperties.reduce((sum, p) => sum + parseFloat(p.latitud), 0) / validProperties.length;
        const avgLng = validProperties.reduce((sum, p) => sum + parseFloat(p.longitud), 0) / validProperties.length;
        setCenter([avgLat, avgLng]);
        setZoom(validProperties.length === 1 ? 15 : 12);
      }
    }
  }, [properties]);

  const validProperties = properties.filter(p => p.latitud && p.longitud);

  if (properties.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"></div>
        <h3>No hay empresas para mostrar en el mapa</h3>
        <p>Utiliza el formulario de búsqueda para obtener empresas de OpenStreetMap</p>
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
    <div className="map-container">
      <div className="map-header">
        <h2> Mapa de Empresas: {validProperties.length} {validProperties.length === 1 ? 'ubicación' : 'ubicaciones'}</h2>
      </div>
      
      <MapContainer 
        center={center} 
        zoom={zoom} 
        className="leaflet-map"
        key={`${center[0]}-${center[1]}-${zoom}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validProperties.map((property) => (
          <Marker 
            key={property.id} 
            position={[parseFloat(property.latitud), parseFloat(property.longitud)]}
          >
            <Popup>
              <div className="popup-content">
                <h3>{property.nombre || 'Sin nombre'}</h3>
                <div className="popup-info">
                  <p><strong>Rubro:</strong> {property.rubro || 'N/A'}</p>
                  <p><strong>Ciudad:</strong> {property.ciudad || 'N/A'}</p>
                  {property.direccion && (
                    <p><strong>Dirección:</strong> {property.direccion}</p>
                  )}
                  {(property.sitio_web || property.website) && (
                    <p>
                      <strong>Web:</strong>{' '}
                      <a href={property.sitio_web || property.website} target="_blank" rel="noopener noreferrer">
                        Ver sitio
                      </a>
                    </p>
                  )}
                  {property.email && (
                    <p>
                      <strong>Email:</strong>{' '}
                      <a href={`mailto:${property.email}`}>{property.email}</a>
                    </p>
                  )}
                  {property.telefono && (
                    <p>
                      <strong>Teléfono:</strong>{' '}
                      <a href={`tel:${property.telefono}`}>{property.telefono}</a>
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapView;


import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import './LocationPicker.css';

// Arreglar iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

function LocationPicker({ onLocationChange }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [radius, setRadius] = useState(5000); // 5km por defecto
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Madrid por defecto
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  useEffect(() => {
    // Intentar obtener ubicación actual
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
  }, []);

  const handleLocationSelect = (latlng) => {
    setSelectedLocation(latlng);
    
    // Calcular bounding box desde el punto + radio
    const bbox = calculateBoundingBox(latlng.lat, latlng.lng, radius);
    
    onLocationChange({
      center: latlng,
      radius: radius,
      bbox: bbox
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

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latlng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapCenter([latlng.lat, latlng.lng]);
          handleLocationSelect(latlng);
        },
        (error) => {
          alert('No se pudo obtener tu ubicación: ' + error.message);
        }
      );
    } else {
      alert('Tu navegador no soporta geolocalización');
    }
  };

  return (
    <div className="location-picker">
      <div className="location-controls">
        <div className="control-group">
          <label>📍 Radio de búsqueda:</label>
          <select value={radius} onChange={(e) => handleRadiusChange(parseInt(e.target.value))}>
            <option value="1000">1 km</option>
            <option value="2000">2 km</option>
            <option value="5000">5 km</option>
            <option value="10000">10 km</option>
            <option value="20000">20 km</option>
            <option value="50000">50 km</option>
          </select>
        </div>

        <button type="button" className="btn-location" onClick={handleUseCurrentLocation}>
          📍 Usar mi ubicación actual
        </button>

        {selectedLocation && (
          <div className="selected-info">
            ✓ Ubicación seleccionada: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            <br />
            Radio: {(radius / 1000).toFixed(1)} km
          </div>
        )}
      </div>

      <div className="map-instruction">
        💡 Haz clic en el mapa para seleccionar una ubicación
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
    </div>
  );
}

// Función para calcular bounding box desde un punto + radio
function calculateBoundingBox(lat, lng, radiusMeters) {
  const earthRadius = 6371000; // Radio de la Tierra en metros
  
  // Convertir radio a grados
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


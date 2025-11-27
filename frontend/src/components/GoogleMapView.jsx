import React, { useMemo } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import './MapView.css';

const containerStyle = {
  width: '100%',
  height: '480px',
  borderRadius: '16px',
};

function GoogleMapView({ empresas }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
  });

  const validEmpresas = useMemo(
    () => (empresas || []).filter(e => e.latitud && e.longitud),
    [empresas]
  );

  const center = useMemo(() => {
    if (validEmpresas.length === 0) {
      return { lat: 40.4168, lng: -3.7038 }; // Madrid por defecto
    }
    const avgLat =
      validEmpresas.reduce((sum, e) => sum + parseFloat(e.latitud), 0) /
      validEmpresas.length;
    const avgLng =
      validEmpresas.reduce((sum, e) => sum + parseFloat(e.longitud), 0) /
      validEmpresas.length;
    return { lat: avgLat, lng: avgLng };
  }, [validEmpresas]);

  if (!apiKey) {
    return (
      <div className="empty-state">
        <h3>Falta la clave de Google Maps</h3>
        <p>Configura VITE_GOOGLE_MAPS_API_KEY en las variables de entorno de Vercel.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="empty-state">
        <h3>Error al cargar Google Maps</h3>
        <p>Revisa tu VITE_GOOGLE_MAPS_API_KEY y la consola del navegador para más detalles.</p>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
          Error: {loadError.message || 'Desconocido'}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="empty-state">
        <h3>Cargando mapa…</h3>
        <p>Estamos inicializando Google Maps.</p>
      </div>
    );
  }

  if (validEmpresas.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"></div>
        <h3>No hay empresas para mostrar en el mapa</h3>
        <p>Realiza una búsqueda para ver las ubicaciones en Google Maps.</p>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div className="map-header">
        <h2>
          Mapa de Empresas (Google Maps): {validEmpresas.length}{' '}
          {validEmpresas.length === 1 ? 'ubicación' : 'ubicaciones'}
        </h2>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={validEmpresas.length === 1 ? 15 : 12}
      >
        {validEmpresas.map((empresa) => (
          <Marker
            key={empresa.id}
            position={{
              lat: parseFloat(empresa.latitud),
              lng: parseFloat(empresa.longitud),
            }}
            title={empresa.nombre || 'Sin nombre'}
          />
        ))}
      </GoogleMap>
    </div>
  );
}

export default GoogleMapView;



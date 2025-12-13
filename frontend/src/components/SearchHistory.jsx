import React, { useState, useEffect } from 'react';
import { searchHistoryService } from '../lib/supabase';
import { useAuth } from '../AuthWrapper';
import './SearchHistory.css';

function SearchHistory({ isOpen, onClose, onSelectSearch }) {
  const { user } = useAuth();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadSearchHistory();
    }
  }, [isOpen, user?.id]);

  const loadSearchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await searchHistoryService.getHistory(user.id, 20);
      if (fetchError) throw fetchError;
      setSearches(data || []);
    } catch (err) {
      console.error('Error loading search history:', err);
      setError('No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSearch = async (searchId, e) => {
    e.stopPropagation();
    try {
      const { error: deleteError } = await searchHistoryService.deleteSearch(searchId);
      if (deleteError) throw deleteError;
      setSearches(prev => prev.filter(s => s.id !== searchId));
    } catch (err) {
      console.error('Error deleting search:', err);
    }
  };

  const handleSelectSearch = (search) => {
    onSelectSearch({
      rubro: search.rubro,
      ubicacion_nombre: search.ubicacion_nombre,
      centro_lat: search.centro_lat,
      centro_lng: search.centro_lng,
      radio_km: search.radio_km,
      bbox: search.bbox
    });
    onClose();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (!isOpen) return null;

  return (
    <div className="search-history-overlay" onClick={onClose}>
      <div className="search-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-history-header">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Últimas búsquedas
          </h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="search-history-content">
          {loading ? (
            <div className="history-loading">
              <div className="spinner"></div>
              <p>Cargando historial...</p>
            </div>
          ) : error ? (
            <div className="history-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>{error}</p>
              <button onClick={loadSearchHistory} className="btn-retry">
                Reintentar
              </button>
            </div>
          ) : searches.length === 0 ? (
            <div className="history-empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <h3>Sin búsquedas recientes</h3>
              <p>Tus búsquedas aparecerán aquí para que puedas repetirlas fácilmente.</p>
            </div>
          ) : (
            <div className="history-list">
              {searches.map((search) => (
                <div 
                  key={search.id} 
                  className="history-item"
                  onClick={() => handleSelectSearch(search)}
                >
                  <div className="history-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                  <div className="history-item-content">
                    <div className="history-item-rubro">{search.rubro}</div>
                    <div className="history-item-location">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {search.ubicacion_nombre || 'Ubicación personalizada'}
                      {search.radio_km && <span className="radius-badge">{search.radio_km} km</span>}
                    </div>
                    <div className="history-item-stats">
                      <span className="stat">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        {search.empresas_encontradas || 0} empresas
                      </span>
                      {search.empresas_validas > 0 && (
                        <span className="stat valid">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {search.empresas_validas} válidas
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="history-item-meta">
                    <span className="history-item-date">{formatDate(search.created_at)}</span>
                    <button 
                      className="delete-btn"
                      onClick={(e) => handleDeleteSearch(search.id, e)}
                      title="Eliminar del historial"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="search-history-footer">
          <p className="pro-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Función exclusiva del Plan PRO
          </p>
        </div>
      </div>
    </div>
  );
}

export default SearchHistory;




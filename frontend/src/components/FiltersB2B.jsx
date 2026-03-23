import React, { useState, useEffect, useRef } from 'react';
import GoogleLocationPicker from './GoogleLocationPicker';
import LocationPicker from './LocationPicker';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Filters.css';

import SmartFilterInput from './SmartFilterInput';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function FiltersB2B({ onBuscar, loading, rubros, toastWarning }) {
  const { user } = useAuth();
  
  // Plan Logic
  const plan = user?.plan || 'essential';
  const isAgency = plan === 'agency' || user?.role === 'admin';
  const isGrowthOrHigher = ['growth', 'agency'].includes(plan) || user?.role === 'admin';

  
  // Estados para búsqueda
  const [rubro, setRubro] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [smartFilterText, setSmartFilterText] = useState('');
  const [smartFilterAudio, setSmartFilterAudio] = useState(null);
  
  // Estado para inicializar el mapa desde historial
  
  // Verificar si hay API key de Google Maps - Migración a GPA desactivada temporalmente
  const GOOGLE_API_KEY = null; // import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  

  const [scrapearWebsites, setScrapearWebsites] = useState(true);
  const [modoBusqueda, setModoBusqueda] = useState('nueva');

  const handleBuscarSubmit = (e) => {
    e.preventDefault();
    
    if (!rubro) {
      toastWarning?.("Selecciona un rubro");
      return;
    }

    if (!locationData) {
      toastWarning?.("Selecciona una ubicación");
      return;
    }

    if (!locationData?.radius) {
      toastWarning?.("Selecciona un radio de búsqueda en el mapa");
      return;
    }

    const params = {
      rubro: rubro,
      bbox: locationData.bbox.bbox_string,
      scrapear_websites: scrapearWebsites,
      limpiar_anterior: modoBusqueda === 'nueva',
      busqueda_ubicacion_nombre: locationData.ubicacion_nombre || null,
      busqueda_centro_lat: locationData.center?.lat || null,
      busqueda_centro_lng: locationData.center?.lng || null,
      busqueda_radio_km: locationData.radius ? (locationData.radius / 1000) : null,
      smart_filter_text: smartFilterText,
      // Solo enviar audio si NO hay texto, para evitar re-transcripción en backend
      smart_filter_audio_blob: smartFilterText ? null : smartFilterAudio 
    };

    onBuscar(params);
  };


  const handleTranscribe = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob);
      
      const response = await axios.post(`${API_URL}/api/ai/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data && response.data.text) {
        setSmartFilterText(prev => {
            // Append if there's already text, or replace? Usually replace or append.
            // Let's replace for now based on "describe tu cliente" flow
            return response.data.text;
        });
        return response.data.text;
      }
    } catch (error) {
      console.error("Error transcribing:", error);
      throw error;
    }
  };

  const handleConfirmInterpretation = (interpretation) => {
    if (interpretation && interpretation.interpretation_summary) {
        success?.(`Filtro IA confirmado: ${interpretation.interpretation_summary}`);
    }
  };

  const handleInterpret = async (text) => {
    try {
      const response = await axios.post(`${API_URL}/api/ai/interpret`, {
        instruction: text
      });
      return response.data;
    } catch (error) {
       console.error("Error interpreting search:", error);
       toastWarning?.("Error al interpretar con IA");
       return null;
    }
  };

  return (
    <div className="filters-container">
      {/* Sección de Búsqueda B2B */}
      <div className="filter-section fetch-section">
        <div className="section-header-with-action">
          <h3>Buscar empresas por rubro y ubicación</h3>
        </div>
        <form onSubmit={handleBuscarSubmit}>
            
          {/* Controles en una sola línea: Rubro + Radio + Dirección + Botón */}
          {GOOGLE_API_KEY ? (
            <GoogleLocationPicker 
              onLocationChange={setLocationData}
              loading={loading}
              rubroSelect={
                <div className="form-group-compact rubro-inline">
                  <label>Rubro Empresarial *</label>
                  <select 
                    value={rubro} 
                    onChange={(e) => setRubro(e.target.value)}
                    disabled={loading}
                    required
                    className="select-rubro-compact"
                    aria-label="Seleccionar rubro empresarial"
                  >
                    <option value="" disabled>-- Selecciona un rubro --</option>
                    {rubros && Object.keys(rubros).length > 0 ? (
                      Object.entries(rubros).map(([key, nombre]) => (
                      <option key={key} value={key}>{nombre}</option>
                      ))
                    ) : (
                      <option value="" disabled>Cargando rubros...</option>
                    )}
                  </select>
                </div>
              }
            />
          ) : (
            <LocationPicker 
              onLocationChange={setLocationData}
              loading={loading}
              rubroSelect={
                <div className="form-group-compact rubro-inline">
                  <label>Rubro Empresarial *</label>
                  <select 
                    value={rubro} 
                    onChange={(e) => setRubro(e.target.value)}
                    disabled={loading}
                    required
                    className="select-rubro-compact"
                    aria-label="Seleccionar rubro empresarial"
                  >
                    <option value="" disabled>-- Selecciona un rubro --</option>
                    {rubros && Object.keys(rubros).length > 0 ? (
                      Object.entries(rubros).map(([key, nombre]) => (
                      <option key={key} value={key}>{nombre}</option>
                      ))
                    ) : (
                      <option value="" disabled>Cargando rubros...</option>
                    )}
                  </select>
                </div>
              }
                smartFilterComponent={
                isGrowthOrHigher ? (
                  <SmartFilterInput 
                    value={smartFilterText}
                    onChange={setSmartFilterText}
                    onAudioRecord={setSmartFilterAudio}
                    onTranscribe={handleTranscribe}
                    onSearch={(e) => handleBuscarSubmit(e || { preventDefault: () => {} })}
                    onInterpret={handleInterpret}
                    onConfirm={handleConfirmInterpretation}
                  />
                ) : (
                  <div className="smart-filter-container locked" onClick={() => toastWarning("El Filtro Inteligente está disponible desde el plan Growth. ¡Mejorá tu plan!")}>
                    <div className="smart-filter-trigger-text" style={{ opacity: 0.6, cursor: 'not-allowed', background: '#f1f5f9' }}>
                        <span className="trigger-label">Filtro Inteligente (IA) 🔒 (Plan Growth)</span>
                    </div>
                  </div>
                )
                  }
            />
          )}

          {/* Toolbar de opciones compactas */}
          <div className="filters-bottom-row">
            <div className="filters-toolbar">
              

              <div className="toolbar-group">
                {isGrowthOrHigher ? (
                  <SmartFilterInput 
                    value={smartFilterText}
                    onChange={setSmartFilterText}
                    onAudioRecord={setSmartFilterAudio}
                    onTranscribe={handleTranscribe}
                    onSearch={(e) => handleBuscarSubmit(e || { preventDefault: () => {} })}
                    onInterpret={handleInterpret}
                    onConfirm={handleConfirmInterpretation}
                  />
                ) : (
                  <div className="smart-filter-container locked" onClick={() => toastWarning("El Filtro Inteligente está disponible desde el plan Growth. ¡Mejorá tu plan!")}>
                    <div className="smart-filter-trigger-text" style={{ opacity: 0.6, cursor: 'not-allowed', background: '#f1f5f9' }}>
                        <span className="trigger-label">Filtro Inteligente (IA) 🔒 (Plan Growth)</span>
                    </div>
                  </div>
                )}
                <div className="toolbar-divider" />
                <div className="search-mode-segment">
                  <button 
                    type="button"
                    className={`segment-btn ${modoBusqueda === 'nueva' ? 'active' : ''}`}
                    onClick={() => setModoBusqueda('nueva')}
                    disabled={loading}
                  >
                    Nueva
                  </button>
                  <button 
                    type="button"
                    className={`segment-btn ${modoBusqueda === 'agregar' ? 'active' : ''}`}
                    onClick={() => setModoBusqueda('agregar')}
                    disabled={loading}
                  >
                    Agregar
                  </button>
                </div>
              </div>

            </div>

            <button 
              type="submit" 
              className="btn-search-distinct" 
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Buscar
            </button>
          </div>

          {/* Texto de ayuda dinámico */}
          <div className="filters-helper-text">
            {modoBusqueda === 'agregar' && (
              <div className="helper-pill neutral">
                <span>
                  <strong>Modo Adición:</strong> Se agregarán los nuevos resultados a la lista existente.
                </span>
              </div>
            )}
          </div>


        </form>
      </div>

    </div>
  );
}

export default FiltersB2B;

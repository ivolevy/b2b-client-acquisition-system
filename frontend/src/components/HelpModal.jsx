import React, { useEffect } from 'react';
import './DatabaseViewer.css';

function HelpModal({ onClose }) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <div className="db-viewer-overlay" onClick={onClose}>
      <div className="db-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="db-viewer-header">
          <h2> Ayuda rápida</h2>
          <button className="close-btn" onClick={onClose}></button>
        </div>

        <div className="db-viewer-content" style={{ lineHeight: 1.6 }}>
          <div className="db-stats" style={{marginBottom: 12}}>
            <div className="stat-card blue">
              <div className="stat-icon"></div>
              <div>
                <div className="stat-value" style={{fontSize: 18}}>Inicio rápido</div>
                <div className="stat-label">Elegí rubro, ciudad y presioná Buscar</div>
              </div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon"></div>
              <div>
                <div className="stat-value" style={{fontSize: 18}}>Vistas</div>
                <div className="stat-label">Alterná entre Tabla y Mapa desde los filtros</div>
              </div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon"></div>
              <div>
                <div className="stat-value" style={{fontSize: 18}}>Exportar</div>
                <div className="stat-label">Descargá CSV de los resultados actuales</div>
              </div>
            </div>
          </div>

          <div className="info-grid" style={{marginBottom: 20}}>
            <div className="info-item" style={{flexDirection:'column'}}>
              <strong>Filtros principales</strong>
              <ul style={{marginLeft: '1rem'}}>
                <li><b>Rubro</b>: categoría de negocio a buscar.</li>
                <li><b>Ciudad + radio</b>: define el área de búsqueda.</li>
                <li><b>Solo con contacto válido</b>: muestra empresas con email o teléfono válidos.</li>
                <li><b>Extraer redes</b>: visita el sitio web (si hay) y detecta Instagram, Facebook, X, LinkedIn, YouTube, TikTok.</li>
              </ul>
            </div>
            <div className="info-item" style={{flexDirection:'column'}}>
              <strong>Score de Leads</strong>
              <ul style={{marginLeft: '1rem'}}>
                <li>+30 Email válido</li>
                <li>+30 Teléfono válido</li>
                <li>+20 Sitio web válido</li>
                <li>+5 por red social clave (IG/FB/LI)</li>
                <li><b>Rangos</b>: HOT (80-100) · WARM (60-79) · COLD (30-59) · LOW (&lt;30)</li>
              </ul>
            </div>
            <div className="info-item" style={{flexDirection:'column'}}>
              <strong>Estados (Kanban)</strong>
              <ul style={{marginLeft: '1rem'}}>
                <li>por_contactar → contactada → interesada → convertida</li>
                <li>Usá el estado para priorizar a quién contactar primero.</li>
              </ul>
            </div>
          </div>

          <div className="db-info">
            <h3>Consejos útiles</h3>
            <ul style={{marginLeft: '1rem'}}>
              <li>Si ves pocos resultados, desmarca <b>Solo con contacto válido</b>.</li>
              <li>Activá <b>Extraer redes</b> para enriquecer perfiles automáticamente.</li>
              <li>Hacé click en los iconos de redes en la tabla para abrir los perfiles.</li>
              <li>Usá <b>Exportar</b> para descargar un CSV listo para Excel.</li>
            </ul>
          </div>
        </div>

        <div className="db-viewer-footer">
          <div className="footer-stats">¿Te quedó alguna duda? Revisá la tabla, los iconos y las etiquetas de estado.</div>
          <button className="btn-close" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;



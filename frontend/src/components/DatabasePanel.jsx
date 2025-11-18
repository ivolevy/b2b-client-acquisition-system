import React, { useState } from 'react';
import './DatabasePanel.css';

function DatabasePanel({ onViewDatabase, onClearDatabase, onDownloadDatabase, onClose }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClearClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmClear = () => {
    onClearDatabase();
    setShowConfirm(false);
    onClose();
  };

  return (
    <div className="database-panel-overlay" onClick={onClose}>
      <div className="database-panel" onClick={(e) => e.stopPropagation()}>
        <div className="database-panel-header">
          <h3>Base de Datos</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="database-panel-content">
          <div className="database-option" onClick={onViewDatabase}>
            <div className="database-option-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                <path d="M3 9h18M9 3v18"/>
              </svg>
            </div>
            <div className="database-option-content">
              <h4>Ver Base de Datos</h4>
              <p>Visualiza todas las empresas almacenadas con estadísticas completas</p>
            </div>
          </div>

          <div className="database-option" onClick={onDownloadDatabase}>
            <div className="database-option-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
            </div>
            <div className="database-option-content">
              <h4>Descargar Base de Datos</h4>
              <p>Exporta todas las empresas a un archivo CSV</p>
            </div>
          </div>

          <div className="database-option danger" onClick={handleClearClick}>
            <div className="database-option-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/>
              </svg>
            </div>
            <div className="database-option-content">
              <h4>Borrar Base de Datos</h4>
              <p>Elimina todas las empresas. Esta acción no se puede deshacer</p>
            </div>
          </div>
        </div>

        {showConfirm && (
          <div className="database-confirm-overlay">
            <div className="database-confirm-modal">
              <h4>¿Estás seguro?</h4>
              <p>Esta acción eliminará todas las empresas de la base de datos y no se puede deshacer.</p>
              <div className="database-confirm-actions">
                <button className="btn-cancel" onClick={() => setShowConfirm(false)}>
                  Cancelar
                </button>
                <button className="btn-confirm" onClick={handleConfirmClear}>
                  Sí, borrar todo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DatabasePanel;


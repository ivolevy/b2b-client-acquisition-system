import React from 'react';
import './Navbar.css';

function Navbar({ onExport, onViewDatabase, onClearDatabase, stats }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>🏢 B2B Client Acquisition System</h1>
          {stats && (
            <span className="navbar-stats">
              {stats.total || stats.total_properties || 0} empresas · {stats.validadas || 0} validadas
            </span>
          )}
        </div>
        
        <div className="navbar-actions">
          <button className="export-btn" onClick={onExport}>
            📥 Exportar
          </button>
          
          <button className="db-viewer-btn" onClick={onViewDatabase}>
            💾 Ver BD
          </button>
          
          <button className="clear-btn" onClick={onClearDatabase}>
            🗑️ Borrar BD
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;


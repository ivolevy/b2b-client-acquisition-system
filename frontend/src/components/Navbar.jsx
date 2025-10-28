import React, { useState } from 'react';
import './Navbar.css';
import HelpModal from './HelpModal';

function Navbar({ onExport, onViewDatabase, onClearDatabase, stats }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1> B2B Client Acquisition System</h1>
          {stats && (
            <span className="navbar-stats">
              {stats.total || stats.total_properties || 0} empresas · {stats.validadas || 0} validadas
            </span>
          )}
        </div>
        
        <div className="navbar-actions">
          <button className="export-btn" onClick={onExport}>
             Exportar
          </button>
          
          <button className="db-viewer-btn" onClick={onViewDatabase}>
             Ver BD
          </button>
          
          <button className="clear-btn" onClick={onClearDatabase}>
             Borrar BD
          </button>
        </div>
      </div>
    </nav>
    {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    
    {/* Botón de ayuda flotante */}
    <button 
      className="floating-help-btn" 
      onClick={() => setShowHelp(true)} 
      title="Ayuda"
    >
      Ayuda
    </button>
    </>
  );
}

export default Navbar;


import React, { useState } from 'react';
import './Navbar.css';
import HelpModal from './HelpModal';

function Navbar({ onViewDatabase, onClearDatabase, onOpenDatabasePanel, stats }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1> B2B Client Acquisition System</h1>
        </div>
        
        <div className="navbar-actions">
          <button className="db-btn" onClick={onOpenDatabasePanel}>
             Base de Datos
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


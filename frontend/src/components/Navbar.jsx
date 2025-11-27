import React, { useState } from 'react';
import './Navbar.css';
import HelpModal from './HelpModal';

function Navbar() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1>B2B Client Acquisition System</h1>
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


import React, { useState, useEffect } from 'react';
import './Navbar.css';

function Navbar({ onExport, onViewDatabase, onClearDatabase, stats }) {
  const [darkMode, setDarkMode] = useState(false);

  // Cargar preferencia de tema desde localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Toggle tema oscuro
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  };

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
          <button className="theme-toggle-btn" onClick={toggleDarkMode} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          
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


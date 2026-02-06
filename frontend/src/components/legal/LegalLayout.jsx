import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import './Legal.css';

const LegalLayout = ({ title, lastUpdated, children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Add noindex meta tag dynamically
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    const originalContent = meta.content;
    meta.content = 'noindex, nofollow';

    // Cleanup: restore original meta or remove if we created it
    return () => {
      if (originalContent) {
        meta.content = originalContent;
      } else {
        meta.remove();
      }
    };
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button 
          className="legal-back-btn" 
          onClick={() => navigate(user ? '/' : '/landing')}
        >
          <FiArrowLeft /> Volver al Inicio
        </button>

        <header className="legal-header">
          <h1>{title}</h1>
          <p>Última actualización: {lastUpdated}</p>
        </header>

        <main className="legal-content">
          {children}
        </main>

        <footer className="legal-footer">
          <p>© 2026 Dota Solutions. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default LegalLayout;

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BackButton.css';

function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // No mostrar en home
  if (location.pathname === '/') {
    return null;
  }

  return (
    <button 
      className="back-to-home-btn"
      onClick={() => navigate('/')}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Volver al inicio
    </button>
  );
}

export default BackButton;


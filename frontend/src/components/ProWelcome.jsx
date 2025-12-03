import React, { useEffect, useState } from 'react';
import './ProWelcome.css';

function ProWelcome({ onComplete }) {
  const [phase, setPhase] = useState('entering'); // entering, showing, disintegrating, done

  useEffect(() => {
    // Fase 1: Entrada (0.5s)
    const timer1 = setTimeout(() => setPhase('showing'), 500);
    
    // Fase 2: Mostrar (1.5s)
    const timer2 = setTimeout(() => setPhase('disintegrating'), 2000);
    
    // Fase 3: Desintegración completa (1.5s)
    const timer3 = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <div className={`pro-welcome-overlay ${phase}`}>
      <div className="pro-welcome-content">
        {/* Partículas de fondo */}
        <div className="particles-container">
          {[...Array(50)].map((_, i) => (
            <div 
              key={i} 
              className="particle"
              style={{
                '--delay': `${Math.random() * 0.5}s`,
                '--x': `${Math.random() * 200 - 100}px`,
                '--y': `${Math.random() * 200 - 100}px`,
                '--size': `${Math.random() * 8 + 4}px`,
                '--duration': `${Math.random() * 0.8 + 0.5}s`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Badge PRO principal */}
        <div className="pro-badge-container">
          <div className="pro-glow"></div>
          <div className="pro-badge">
            <span className="pro-icon">⚡</span>
            <span className="pro-text">PRO</span>
          </div>
          <div className="pro-subtitle">Bienvenido al siguiente nivel</div>
        </div>

        {/* Fragmentos para desintegración */}
        <div className="disintegration-fragments">
          {[...Array(100)].map((_, i) => (
            <div 
              key={i} 
              className="fragment"
              style={{
                '--delay': `${Math.random() * 0.3}s`,
                '--x': `${(Math.random() - 0.5) * 400}px`,
                '--y': `${(Math.random() - 0.5) * 400}px`,
                '--r': `${Math.random() * 720 - 360}deg`,
                '--duration': `${Math.random() * 0.6 + 0.4}s`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Ondas de energía */}
        <div className="energy-waves">
          <div className="wave wave-1"></div>
          <div className="wave wave-2"></div>
          <div className="wave wave-3"></div>
        </div>
      </div>
    </div>
  );
}

export default ProWelcome;


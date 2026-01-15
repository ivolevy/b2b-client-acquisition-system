import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkedAlt, FaPaperPlane, FaSearch, FaCheckCircle, FaRocket, FaCheck } from 'react-icons/fa';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Navbar Floating Pill */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <FaRocket /> Smart Leads
        </div>
        <div className="landing-nav-links">
          <span className="nav-link" onClick={() => document.getElementById('features').scrollIntoView({behavior: 'smooth'})}>Características</span>
          <span className="nav-link" onClick={() => document.getElementById('pricing').scrollIntoView({behavior: 'smooth'})}>Precios</span>
        </div>
        <button className="btn-login-nav" onClick={() => navigate('/')}>
          Iniciar Sesión
        </button>
      </nav>

      {/* Hero */}
      <header className="landing-hero">
        <div className="hero-content">
          <span className="hero-badge">Sistema B2B de Adquisición de Clientes</span>
          <h1 className="hero-title">
            Linkea empresas y contáctalas <br/>
            <span>Masivamente para vender más</span>
          </h1>
          <p className="hero-subtitle">
            Transforma Google Maps en tu base de datos. Extrae contactos verificados y automatiza tu alcance en frío con un solo clic.
          </p>
          <div className="hero-cta-group">
            <button className="btn-cta-primary" onClick={() => navigate('/')}>
              Comenzar Prueba Gratis
            </button>
            <button className="btn-cta-secondary" onClick={() => document.getElementById('how-it-works').scrollIntoView({behavior: 'smooth'})}>
              Ver Demo
            </button>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="landing-features">
        <div className="section-header">
          <h2 className="section-title">Potencia tu equipo de ventas</h2>
          <p className="section-desc">Todo lo que necesitas para escalar tu prospección outbound.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><FaMapMarkedAlt /></div>
            <h3 className="feature-title">Geolocalización Precisa</h3>
            <p className="feature-text">
              Dibuja un radio en el mapa y detecta todas las empresas de tu nicho. Accede a negocios locales que no sabías que existían.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FaSearch /></div>
            <h3 className="feature-title">Enriquecimiento de Datos</h3>
            <p className="feature-text">
              Obtén emails, teléfonos, Instagram, Facebook y LinkedIn de cada empresa. Datos frescos y actualizados al instante.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FaCheckCircle /></div>
            <h3 className="feature-title">Validación de Emails</h3>
            <p className="feature-text">
              Filtramos automáticamente correos inválidos para proteger tu reputación de dominio y asegurar entregabilidad.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FaPaperPlane /></div>
            <h3 className="feature-title">Campañas Masivas</h3>
            <p className="feature-text">
              Envía correos personalizados a cientos de prospectos simultáneamente usando plantillas pre-definidas.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="landing-pricing">
        <div className="pricing-header">
           <h2 className="section-title">Planes Simples</h2>
           <p className="section-desc">Comienza gratis y escala cuando lo necesites.</p>
        </div>

        <div className="pricing-grid">
          {/* Free Plan */}
          <div className="pricing-card">
            <div className="pricing-header">
              <h3 className="pricing-title">Free Trial</h3>
              <div className="pricing-price">$0</div>
              <p className="pricing-period">Para siempre (limitado)</p>
            </div>
            <ul className="pricing-features">
              <li className="pricing-feature"><FaCheck className="pricing-check" /> 5 Búsquedas diarias</li>
              <li className="pricing-feature"><FaCheck className="pricing-check" /> 50 Leads por búsqueda</li>
              <li className="pricing-feature"><FaCheck className="pricing-check" /> Validación básica</li>
              <li className="pricing-feature"><FaCheck className="pricing-check" /> Envío de emails manual</li>
            </ul>
            <button className="btn-pricing outline" onClick={() => navigate('/')}>Empezar Gratis</button>
          </div>

          {/* Pro Plan */}
          <div className="pricing-card pro">
            <span className="pricing-badge">Recomendado</span>
            <div className="pricing-header">
              <h3 className="pricing-title">Pro System</h3>
              <div className="pricing-price">$49<span style={{fontSize: '1rem', color: '#94a3b8'}}>/mo</span></div>
              <p className="pricing-period">Facturado anualmente</p>
            </div>
            <ul className="pricing-features">
              <li className="pricing-feature"><FaCheck className="pricing-check" /> Búsquedas Ilimitadas</li>
              <li className="pricing-feature"><FaCheck className="pricing-check" /> Leads Ilimitados</li>
              <li className="pricing-feature"><FaCheck className="pricing-check" /> Enriquecimiento de Redes Sociales</li>
              <li className="pricing-feature"><FaCheck className="pricing-check" /> Validación avanzada de emails</li>
              <li className="pricing-feature"><FaCheck className="pricing-check" /> Envíos Masivos (Bulk Sender)</li>
              <li className="pricing-feature"><FaCheck className="pricing-check" /> Soporte Prioritario</li>
            </ul>
            <button className="btn-pricing solid" onClick={() => window.location.href = 'mailto:admin@smartleads.com'}>Contactar Ventas</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 Smart Leads. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default LandingPage;

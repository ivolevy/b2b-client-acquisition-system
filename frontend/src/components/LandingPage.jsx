import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaMapMarkerAlt,
  FaClock,
  FaExclamationTriangle,
  FaTimesCircle,
  FaRedo,
  FaSearch,
  FaMagic,
  FaRocket,
  FaCheck,
  FaLinkedin,
  FaInstagram,
  FaWhatsapp,
  FaShieldAlt
} from 'react-icons/fa';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    // Mapping old IDs to new sections for compatibility
    let targetId = id;
    if (id === 'problema') targetId = 'modulos'; 
    if (id === 'sistema') targetId = 'modulos';
    
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Header / Navbar */}
      <header className="landing-header">
        <div className="container header-container">
          <div className="logo" onClick={() => navigate('/')}>
            <div className="logo-icon">
              <img src="/favicon.svg" alt="Smart Leads Logo" style={{ width: '24px', height: '24px' }} />
            </div>
            <span>Smart Leads</span>
          </div>
          <nav className="main-nav">
             {/* Updated Links per user request */}
            <button onClick={() => scrollToSection('modulos')}>Work smart</button>
            <button onClick={() => scrollToSection('pricing')}>Pricing</button>
            <button onClick={() => document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' })}>Contactanos</button>
          </nav>
          <div className="header-actions">
            {/* CTA removed per request */}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-text reveal">
            <h1>Dominá tu mercado.</h1>
            <p>Prospecta, contacta y cierra ventas B2B en piloto automático.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button className="btn-primary" onClick={() => navigate('/')}>
                Probar Gratis <FaArrowRight />
              </button>
              <button className="btn-secondary" onClick={() => scrollToSection('modulos')}>
                Ver Demo
              </button>
            </div>
          </div>
          <div className="hero-mockup reveal" style={{ animationDelay: '0.2s', position: 'relative' }}>
            <div className="browser-card dashboard-preview">
               <div className="browser-window-header">
                 <div className="browser-dots">
                   <span></span><span></span><span></span>
                 </div>
                 <div className="browser-address-bar">smartleads.ai/dashboard</div>
               </div>
               <img src="/images/hero.png" alt="Dashboard Mockup" />
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section (Bento Grid) */}
      <section className="modules-section" id="modulos">
        <div className="container">
          <div className="text-center reveal">
            <h2 className="section-title">Módulos de la Plataforma</h2>
            <p className="section-subtitle">Herramientas integradas para potenciar tu prospección.</p>
          </div>

          <div className="bento-grid reveal">
            {/* Card 1: Maps */}
            <div className="bento-card bento-map">
              <div className="bento-content">
                <h3>Búsqueda Geográfica</h3>
                <p>Encuentra empresas por rubro y ubicación exacta.</p>
                <div className="more-info">
                  <p>Filtra por código postal, barrio o dibuja tu zona en el mapa. Datos actualizados en tiempo real.</p>
                </div>
              </div>
              <div className="bento-visual">
                <div className="mini-map-visual">
                  {/* Abstract Map UI representation */}
                  <div className="map-point" style={{top: '40%', left: '30%'}}></div>
                  <div className="map-point" style={{top: '60%', left: '70%'}}></div>
                  <div className="map-point active" style={{top: '50%', left: '50%'}}></div>
                </div>
              </div>
            </div>

            {/* Card 2: Email Marketing (Featured) */}
            <div className="bento-card bento-email featured">
              <div className="bento-content text-center">
                <h3>Email Marketing Masivo</h3>
                <div className="highlight-text">e Inteligente</div>
                <p>Crea campañas dinámicas y envía correos a miles de contactos automáticamente.</p>
                <div className="more-info">
                  <p>Incluye rotación de IPs, calentamiento de cuentas y validación de emails para asegurar inbox delivery.</p>
                </div>
                <button className="btn-text-arrow" onClick={() => navigate('/')}>Empezar Ahora <FaArrowRight /></button>
              </div>
              <div className="bento-visual email-visual">
                <div className="email-interface">
                   <div className="email-header-line"></div>
                   <div className="email-body-line"></div>
                   <div className="email-body-line short"></div>
                   <div className="send-btn-mock"></div>
                </div>
              </div>
            </div>

            {/* Card 3: Data/Results */}
            <div className="bento-card bento-data">
               <div className="bento-content">
                <h3>Gestión de Resultados</h3>
                <p>Gestiona leads en tablas y exporta a CSV.</p>
                <div className="more-info">
                   <p>CRM integrado para trackear estados, notas y cierres de venta sin salir de la plataforma.</p>
                </div>
              </div>
              <div className="bento-visual">
                <div className="table-visual">
                  <div className="table-row"></div>
                  <div className="table-row"></div>
                  <div className="table-row"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Planes Simples</h2>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="plan-name">Starter</div>
              <div className="plan-price">$29</div>
              <ul className="plan-features">
                 <li><FaCheck /> 50 Búsquedas</li>
                 <li><FaCheck /> Email Marketing Básico</li>
              </ul>
              <button className="btn-outline" onClick={() => navigate('/')}>Comenzar</button>
            </div>

            <div className="pricing-card featured">
              <div className="plan-name">Pro</div>
              <div className="plan-price">$79</div>
              <ul className="plan-features">
                 <li><FaCheck /> Búsquedas Ilimitadas</li>
                 <li><FaCheck /> Email Marketing Avanzado</li>
                 <li><FaCheck /> Soporte Prioritario</li>
              </ul>
              <button className="btn-primary" onClick={() => navigate('/')}>Comenzar</button>
            </div>

            <div className="pricing-card">
              <div className="plan-name">Agency</div>
              <div className="plan-price">$199</div>
              <ul className="plan-features">
                 <li><FaCheck /> Todo Ilimitado</li>
                 <li><FaCheck /> API Access</li>
              </ul>
              <button className="btn-outline" onClick={() => navigate('/')}>Contactar</button>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer id="footer" className="footer-minimal">
        <div className="container">
          <div className="footer-flex">
            <div className="footer-brand">
              <span className="brand-text">Smart Leads</span>
              <span className="copyright">© 2026</span>
            </div>
            <div className="footer-links">
               <a href="#">Términos</a>
               <a href="#">Privacidad</a>
               <a href="mailto:solutionsdota@gmail.com">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

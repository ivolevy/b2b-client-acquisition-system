import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkedAlt, FaPaperPlane, FaSearch, FaCheckCircle, FaRocket, FaArrowRight } from 'react-icons/fa';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Navbar */}
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-container">
            <div className="landing-brand" onClick={() => navigate('/')}>
               {/* Rocket Icon same as Navbar.jsx logic via CSS/SVG if needed, currently using FaRocket consistent with App */}
               <FaRocket style={{color: 'white', fontSize: '1.2rem'}}/> 
               <h1>Smart Leads</h1>
            </div>

            <div className="landing-nav-links">
                <span className="nav-link" onClick={() => navigate('/')}>Inicio</span>
                <span className="nav-link" onClick={() => document.getElementById('features').scrollIntoView({behavior: 'smooth'})}>Características</span>
                <span className="nav-link" onClick={() => document.getElementById('pricing').scrollIntoView({behavior: 'smooth'})}>Precios</span>
            </div>

            <button className="btn-login" onClick={() => navigate('/')}>
               Iniciar Sesión
            </button>
        </div>
      </nav>

      {/* Visual Squares (Background Elements) */}
      <div className="visual-square square-1" style={{'--rot': '-15deg'}}></div>
      <div className="visual-square square-2" style={{'--rot': '10deg'}}></div>

      {/* Hero */}
      <header className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Convierte Google Maps en tu <br/>
            <em>Base de Datos</em>
          </h1>
          <p className="hero-subtitle">
            Encuentra empresas en cualquier zona, extrae sus datos de contacto verificados y envíales propuestas comerciales en piloto automático.
          </p>
          
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '10px'}}>
             <button className="btn-cta-primary" onClick={() => navigate('/')}>
                Comenzar Ahora <FaArrowRight />
             </button>
             <span style={{color: '#f472b6', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px'}} onClick={() => document.getElementById('features').scrollIntoView({behavior: 'smooth'})}>
                Ver cómo funciona <FaArrowRight size={12}/>
             </span>
          </div>

          <div className="stats-row">
             <div className="stat-card">
                <div className="stat-number">+1M</div>
                <div className="stat-label">Empresas Indexadas</div>
             </div>
             <div className="stat-card">
                <div className="stat-number">98%</div>
                <div className="stat-label">Precisión de Datos</div>
             </div>
             <div className="stat-card">
                <div className="stat-number">10x</div>
                <div className="stat-label">Más Ventas</div>
             </div>
             <div className="stat-card">
                 <div className="stat-number">24/7</div>
                 <div className="stat-label">Prospección Auto</div>
             </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="landing-features">
        <div className="section-header">
           <h2 className="section-title">Todo lo que necesitas para vender más</h2>
           <p className="section-desc">Una suite completa de inteligencia comercial y automatización de ventas B2B.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <h3 className="feature-title"><FaMapMarkedAlt style={{color: '#f472b6', marginRight: '8px'}}/> Búsqueda Geolocalizada</h3>
            <p className="feature-text">
              Dibuja un radio en el mapa y detecta todas las empresas de un rubro específico. Accede a negocios que no sabías que existían en tu zona objetivo.
            </p>
          </div>

          <div className="feature-card">
             <h3 className="feature-title"><FaSearch style={{color: '#f472b6', marginRight: '8px'}}/> Enriquecimiento de Datos</h3>
            <p className="feature-text">
              Automáticamente buscamos emails, teléfonos, Instagram, Facebook y LinkedIn de cada empresa detectada para que tengas múltiples puntos de contacto.
            </p>
          </div>

          <div className="feature-card">
             <h3 className="feature-title"><FaPaperPlane style={{color: '#f472b6', marginRight: '8px'}}/> Email Marketing</h3>
            <p className="feature-text">
              Envía correos personalizados masivos desde tu propia cuenta de Gmail. Usa plantillas profesionales y trackea aperturas y respuestas.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing / Contact */}
      <section id="pricing" className="pricing-section">
         <div className="pricing-box">
             <h2 className="section-title" style={{fontSize: '2.5rem', marginBottom: '20px'}}>¿Listo para escalar?</h2>
             <p className="pricing-cta-text">
                 Deja de perder tiempo buscando clientes manualmente. Automatiza tu adquisición hoy mismo.
                 <br/><br/>
                 Contacta a un administrador para activar tu <strong>Prueba Gratuita</strong>.
             </p>
             
             <button className="btn-cta-primary" onClick={() => window.location.href = 'mailto:admin@smartleads.com'}>
                 Solicitar Cuenta <FaArrowRight />
             </button>
         </div>
      </section>

      {/* Footer */}
      <footer className="footer-dota">
         <div style={{marginBottom: '40px'}}>
             <h2 style={{fontSize: '2rem', fontFamily: 'Playfair Display', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
                <FaRocket color="#f472b6"/> Smart Leads
             </h2>
             <div style={{display: 'flex', justifyContent: 'center', gap: '20px'}}>
                 <span style={{cursor: 'pointer'}}>Términos</span>
                 <span style={{cursor: 'pointer'}}>Privacidad</span>
                 <span style={{cursor: 'pointer'}}>Soporte</span>
             </div>
         </div>
        <p>© 2026 Smart Leads. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default LandingPage;

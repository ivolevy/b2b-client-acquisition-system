import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkedAlt, FaPaperPlane, FaSearch, FaCheckCircle, FaRocket } from 'react-icons/fa';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <FaRocket /> Smart Leads
        </div>
        <div className="landing-nav-links">
          <span className="nav-link" onClick={() => document.getElementById('features').scrollIntoView({behavior: 'smooth'})}>Características</span>
          <span className="nav-link" onClick={() => document.getElementById('how-it-works').scrollIntoView({behavior: 'smooth'})}>Cómo funciona</span>
        </div>
        <button className="btn-login" onClick={() => navigate('/')}>
          Iniciar Sesión
        </button>
      </nav>

      {/* Hero */}
      <header className="landing-hero">
        <div className="hero-content">
          <span className="hero-badge">B2B Client Acquisition System</span>
          <h1 className="hero-title">
            Convierte Google Maps en tu <br/>
            <span>Base de Datos de Clientes</span>
          </h1>
          <p className="hero-subtitle">
            Encuentra empresas en cualquier zona, extrae sus datos de contacto verificados y envíales propuestas comerciales en piloto automático.
          </p>
          <div className="hero-cta-group">
            <button className="btn-cta-primary" onClick={() => navigate('/')}>
              Comenzar Ahora
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
          <h2 className="section-title">Todo lo que necesitas para vender más</h2>
          <p className="section-desc">Una suite completa de prospección y ventas B2B.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><FaMapMarkedAlt /></div>
            <h3 className="feature-title">Búsqueda Geolocalizada</h3>
            <p className="feature-text">
              Dibuja un radio en el mapa y detecta todas las empresas de un rubro específico. Accede a negocios que no sabías que existían.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FaSearch /></div>
            <h3 className="feature-title">Enriquecimiento de Datos</h3>
            <p className="feature-text">
              Automáticamente buscamos emails, teléfonos, Instagram, Facebook y LinkedIn de cada empresa detectada.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FaCheckCircle /></div>
            <h3 className="feature-title">Contactos Verificados</h3>
            <p className="feature-text">
              Nuestro sistema valida la existencia de los emails para asegurar una alta tasa de entregabilidad y evitar rebotes.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><FaPaperPlane /></div>
            <h3 className="feature-title">Email Marketing Integrado</h3>
            <p className="feature-text">
              Envía correos personalizados masivos desde tu propia cuenta de Gmail. Usa plantillas profesionales y trackea los resultados.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="landing-steps">
        <div className="section-header">
          <h2 className="section-title">Cómo funciona</h2>
        </div>

        <div className="steps-container">
          <div className="step-row">
            <div className="step-image">
               {/* Placeholder for screenshot */}
               <div style={{color: '#94a3b8'}}>Mapa Interactivo</div>
            </div>
            <div className="step-content">
              <div className="step-number">01</div>
              <h3 className="step-title">Elige tu zona y rubro</h3>
              <p className="step-desc">
                Selecciona una ubicación en el mapa, define un radio de búsqueda (ej. 5km) y el tipo de negocio que buscas (ej. "Arquitectos").
              </p>
            </div>
          </div>

          <div className="step-row reverse">
            <div className="step-image">
               <div style={{color: '#94a3b8'}}>Tabla de Resultados</div>
            </div>
            <div className="step-content">
              <div className="step-number">02</div>
              <h3 className="step-title">Obtén los datos</h3>
              <p className="step-desc">
                El sistema escaneará la zona en segundos, entregándote una lista limpia con nombres, direcciones, emails y redes sociales.
              </p>
            </div>
          </div>

          <div className="step-row">
            <div className="step-image">
               <div style={{color: '#94a3b8'}}>Módulo de Email</div>
            </div>
            <div className="step-content">
              <div className="step-number">03</div>
              <h3 className="step-title">Contacta y Vende</h3>
              <p className="step-desc">
                Selecciona los prospectos que te interesan, elige una plantilla de correo persuasiva y lanza tu campaña con un solo clic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2024 Smart Leads. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default LandingPage;

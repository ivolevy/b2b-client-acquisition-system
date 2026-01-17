import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaArrowRight, 
  FaMapMarkerAlt, 
  FaRobot, 
  FaEnvelopeOpenText, 
  FaDatabase, 
  FaCheck, 
  FaLinkedin, 
  FaTwitter, 
  FaInstagram,
  FaBolt
} from 'react-icons/fa';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
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
            <div className="logo-icon"><FaBolt /></div>
            <span>Smart Leads</span>
          </div>
          <nav className="main-nav">
            <button onClick={() => scrollToSection('services')}>Servicios</button>
            <button onClick={() => scrollToSection('features')}>Funciones</button>
            <button onClick={() => scrollToSection('pricing')}>Precios</button>
            <button onClick={() => navigate('/blog')}>Blog</button>
            <button onClick={() => navigate('/contact')}>Contacto</button>
          </nav>
          <div className="header-actions">
            <button className="btn-login" onClick={() => navigate('/')}>Log in</button>
            <button className="btn-primary-small" onClick={() => navigate('/')}>Empezar ahora</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-text">
            <h1>Software that saves money and drives revenue</h1>
            <p>
              Construimos soluciones personalizadas que reducen costes operativos, 
              automatizan el trabajo manual e incrementan tus documentos.
            </p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              Contactanos <FaArrowRight />
            </button>
          </div>
          <div className="hero-mockup">
            <div className="laptop-wrapper">
              <img src="https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?q=80&w=2071&auto=format&fit=crop" alt="Dashboard Mockup" />
            </div>
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="services" className="ai-section">
        <div className="container">
          <h2 className="section-title text-center">Potenciado por Inteligencia Artificial</h2>
          
          <div className="ai-grid">
            <div className="ai-card">
              <div className="card-icon"><FaMapMarkerAlt /></div>
              <h3>Geolocalización Avanzada</h3>
              <p>Centra empresas con conocimiento y revisa inversamente y cada configuración.</p>
            </div>
            <div className="ai-card">
              <div className="card-icon"><FaRobot /></div>
              <h3>Por Inteligencia Artificial</h3>
              <p>Botones de contacto, activada la generación de emails automáticamente.</p>
            </div>
            <div className="ai-card">
              <div className="card-icon"><FaEnvelopeOpenText /></div>
              <h3>Potenciado por Indirectamente</h3>
              <p>Conecta centros positivos y genera artificial, profesionalmente e inmediatamente.</p>
            </div>
          </div>

          <div className="dashboard-preview">
             <img src="https://images.unsplash.com/photo-1551288049-bbda48658a7d?q=80&w=2070&auto=format&fit=crop" alt="Dashboard Feature" />
          </div>
        </div>
      </section>

      {/* Platform Modules */}
      <section id="features" className="modules-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Módulos de la Plataforma</h2>
            <p className="section-subtitle">
              Domina la prospección con herramientas integradas, destacando nuestro potente motor de email marketing masivo.
            </p>
          </div>

          <div className="modules-grid">
            <div className="module-item">
              <div className="module-icon"><FaMapMarkerAlt /></div>
              <div className="module-content">
                <h3>Geolocalización Avanzada.</h3>
                <p>Encuentra empresas con precisión y revisa inversamente cada detalle configurado.</p>
              </div>
            </div>
            <div className="module-item">
              <div className="module-icon"><FaBolt /></div>
              <div className="module-content">
                <h3>Por Inteligencia Artificial</h3>
                <p>Decisiones de contacto, activada la generación de textos automáticamente.</p>
              </div>
            </div>
            <div className="module-item">
              <div className="module-icon"><FaEnvelopeOpenText /></div>
              <div className="module-content">
                <h3>Potenciado por Emailing</h3>
                <p>Conecta con potenciales clientes y genera respuestas profesionales al instante.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Planes Flexibles</h2>
            <p className="section-subtitle">Elige el proceso que mejor se adapte a tus beneficios SaaS.</p>
          </div>

          <div className="pricing-grid">
            {/* Plan Premium */}
            <div className="pricing-card">
              <div className="plan-name">Premium</div>
              <div className="plan-price">$10<span>/mo</span></div>
              <div className="plan-desc">10 búsquedas por proceso</div>
              <ul className="plan-features">
                <li><FaCheck /> Premium avanzada</li>
                <li><FaCheck /> Geolocalización Artificial</li>
                <li><FaCheck /> Recortes a cuenta</li>
                <li><FaCheck /> Geolocalización Áreas</li>
              </ul>
              <button className="btn-dark" onClick={() => navigate('/')}>Suscribirse</button>
            </div>

            {/* Plan Plano (Featured) */}
            <div className="pricing-card featured">
              <div className="plan-name">Plano</div>
              <div className="plan-price">$29<span>/mo</span></div>
              <div className="plan-desc">50 búsquedas por proceso</div>
              <ul className="plan-features">
                <li><FaCheck /> Premium avanzada</li>
                <li><FaCheck /> Inteligencia Artificial</li>
                <li><FaCheck /> Gestión de filtros</li>
                <li><FaCheck /> Geolocalización Manía</li>
              </ul>
              <button className="btn-dark" onClick={() => navigate('/')}>Suscribirse</button>
            </div>

            {/* Plan Profio */}
            <div className="pricing-card">
              <div className="plan-name">Profio</div>
              <div className="plan-price">$79<span>/mo</span></div>
              <div className="plan-desc">Ilimitado búsquedas por proceso</div>
              <ul className="plan-features">
                <li><FaCheck /> Premium avanzada</li>
                <li><FaCheck /> Inteligencia Artificial</li>
                <li><FaCheck /> Gestión de Resultado</li>
                <li><FaCheck /> Exportación Analítica de Datos</li>
                <li><FaCheck /> Interactividad y exporta a CSV/PDF</li>
              </ul>
              <button className="btn-dark" onClick={() => navigate('/')}>Suscribirse</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-container">
          <div className="footer-column">
            <h4>About Us</h4>
            <ul>
              <li>Our Vision</li>
              <li>Success Stories</li>
              <li>Brand Identity</li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Resources</h4>
            <ul>
              <li>About Us</li>
              <li>Careers</li>
              <li>Blog</li>
              <li>Templates</li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Teamline</h4>
            <ul>
              <li>Pricing</li>
              <li>Contact Us</li>
              <li>Guidelines</li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Contact Us</h4>
            <div className="social-links">
              <FaLinkedin />
              <FaTwitter />
              <FaInstagram />
            </div>
          </div>
        </div>
        <div className="footer-bottom">
           {/* Decorative elements can go here */}
           <div className="star-icon">✦</div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

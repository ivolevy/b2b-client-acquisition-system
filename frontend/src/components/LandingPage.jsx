import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaMapMarkerAlt,
  FaBrain,
  FaRobot,
  FaEnvelopeOpenText,
  FaDatabase,
  FaCheck,
  FaLinkedin,
  FaInstagram,
  FaWhatsapp,
  FaTwitter,
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
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>

      <header className="landing-header">
        <div className="container header-container">
          <div className="logo" onClick={() => navigate('/')}>
            <div className="logo-icon">
              <img src="/favicon.svg" alt="Smart Leads Logo" style={{ width: '24px', height: '24px' }} />
            </div>
            <span>Smart Leads</span>
          </div>
          <nav className="main-nav">
            <button onClick={() => scrollToSection('uso')}>Uso</button>
            <button onClick={() => scrollToSection('pricing')}>Pricing</button>
            <button onClick={() => scrollToSection('uso')}>Contacto</button>
          </nav>
          <div className="header-actions">
            <button className="btn-login" onClick={() => navigate('/')}>Log in</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-text reveal">
            <h1>De Búsqueda en Google Maps a Cliente Cerrado en Minutos.</h1>
            <p>Extrae leads calificados, valida sus emails y automatiza tu contacto. La herramienta definitiva de prospección B2B.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button className="btn-primary" onClick={() => navigate('/')}>
                Probar Gratis Ahora <FaArrowRight />
              </button>
               <button className="btn-secondary-outline" style={{ borderColor: 'var(--lp-gray)', color: 'var(--lp-gray)' }} onClick={() => navigate('/')}>
                Ver Demo
              </button>
            </div>
          </div>
          <div className="hero-mockup reveal" style={{ animationDelay: '0.2s' }}>
            <div className="browser-card">
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

      {/* AI Section (Uses parameters.png) */}
      <section className="ai-section" id="uso">
        <div className="container">
          <div className="text-center reveal">
            <h2 className="section-title">Todo lo que necesitas para vender más</h2>
          </div>
          
          {/* Bento Grid Layout */}
          <div className="bento-grid">
            <div className="bento-card reveal" style={{ animationDelay: '0.1s' }}>
              <div className="card-content">
                <div className="card-icon"><FaMapMarkerAlt /></div>
                <h3>Scraping de Google Maps</h3>
                <p>Encuentra miles de empresas en tu nicho con un clic. Filtra por ubicación, rubro y calificación.</p>
              </div>
            </div>

            <div className="bento-card reveal" style={{ animationDelay: '0.2s' }}>
              <div className="card-content">
                <div className="card-icon"><FaDatabase /></div>
                <h3>Enriquecimiento y Exportación</h3>
                <p>Obtén emails y teléfonos validados. <strong>Descarga tus listas en CSV o PDF</strong> listas para importar a tu CRM o Excel.</p>
              </div>
            </div>

            <div className="bento-card reveal" style={{ animationDelay: '0.3s' }}>
              <div className="card-icon"><FaEnvelopeOpenText /></div>
              <div>
                <h3>Email Marketing Integrado</h3>
                <p>Envía campañas de frío personalizadas, usa plantillas probadas y automatiza tus seguimientos para cerrar más ventas.</p>
              </div>
            </div>
          </div>

          <div className="dashboard-preview browser-card reveal" style={{ animationDelay: '0.4s' }}>
             <div className="browser-window-header">
               <div className="browser-dots">
                 <span></span><span></span><span></span>
               </div>
               <div className="browser-address-bar">smartleads.ai/dashboard/results</div>
             </div>
             <img src="/images/results.png" alt="Live Results Dashboard" />
          </div>
        </div>
      </section>

      {/* New Feature Highlight Section (Email Marketing) */}
      {/* New Feature Highlight Section (Email Marketing) - Redesigned */}
      <section className="feature-highlight-section">
        <div className="container feature-container reversed">
          <div className="feature-image reveal">
             <div className="browser-card">
               <div className="browser-window-header">
                 <div className="browser-dots">
                   <span></span><span></span><span></span>
                 </div>
                 <div className="browser-address-bar">smartleads.ai/campaigns</div>
               </div>
               <img src="/images/email marketing.png" alt="Email Marketing Campaign" />
             </div>
          </div>
          
          <div className="feature-content reveal" style={{ animationDelay: '0.2s' }}>
            <div className="pill-badge">Email Masivo & Automatizado</div>
            <h2>Tu Motor de Email Marketing Masivo</h2>
            <p>
              Llega a miles de clientes potenciales en segundos. Crea campañas masivas con personalización inteligente 
              que contactan, hacen seguimiento y agendan reuniones por ti.
            </p>
            
            <div className="benefits-grid">
                <div className="benefit-item">
                  <div className="benefit-icon"><FaRobot /></div>
                  <div className="benefit-text">
                    <strong>Personalización a Escala</strong>
                    <span>Envía miles de emails que parecen unicos.</span>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon"><FaBolt /></div>
                  <div className="benefit-text">
                    <strong>Envío Masivo Inteligente</strong>
                    <span>Llega a la bandeja de entrada, no al SPAM.</span>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon"><FaCheck /></div>
                  <div className="benefit-text">
                    <strong>Seguimiento Automático</strong>
                    <span>Insiste hasta obtener respuesta.</span>
                  </div>
                </div>
            </div>

            <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '32px' }}>
              Iniciar Campaña Masiva <FaArrowRight />
            </button>
          </div>
        </div>
      </section>

      {/* Platform Modules */}
      <section id="features" className="modules-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Módulos de la Plataforma</h2>
            <p className="section-subtitle">
              Domina la prospección con herramientas integradas.
            </p>
          </div>

          <div className="modules-grid">
            <div className="module-item">
              <div className="module-icon"><FaMapMarkerAlt /></div>
              <div className="module-content">
                <h3>Geolocalización Avanzada</h3>
                <p>Encuentra empresas con precisión y revisa cada detalle configurado.</p>
              </div>
            </div>
            <div className="module-item">
              <div className="module-icon"><FaBolt /></div>
              <div className="module-content">
                <h3>Automatización Total</h3>
                <p>Decisiones de contacto y textos generados automáticamente.</p>
              </div>
            </div>
            <div className="module-item">
              <div className="module-icon"><FaEnvelopeOpenText /></div>
              <div className="module-content">
                <h3>Emailing Potente</h3>
                <p>Conecta con potenciales clientes y genera respuestas profesionales.</p>
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
            <p className="section-subtitle">Elige el plan que mejor se adapte a tus necesidades.</p>
          </div>

          <div className="pricing-grid">
            {/* Plan Premium */}
            <div className="pricing-card">
              <div className="plan-name">Starter</div>
              <div className="plan-price">$10<span>/mo</span></div>
              <div className="plan-desc">Ideal para comenzar</div>
              <ul className="plan-features">
                <li><FaCheck /> 10 búsquedas mensuales</li>
                <li><FaCheck /> Filtros básicos</li>
                <li><FaCheck /> Soporte por email</li>
              </ul>
              <button className="btn-dark" onClick={() => navigate('/')}>Suscribirse</button>
            </div>

            {/* Plan Plano (Featured) */}
            <div className="pricing-card featured">
              <div className="plan-name">Pro</div>
              <div className="plan-price">$29<span>/mo</span></div>
              <div className="plan-desc">El más popular</div>
              <ul className="plan-features">
                <li><FaCheck /> 50 búsquedas mensuales</li>
                <li><FaCheck /> Inteligencia Artificial</li>
                <li><FaCheck /> Email Marketing</li>
                <li><FaCheck /> Soporte prioritario</li>
              </ul>
              <button className="btn-dark" onClick={() => navigate('/')}>Suscribirse</button>
            </div>

            {/* Plan Profio */}
            <div className="pricing-card">
              <div className="plan-name">Enterprise</div>
              <div className="plan-price">$79<span>/mo</span></div>
              <div className="plan-desc">Para grandes equipos</div>
              <ul className="plan-features">
                <li><FaCheck /> Búsquedas ilimitadas</li>
                <li><FaCheck /> API Access</li>
                <li><FaCheck /> Exportación CSV/PDF</li>
                <li><FaCheck /> Account Manager dedicado</li>
              </ul>
              <button className="btn-dark" onClick={() => navigate('/')}>Suscribirse</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      {/* Footer Emotional */}
      <footer className="footer-emotional">
        <div className="container">
          <div className="footer-content">
            <div className="footer-left">
              <h4>Smart Leads</h4>
              <p>Powered by <a href="https://www.linkedin.com/in/ivan-levy/" target="_blank" rel="noopener noreferrer">Ivan Levy</a></p>
            </div>
            
            <div className="footer-center">

               <p className="copyright">© 2026 Smart Leads. All rights reserved.</p>
               <div className="dota-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '2rem' }}>
                 <img src="/favicon.svg" alt="Smart Leads Logo" style={{ width: '40px', height: '40px' }} />
               </div>
            </div>

            <div className="footer-right">
              <div className="social-icons">
                <a href="https://www.linkedin.com/in/ivan-levy/" target="_blank" rel="noreferrer"><FaLinkedin /></a>
                <a href="#"><FaInstagram /></a>
                <a href="#"><FaWhatsapp /></a>
              </div>
              <p className="contact-email">solutionsdota@gmail.com</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

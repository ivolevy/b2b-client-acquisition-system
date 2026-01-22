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
            <div className="logo-icon">
              <img src="/favicon.svg" alt="Smart Leads Logo" style={{ width: '24px', height: '24px' }} />
            </div>
            <span>Smart Leads</span>
          </div>
          <nav className="main-nav">
            <button onClick={() => scrollToSection('problema')}>Por qué Smart Leads</button>
            <button onClick={() => scrollToSection('sistema')}>El Sistema</button>
            <button onClick={() => scrollToSection('pricing')}>Precios</button>
          </nav>
          <div className="header-actions">
            <button className="btn-primary-small" onClick={() => navigate('/')}>Empezar ahora</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-text reveal">
            <h1>Deja de buscar clientes en Google Maps a mano. Automatiza tu prospección hoy.</h1>
            <p>Extrae cientos de empresas locales con un clic, obtén correos verificados y programa secuencias de email que caen en la bandeja de entrada, no en spam.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button className="btn-primary" onClick={() => navigate('/')}>
                Probar Gratis Ahora <FaArrowRight />
              </button>
            </div>
          </div>
          <div className="hero-mockup reveal" style={{ animationDelay: '0.2s', position: 'relative' }}>
            <div className="floating-results-tag">Resultados en &lt; 1 minuto</div>
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

      {/* Agitation Section (The Pain) */}
      <section className="agitation-section" id="problema">
        <div className="container">
          <div className="text-center reveal">
            <h2 className="section-title">¿Por qué el 90% de la prospección en frío falla?</h2>
          </div>
          <div className="agitation-grid">
            <div className="agitation-card reveal" style={{ animationDelay: '0.1s' }}>
              <div className="agitation-icon"><FaClock /></div>
              <h3>Pérdida de Tiempo</h3>
              <p>Copiar y pegar datos de Maps es un trabajo de esclavos. Perdés horas que podrías usar cerrando ventas.</p>
            </div>
            <div className="agitation-card reveal" style={{ animationDelay: '0.2s' }}>
              <div className="agitation-icon"><FaTimesCircle /></div>
              <h3>Correos Rebotados</h3>
              <p>Enviar a emails falsos o no verificados destruye tu reputación de envío y te manda directo a SPAM.</p>
            </div>
            <div className="agitation-card reveal" style={{ animationDelay: '0.3s' }}>
              <div className="agitation-icon"><FaRedo /></div>
              <h3>Falta de Seguimiento</h3>
              <p>El 80% de las ventas se cierran tras el 5to contacto. Si no automatizás, estás dejando dinero en la mesa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The 3-Step System (The Solution) */}
      <section className="step-section" id="sistema">
        <div className="container">
          <div className="text-center reveal">
            <h2 className="section-title">Vende más con nuestro Sistema de 3 Pasos</h2>
            <p className="section-subtitle">Pasamos de "explicar funciones" a entregarte resultados reales.</p>
          </div>
          
          <div className="steps-timeline reveal">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="card-icon" style={{margin: '0 auto 24px'}}><FaSearch /></div>
              <h3>Escaneo Inteligente</h3>
              <p>Elige rubro y ciudad. Nuestra tecnología extrae los datos y los limpia por ti en segundos.</p>
            </div>

            <div className="step-item">
              <div className="step-number">2</div>
              <div className="card-icon" style={{margin: '0 auto 24px'}}><FaMagic /></div>
              <h3>Enriquecimiento Pro</h3>
              <p>Validamos teléfonos y emails en tiempo real. Eliminamos los datos basura para proteger tu envío.</p>
            </div>

            <div className="step-item">
              <div className="step-number">3</div>
              <div className="card-icon" style={{margin: '0 auto 24px'}}><FaRocket /></div>
              <h3>Cierre en Automático</h3>
              <p>Crea campañas que hacen el seguimiento por ti hasta que te respondan. Caé en el Inbox siempre.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Emphasis Section (Anti-Spam) */}
      <section className="feature-highlight-section" style={{background: '#f8fafc'}}>
        <div className="container feature-container">
          <div className="feature-content reveal">
            <div className="pill-badge" style={{marginBottom: '20px'}}><FaShieldAlt /> 100% Inbox Deliverability</div>
            <h2>Olvídate de la carpeta de SPAM</h2>
            <p>
              Smart Leads utiliza rotación de cuentas y validación de sintaxis proactiva para asegurar que cada email 
              que envíes sea tratado como prioritario por los servidores de correo.
            </p>
            <div className="benefits-grid">
                <div className="benefit-item">
                  <div className="benefit-icon"><FaCheck /></div>
                  <div className="benefit-text">
                    <strong>Validación de Emails</strong>
                    <span>Nunca envíes a un correo inexistente.</span>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon"><FaCheck /></div>
                  <div className="benefit-text">
                    <strong>Headers Optimizados</strong>
                    <span>Tu reputación de dominio se mantiene intacta.</span>
                  </div>
                </div>
            </div>
          </div>
          <div className="feature-image reveal" style={{animationDelay: '0.2s'}}>
             <div className="browser-card">
               <img src="/images/results.png" alt="Email Monitoring" />
             </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Planes diseñados para crecer</h2>
            <p className="section-subtitle">Empieza gratis y escala tu prospección a medida que cierres clientes.</p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card reveal">
              <div className="plan-name">Prueba</div>
              <div className="plan-price">$10<span>/mes</span></div>
              <div className="plan-desc">Para probar el motor</div>
              <ul className="plan-features">
                <li><FaCheck /> 10 búsquedas mensuales</li>
                <li><FaCheck /> Filtros inteligentes</li>
                <li><FaCheck /> Soporte estándar</li>
              </ul>
              <button className="btn-dark" onClick={() => navigate('/')}>Suscribirse</button>
            </div>

            <div className="pricing-card featured reveal" style={{animationDelay: '0.1s'}}>
              <div className="premium-badge">Más Rentable</div>
              <div className="plan-name">Pro</div>
              <div className="plan-price">$29<span>/mes</span></div>
              <div className="plan-desc">El favorito de las agencias</div>
              <ul className="plan-features">
                <li><FaCheck /> 50 búsquedas mensuales</li>
                <li><FaCheck /> Enriquecimiento de Emails</li>
                <li><FaCheck /> Secuencias Automatizadas</li>
                <li><FaCheck /> Soporte Prioritario</li>
              </ul>
              <button className="btn-primary" style={{width: '100%'}} onClick={() => navigate('/')}>Suscribirse</button>
            </div>

            <div className="pricing-card reveal" style={{animationDelay: '0.2s'}}>
              <div className="plan-name">Enterprise</div>
              <div className="plan-price">$79<span>/mes</span></div>
              <div className="plan-desc">Sin límites para equipos pro</div>
              <ul className="plan-features">
                <li><FaCheck /> Búsquedas ilimitadas</li>
                <li><FaCheck /> **Consultoría de Copywriting**</li>
                <li><FaCheck /> **Setup Dominio Personalizado**</li>
                <li><FaCheck /> Account Manager dedicado</li>
              </ul>
              <button className="btn-dark" onClick={() => navigate('/')}>Suscribirse</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-emotional">
        <div className="container">
          <div className="footer-content">
            <div className="footer-left">
              <h4>Smart Leads</h4>
              <p>Powered by <a href="https://www.linkedin.com/in/ivan-levy/" target="_blank" rel="noopener noreferrer">Ivan Levy</a></p>
            </div>
            <div className="footer-center">
               <p className="copyright">© 2026 Smart Leads. All rights reserved.</p>
            </div>
            <div className="footer-right">
              <p className="contact-email">solutionsdota@gmail.com</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

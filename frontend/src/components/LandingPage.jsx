import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowRight, 
  FiCheck, 
  FiMapPin, 
  FiMail, 
  FiDatabase, 
  FiGlobe,
  FiShield,
  FiZap,
  FiTrendingUp,
  FiMenu,
  FiX
} from 'react-icons/fi';
import { FaLinkedin, FaTwitter, FaGithub, FaGoogle } from 'react-icons/fa';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`landing-page dark-theme ${mobileMenuOpen ? 'menu-open' : ''}`}>
      
      {/* --- NAVBAR (Floating Pill Style) --- */}
      <header className="landing-header">
        <div className="header-container">
          <div className="logo" onClick={() => navigate('/')}>
            <div className="logo-icon">
              <img src="/favicon.svg" alt="SL" style={{ width: '24px', height: '24px' }} />
            </div>
            <span>Smart Leads</span>
          </div>

          <nav className="main-nav desktop-nav">
             <button onClick={() => scrollToSection('search-engine')}>Módulos</button>
             <button onClick={() => scrollToSection('pricing')}>Precios</button>
             <button onClick={() => scrollToSection('testimonials')}>Testimonios</button>
             <button onClick={() => document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' })}>Contactanos</button>
          </nav>

          <div className="header-actions">
            {/* CTA removed per request */}
            <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>

      </header>

      {/* Mobile Nav Overlay - Moved outside header to avoid transform context issues */}
      <div 
        className={`mobile-nav ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)} // Close when clicking backdrop
      >
         <div 
           className="mobile-nav-content"
           onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside drawer
         >
           <div className="mobile-nav-header">
              <button 
                className="drawer-close-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FiX />
              </button>
           </div>

           <div className="mobile-nav-links">
             <button onClick={() => scrollToSection('search-engine')}>
               <span className="nav-num">01</span> Módulos
             </button>
             <button onClick={() => scrollToSection('pricing')}>
               <span className="nav-num">02</span> Precios
             </button>
             <button onClick={() => scrollToSection('testimonials')}>
               <span className="nav-num">03</span> Testimonios
             </button>
             <button onClick={() => {
               setMobileMenuOpen(false);
               document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' });
             }}>
               <span className="nav-num">04</span> Contactanos
             </button>
           </div>
           
           <div className="mobile-nav-footer">
              <div className="mobile-socials">
                <a href="#"><FaTwitter /></a>
                <a href="#"><FaLinkedin /></a>
                <a href="#"><FaGithub /></a>
              </div>
              <p>© 2026 Smart Leads Inc.</p>
           </div>
         </div>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="hero-section">
        <div className="hero-bg-glow"></div>
        <div className="container hero-content">
          <div className="hero-text">
            <div className="badge-pill">
              <span className="badge-dot"></span>
              <span className="badge-text">Nueva Versión 2.0 Disponible</span>
            </div>
            <h1>
              Consigue Clientes B2B <br />
              <span className="text-gradient">100x Más Rápido con IA</span>
            </h1>
            <p className="hero-subtext">
              Tu máquina de ventas autónoma. Extrae leads de Google Maps, enriquecelos con Inteligencia Artificial
              y contáctalos masivamente. <strong>100% Automático. Calidad Militar.</strong>
            </p>
            <div className="hero-buttons">
              <button className="btn-primary btn-lg" onClick={() => navigate('/')}>
                Empieza Gratis <FiArrowRight />
              </button>
              <button className="btn-secondary btn-lg" onClick={() => scrollToSection('features')}>
                Ver Demo
              </button>
            </div>
            <div className="hero-trust">
              <p>Confiado por +500 empresas modernas</p>
              <div className="trust-logos">
                 <span>ACME Corp</span>
                 <span>Stark Ind</span>
                 <span>Wayne Ent</span>
                 <span>Cyberdyne</span>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="dashboard-mockup-3d">
              <div className="mockup-header">
                <div className="dots"><span></span><span></span><span></span></div>
                <div className="bar">smartleads.ai/dashboard</div>
              </div>
              <img src="/images/hero.png" alt="Dashboard Interface" className="mockup-img" onError={(e) => {
                  e.target.onerror = null; 
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML += '<div class="fallback-mockup">Dashboard Preview</div>';
              }}/>
              
              {/* Floating Cards (Decorations) */}
              <div className="float-card card-1">
                <FiCheck className="icon-success" />
                <div>
                  <strong>1,240 Leads</strong>
                  <span>Extraídos hoy</span>
                </div>
              </div>
              <div className="float-card card-2">
                <FiMail className="icon-mail" />
                <div>
                  <strong>Campañas Activas</strong>
                  <span>45% Open Rate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- MODULE 1: DATA EXTRACTION (Full Width) --- */}
      <section id="search-engine" className="product-module-section">
        <div className="container module-layout">
          <div className="module-content">
             <div className="module-number">01</div>
             <h2>Motor de Búsqueda con IA</h2>
             <p className="module-lead">
               No más bases de datos genéricas. Nuestra IA escanea la web en tiempo real para encontrar leads frescos que tu competencia no tiene.
             </p>
             <div className="module-details">
               <p>
                 Ingresa <strong>Rubro, Radio y Dirección</strong>. Nuestro algoritmo recorre la web para encontrar empresas que coinciden con tu búsqueda.
               </p>
               <ul className="detail-list">
                 <li><FiCheck /> <strong>Filtros Estrictos:</strong> Solo contactos con Email y Teléfono verificado</li>
                 <li><FiCheck /> <strong>Bot de Scrapeo Social:</strong> Detecta automáticamente redes sociales</li>
                 <li><FiCheck /> <strong>Parámetros Precisos:</strong> Define el radio exacto de búsqueda en km</li>
               </ul>
             </div>
          </div>
          <div className="module-visual">
             {/* Open Visual - No Card */}
             <div className="visual-display-open">
                <FiMapPin className="hero-icon-faded" />
                <div className="data-stream-vertical">
                   <div className="stream-item"><span>Consultora Tech</span> <small>Buenos Aires</small></div>
                   <div className="stream-item"><span>Estudio Jurídico</span> <small>CABA</small></div>
                   <div className="stream-item"><span>Agencia Marketing</span> <small>Córdoba</small></div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- MODULE 2: VERIFICATION & ENRICHMENT (Full Width - Reversed) --- */}
      <section className="product-module-section">
        <div className="container module-layout reverse">
          <div className="module-content">
             <div className="module-number">02</div>
             <h2>Enriquecimiento de Datos</h2>
             <p className="module-lead">
               Un nombre y un teléfono no son suficientes. Transformamos datos crudos en inteligencia de negocio.
             </p>
             <div className="module-details">
               <p>
                 Nuestro sistema analiza la presencia digital de cada prospecto para validar su calidad antes de que gastes un crédito.
               </p>
               <div className="enrichment-grid-text">
                  <div>
                    <h4><FiShield /> Verificación Emails</h4>
                    <p>Validación automática para proteger tu reputación y minimizar rebotes.</p>
                  </div>
                  <div>
                    <h4><FiTrendingUp /> Social Score</h4>
                    <p>Validación de perfiles en LinkedIn y actividad en redes.</p>
                  </div>
               </div>
             </div>
          </div>
          <div className="module-visual">
             <div className="visual-display-open">
                <FiDatabase className="hero-icon-faded blue" />
                <div className="verification-pulse">
                   <div className="pulse-ring"></div>
                   <span className="verified-badge">VERIFICADO</span>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- MODULE 3: SMART OUTREACH (Full Width) --- */}
      <section className="product-module-section">
        <div className="container module-layout">
          <div className="module-content">
             <div className="module-number">03</div>
             <h2>Infraestructura de Email Masivo</h2>
             <p className="module-lead">
               Llega a la bandeja de entrada, no al spam. Una suite completa de deliverability integrada.
             </p>
             <div className="module-details">
                 <p>
                  Conecta tus cuentas de Google y Outlook mediante protocolo OAuth. Máxima entregabilidad sin configuraciones complejas.
                </p>
                <ul className="detail-list">
                  <li><FiCheck /> <strong>Warm-up Automático:</strong> Calentamos tus casillas gradualmente</li>
                  <li><FiCheck /> <strong>Rotación de Cuentas:</strong> Evita el spam alternando entre múltiples remitentes</li>
                  <li><FiCheck /> <strong>Spintax IA:</strong> Variamos el contenido de cada email para que sea único</li>
               </ul>
             </div>
          </div>
          <div className="module-visual">
             <div className="visual-display-open">
                <FiMail className="hero-icon-faded violet" />
                <div className="email-success-graph">
                   <div className="bar b1"></div>
                   <div className="bar b2"></div>
                   <div className="bar b3"></div>
                   <div className="bar b4"></div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- MODULE 4: CRM & EXPORT (Full Width - Reversed) --- */}
      <section className="product-module-section">
        <div className="container module-layout reverse">
          <div className="module-content">
             <div className="module-number">04</div>
             <h2>Exportación y Reportes</h2>
             <p className="module-lead">
               Tus datos son tuyos. Descarga listas limpias y listas para usar en cualquier plataforma.
             </p>
             <div className="module-details">
               <p>
                 Sin funciones complejas que no usas. Simplemente descarga tu lista enriquecida y ponla a trabajar.
               </p>
               <div className="crm-actions">
                  <div className="crm-tag">Excel (.xlsx)</div>
                  <div className="crm-tag">Archivo CSV</div>
                  <div className="crm-tag">Reporte PDF</div>
               </div>
             </div>
          </div>
          <div className="module-visual">
             <div className="visual-display-open">
                <FiZap className="hero-icon-faded green" />
             </div>
          </div>
        </div>
      </section>



      {/* --- EMAIL MARKETING SPOTLIGHT SECTION --- */}
      <section className="email-spotlight-section">
        <div className="container spotlight-layout">
           <div className="spotlight-content">
              <span className="spotlight-badge">INFRAESTRUCTURA DE ENVÍO MASIVO</span>
              <h2>Email Marketing Efectivo,<br />Sin Caer en Spam</h2>
              <p className="spotlight-lead">
                Deja de desperdiciar leads. Nuestra tecnología asegura que tus correos lleguen directo a la bandeja de entrada, lejos de la carpeta de promociones.
              </p>
              <div className="spotlight-features-text">
                 <p>
                    <strong>Escalabilidad Infinita:</strong> Conecta cientos de cuentas de Gmail y Outlook para multiplicar tu alcance al instante.
                 </p>
                 <p>
                    <strong>Motor Anti-Spam:</strong> Nuestra rotación inteligente de IPs y Spintax asegura que tus campañas masivas lleguen siempre a la bandeja de entrada.
                 </p>
              </div>
           </div>
           
           <div className="spotlight-visual">
              {/* CSS Art: Connected System */}
              <div className="system-visual">
                 <div className="central-node">
                    <FiZap />
                 </div>
                 <div className="orbit-node n1"><FiMail /></div>
                 <div className="orbit-node n2"><FiMail /></div>
                 <div className="orbit-node n3"><FiMail /></div>
                 <div className="orbit-ring"></div>
                 <div className="orbit-ring-outer"></div>
              </div>
           </div>
        </div>
      </section>

      {/* --- ROI / EFFICIENCY IMPACT SECTION --- */}
      <section className="roi-section">
        <div className="container">
          <div className="section-header center">
            <h2>Matemática Simple: Más Volumen = Más Ventas</h2>
            <p>
              Deja de perder 35 horas semanales copiando y pegando datos. Dedícate a cerrar tratos.
            </p>
          </div>

          <div className="roi-comparison-grid">
             {/* THE OLD WAY */}
             <div className="roi-card old-way">
                <div className="roi-header">
                   <h3>Método Manual</h3>
                   <span className="roi-badge-neg">Lento & Costoso</span>
                </div>
                <div className="roi-stat-row">
                   <div className="stat-label">Leads por Semana</div>
                   <div className="stat-value neg">~50</div>
                </div>
                <div className="roi-stat-row">
                   <div className="stat-label">Tiempo Invertido</div>
                   <div className="stat-value neg">35+ Horas</div>
                </div>
                <div className="roi-stat-row">
                   <div className="stat-label">Costo Operativo</div>
                   <div className="stat-value neg">Alto (Tu Tiempo)</div>
                </div>
                <div className="roi-outcome">
                   Resultados limitados y burnout.
                </div>
             </div>

             {/* VS DIVIDER */}
             <div className="roi-vs">
                <span>VS</span>
             </div>

             {/* SMART LEADS WAY */}
             <div className="roi-card new-way">
                <div className="roi-header">
                   <h3>Smart Leads</h3>
                   <span className="roi-badge-pos">Automático</span>
                </div>
                <div className="roi-stat-row">
                   <div className="stat-label">Leads por Semana</div>
                   <div className="stat-value pos">1,000+</div>
                </div>
                <div className="roi-stat-row">
                   <div className="stat-label">Tiempo Invertido</div>
                   <div className="stat-value pos">10 Minutos</div>
                </div>
                <div className="roi-stat-row">
                   <div className="stat-label">Costo Operativo</div>
                   <div className="stat-value pos">Mínimo</div>
                </div>
                <div className="roi-outcome highlight">
                   <FiTrendingUp /> Escapabilidad Infinita.
                </div>
             </div>
          </div>

          <div className="roi-summary-banner">
             <p>
               Ahorras <strong>139+ horas al mes</strong>. Si tu hora vale $35, te estamos ahorrando <strong>$4,875/mes</strong>.
               <br/>
               Y eso sin contar las ventas extra que generarás con 20x más leads.
             </p>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS SECTION --- */}
      <section id="testimonials" className="testimonials-section">
        <div className="container">
          <div className="section-header center">
            <h2>Lo que dicen nuestros usuarios</h2>
            <p>
              Empresas de toda Latinoamérica confían en Smart Leads para escalar sus ventas.
            </p>
          </div>
          
          <div className="testimonial-slider-container">
             <div className="testimonial-track">
               <div className="testimonial-card">
                 <p className="testimonial-text">
                   "Incrementamos nuestros leads cualificados un 400% en el primer mes. La calidad de los datos es impresionante."
                 </p>
                 <div className="testimonial-author">
                    <h4>Carlos M.</h4>
                    <span>CEO @ TechStart</span>
                 </div>
               </div>
               
               <div className="testimonial-card">
                 <p className="testimonial-text">
                   "La automatización de emails nos ahorró contratar a 2 SDRs. Se paga solo en la primera semana."
                 </p>
                 <div className="testimonial-author">
                    <h4>Ana R.</h4>
                    <span>Head of Sales @ GrowthAgency</span>
                 </div>
               </div>
   
               <div className="testimonial-card">
                 <p className="testimonial-text">
                   "La mejor herramienta para prospección B2B en LATAM. El soporte es increíble y la plataforma vuela."
                 </p>
                 <div className="testimonial-author">
                    <h4>Diego S.</h4>
                    <span>Founder @ B2B Solutions</span>
                 </div>
               </div>

               <div className="testimonial-card">
                 <p className="testimonial-text">
                   "Pudimos escalar nuestra agencia sin perder calidad en el trato. La verificación de emails es clave."
                 </p>
                 <div className="testimonial-author">
                    <h4>Juan P.</h4>
                    <span>Director @ ScaleUp</span>
                 </div>
               </div>

               <div className="testimonial-card">
                 <p className="testimonial-text">
                   "Una máquina de generar reuniones. Pasamos de 5 a 25 demos semanales en un solo mes."
                 </p>
                 <div className="testimonial-author">
                    <h4>Sofia L.</h4>
                    <span>CMO @ MarketFit</span>
                 </div>
               </div>
             </div>
             {/* Gradient Overlays for Fade Effect */}
             <div className="slider-fade-left"></div>
             <div className="slider-fade-right"></div>
          </div>
        </div>
      </section>

      {/* --- PRICING (Tech Panel) --- */}
      <section id="pricing" className="pricing-section-tech">
        <div className="container">
          <div className="section-header center" style={{ marginBottom: '60px' }}>
             <h2>¿Cuánto vale multiplicar tus clientes x10?</h2>
             <p style={{ fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto' }}>
               No es un gasto, es la inversión con mayor ROI de tu empresa. 
               <br/>
               Accede a la tecnología que reemplaza a un equipo de ventas entero.
             </p>
          </div>
          <div className="pricing-tech-panel">
             <div className="panel-left">
                <span className="tech-label">ACCESO TOTAL</span>
                <h2 className="tech-price">$195<small>/mes</small></h2>
                <p className="tech-desc">Menos de lo que cuesta un solo almuerzo de negocios.</p>
                <div className="tech-divider"></div>
                <div className="lifetime-option">
                   o un pago único de <strong>$999</strong> de por vida.
                </div>
             </div>
             <div className="panel-right">
                <ul className="tech-features-list">
                  <li><FiCheck /> <strong>Motor de IA</strong> Ilimitado</li>
                  <li><FiCheck /> Búsquedas & Emails Infinitos</li>
                  <li><FiCheck /> <strong>Automatización 100%</strong></li>
                  <li><FiCheck /> Validación en Tiempo Real</li>
                  <li><FiCheck /> Soporte Prioritario 24/7</li>
                </ul>
                <button className="btn-tech-primary full-width" onClick={() => navigate('/')}>
                   Obtener Acceso Inmediato <FiArrowRight />
                </button>
                <button className="btn-tech-secondary full-width" onClick={() => navigate('/')}>
                   Solicitar Demo Gratuita (Pruébalo Ahora)
                </button>
             </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="footer-section">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo white">
                <div className="logo-icon">
                  <img src="/favicon.svg" alt="SL" style={{ width: '24px', height: '24px' }} />
                </div>
                <span>Smart Leads</span>
              </div>
              <p>Tu motor de crecimiento B2B.</p>
              <div className="social-links">
                <a href="#"><FaTwitter /></a>
                <a href="#"><FaLinkedin /></a>
                <a href="#"><FaGithub /></a>
              </div>
            </div>
            
            <div className="footer-col">
              <h4>Producto</h4>
              <a href="#features">Características</a>
              <a href="#pricing">Precios</a>
              <a href="#">Roadmap</a>
            </div>
            
            <div className="footer-col">
              <h4>Compañía</h4>
              <a href="#">Sobre Nosotros</a>
              <a href="#">Blog</a>
              <a href="#">Carreras</a>
            </div>
            
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Privacidad</a>
              <a href="#">Términos</a>
              <a href="#">Seguridad</a>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>© 2026 Smart Leads Inc. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

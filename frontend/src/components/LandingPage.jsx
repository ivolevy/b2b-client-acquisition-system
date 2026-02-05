import React, { useState, useEffect, useRef } from 'react';
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
import { FaLinkedin, FaTwitter, FaGithub, FaGoogle, FaMicrosoft, FaEnvelope } from 'react-icons/fa';
import AnimatedBackground from './AnimatedBackground';

import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pricing state
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [currency, setCurrency] = useState('ARS'); // Default a ARS como pidió
  const [exchangeRate, setExchangeRate] = useState(1200);

  const isYearly = billingCycle === 'yearly';

  // Scroll-linked Animation
  const mockupRef = useRef(null);
  const [activeModule, setActiveModule] = useState(0);

  const modules = [
    {
      id: 'search',
      title: 'Motor de Búsqueda con IA',
      icon: <FiMapPin />,
      lead: (
        <>
          <p style={{ marginBottom: '16px' }}>Creamos una IA que busca leads nuevos en tiempo real en toda la web.</p>
          <p style={{ margin: 0 }}>Solo ingresás rubro, dirección y radio, y el sistema encuentra empresas que coincidan.</p>
        </>
      ),
      visual: (
        <div className="visual-display-open">
          <FiMapPin className="hero-icon-faded" />
          <div className="data-stream-vertical">
            <div className="stream-item"><span>Consultora Tech</span> <small>Buenos Aires</small></div>
            <div className="stream-item"><span>Estudio Jurídico</span> <small>CABA</small></div>
            <div className="stream-item"><span>Agencia Marketing</span> <small>Córdoba</small></div>
          </div>
        </div>
      )
    },
    {
      id: 'enrich',
      title: 'Enriquecimiento de Datos',
      icon: <FiDatabase />,
      lead: (
        <>
          <p style={{ marginBottom: '16px' }}>El sistema analiza la presencia digital de cada prospecto para validar la calidad de sus datos antes de procesarlo.</p>
          <p style={{ margin: 0 }}>Emails verificados para reducir rebotes, teléfonos existentes y demás.</p>
        </>
      ),
      visual: (
        <div className="visual-display-open">
          <FiDatabase className="hero-icon-faded blue" />
          <div className="verification-pulse">
            <div className="pulse-ring"></div>
            <span className="verified-badge">VERIFICADO</span>
          </div>
        </div>
      )
    },
    {
      id: 'reach',
      title: 'Contacto Masivo',
      icon: <FiZap />,
      lead: null,
      visual: (
        <div className="visual-display-open dual-split">
          <div className="split-side email-side">
            <div className="icon-header">
              <div className="email-icon-mini">
                <FaEnvelope />
              </div>
              <span className="channel-title">Email Marketing</span>
            </div>
            <p className="channel-desc">
              Infraestructura OAuth de alta entregabilidad. Evita la carpeta de spam y llegá directo a la bandeja de entrada principal.
            </p>
            <div className="integrations-row">
              <span className="integrations-label">Conexión nativa:</span>
              <div className="integration-badges">
                <span className="integration-tag"><FaGoogle /> Gmail</span>
                <span className="integration-tag"><FaMicrosoft /> Outlook</span>
              </div>
            </div>
          </div>
          <div className="split-side whatsapp-side">
            <div className="icon-header">
              <div className="whatsapp-icon-mini">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.63 1.433h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <span className="channel-title">WhatsApp Marketing</span>
            </div>
            <p className="channel-desc">
              Envío masivo inteligente con rotación de números. Maximiza la tasa de apertura y respuesta de tus prospectos.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'export',
      title: 'Exportación y Reportes',
      icon: <FiZap />,
      lead: (
        <>
          <p style={{ margin: 0 }}>Tus datos son tuyos. Descargá listas de los leads obtenidos limpias y listas para usar en cualquier plataforma.</p>
        </>
      ),
      visual: (
        <div className="visual-display-open">
          <FiZap className="hero-icon-faded green" />
        </div>
      )
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!mockupRef.current) return;
      
      const scrollY = window.scrollY;
      // Complete animation by 400px scroll
      const progress = Math.min(scrollY / 400, 1);
      
      // Interpolate values
      // Rotate: 50deg -> 0deg
      // Scale: 0.9 -> 1.0
      // TranslateY: 40px -> 0px
      
      const rot = 50 - (progress * 50);
      const scale = 0.9 + (progress * 0.1);
      const y = 40 - (progress * 40);
      
      mockupRef.current.style.transform = `perspective(2000px) rotateX(${rot}deg) scale(${scale}) translateY(${y}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger once on mount
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Dolar Blue
  useEffect(() => {
    const fetchDolar = async () => {
      try {
        const res = await fetch('https://api.bluelytics.com.ar/v2/latest');
        const data = await res.json();
        if (data && data.blue && data.blue.value_sell) {
          // Dolar Blue PURO (sin recargo, a pedido del usuario)
          const blueRate = data.blue.value_sell;
          setExchangeRate(blueRate);
          console.log(`Dolar Blue: ${blueRate}`);
        }
      } catch (e) {
        console.warn('Error fetching dolar blue:', e);
      }
    };
    fetchDolar();
  }, []);

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Para freelancers que recién empiezan.',
      price: { USD: 100, localUSD: 100 },
      credits: 1000,
      features: [
        { text: '1,000 Créditos mensuales', included: true },
        { text: 'Expectativa de cerrar ~200 clientes', included: true },
        { text: 'Acceso a Búsqueda Local', included: true },
      ],
      buttonText: 'Comenzar Starter',
      buttonClass: 'btn-secondary',
      popular: false
    },
    {
      id: 'growth',
      name: 'Growth',
      description: 'El plan ideal para PYMES.',
      price: { USD: 100, localUSD: 100 },
      credits: 3000,
      features: [
        { text: '3,000 Créditos mensuales', included: true },
        { text: 'Expectativa de cerrar ~600 clientes', included: true },
        { text: 'Prioridad en búsquedas', included: true },
        { text: 'Próximamente: Nuevas funciones', included: true },
      ],
      buttonText: 'Elegir Growth',
      buttonClass: 'btn-primary',
      popular: true
    },
    {
      id: 'scale',
      name: 'Scale',
      description: 'Volumen alto para Agencias.',
      price: { USD: 100, localUSD: 100 },
      credits: 10000,
      features: [
        { text: '10,000 Créditos mensuales', included: true },
        { text: 'Expectativa de cerrar ~2,000 clientes', included: true },
        { text: 'API Access (Beta)', included: true },
        { text: 'Próximamente: Nuevas funciones', included: true },
      ],
      buttonText: 'Contactar Ventas',
      buttonClass: 'btn-secondary',
      popular: false
    }
  ];

  const getPrice = (plan) => {
    // Override requested by user: All plans 100 USD / 100 ARS
    if (currency === 'ARS') {
      return 100;
    }
    return 100;
  };

  const handlePlanSelect = (planId) => {
    // Redirect to public checkout page with params
    navigate(`/checkout?plan=${planId}&cycle=${billingCycle}&currency=${currency}`);
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`landing-page ${mobileMenuOpen ? 'menu-open' : ''}`}>

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
            <button onClick={() => {
              setMobileMenuOpen(false);
              document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              <span className="nav-num">03</span> Contactanos
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
        <AnimatedBackground />
        <div className="container hero-content">
          <div className="hero-text">
            <h1>
              Gana mas dinero <br />
              <span className="text-gradient">con menos esfuerzo</span>
            </h1>
            <p className="hero-subtext">
              Extrae leads de Google Maps enriquecelos con IA y contáctalos masivamente. 100% Automático.
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
        <div 
          className="dashboard-mockup-3d" 
          ref={mockupRef}
          style={{ 
            willChange: 'transform',
            transform: 'perspective(2000px) rotateX(50deg) scale(0.9) translateY(40px)' // Initial state
          }}
        >
          <div className="mockup-header">
            <div className="dots"><span></span><span></span><span></span></div>
            <div className="bar">smartleads - dashboard</div>
          </div>
          <img src="/images/hero 2.png" alt="Dashboard Interface" className="mockup-img" onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML += '<div class="fallback-mockup">Dashboard Preview</div>';
          }} />

        </div>
      </div>
    </div>
  </section>

  {/* --- NEW COMPACT FEATURES SELECTOR (Option B) --- */}
  <section id="features" className="features-selector-section">
    <div className="container">
      <div className="section-header center">
        <h2>Simples 4 pasos que te hacen ganar mas plata con menos esfuerzo</h2>
      </div>
      <div className="selector-grid">
        {/* Nav Tabs */}
        <div className="selector-nav">
          {modules.map((mod, idx) => (
            <div 
              key={mod.id}
              className={`selector-tab ${activeModule === idx ? 'active' : ''}`}
              onClick={() => setActiveModule(idx)}
              onMouseEnter={() => setActiveModule(idx)}
            >
              <div className="tab-icon">{mod.icon}</div>
              <div className="tab-text">
                <h3>{mod.title}</h3>
                <div className="tab-indicator"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="selector-content-wrapper">
          <div className="selector-content-inner" key={activeModule}>
            <div className="module-content">
              <div className="module-number">0{activeModule + 1}</div>
              <h2>{modules[activeModule].title}</h2>
              <div className="module-lead">
                {modules[activeModule].lead}
              </div>
              <button className="btn-primary" style={{ marginTop: '32px' }} onClick={() => navigate('/register')}>
                Empezar Ahora <FiArrowRight />
              </button>
            </div>
            <div className="module-visual">
              {modules[activeModule].visual}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>





      {/* --- ROI / EFFICIENCY IMPACT SECTION --- */}


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
            <div className="testimonial-slider-container">
              <div className="testimonial-track marquee-animation">
                {/* ORIGINAL SET */}
                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar blue">CM</div>
                    <div className="author-info">
                      <h4>Carlos M.</h4>
                      <span>CEO @ TechStart</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "Incrementamos nuestros leads cualificados un 400% en el primer mes. La calidad de los datos es impresionante."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar violet">AR</div>
                    <div className="author-info">
                      <h4>Ana R.</h4>
                      <span>Head of Sales @ GrowthAgency</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "La automatización de emails nos ahorró contratar a 2 SDRs. Se paga solo en la primera semana."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar green">DS</div>
                    <div className="author-info">
                      <h4>Diego S.</h4>
                      <span>Founder @ B2B Solutions</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "La mejor herramienta para prospección B2B en LATAM. El soporte es increíble y la plataforma vuela."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar blue">JP</div>
                    <div className="author-info">
                      <h4>Juan P.</h4>
                      <span>Director @ ScaleUp</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "Pudimos escalar nuestra agencia sin perder calidad en el trato. La verificación de emails es clave."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar violet">SL</div>
                    <div className="author-info">
                      <h4>Sofia L.</h4>
                      <span>CMO @ MarketFit</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "Una máquina de generar reuniones. Pasamos de 5 a 25 demos semanales en un solo mes."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar green">DK</div>
                    <div className="author-info">
                      <h4>David K.</h4>
                      <span>CTO @ DevSolutions</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "La integración API nos ahorró semanas de desarrollo. Excelente documentación."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar blue">LM</div>
                    <div className="author-info">
                      <h4>Lucia M.</h4>
                      <span>Founder @ DesignStudio</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "Encontramos el 80% de nuestros clientes actuales gracias a esta plataforma."
                  </p>
                </div>

                {/* DUPLICATE SET FOR LOOP */}
                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar blue">CM</div>
                    <div className="author-info">
                      <h4>Carlos M.</h4>
                      <span>CEO @ TechStart</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "Incrementamos nuestros leads cualificados un 400% en el primer mes. La calidad de los datos es impresionante."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar violet">AR</div>
                    <div className="author-info">
                      <h4>Ana R.</h4>
                      <span>Head of Sales @ GrowthAgency</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "La automatización de emails nos ahorró contratar a 2 SDRs. Se paga solo en la primera semana."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar green">DS</div>
                    <div className="author-info">
                      <h4>Diego S.</h4>
                      <span>Founder @ B2B Solutions</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "La mejor herramienta para prospección B2B en LATAM. El soporte es increíble y la plataforma vuela."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar blue">JP</div>
                    <div className="author-info">
                      <h4>Juan P.</h4>
                      <span>Director @ ScaleUp</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "Pudimos escalar nuestra agencia sin perder calidad en el trato. La verificación de emails es clave."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar violet">SL</div>
                    <div className="author-info">
                      <h4>Sofia L.</h4>
                      <span>CMO @ MarketFit</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar green">DK</div>
                    <div className="author-info">
                      <h4>David K.</h4>
                      <span>CTO @ DevSolutions</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "La integración API nos ahorró semanas de desarrollo. Excelente documentación."
                  </p>
                </div>

                <div className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="author-avatar blue">LM</div>
                    <div className="author-info">
                      <h4>Lucia M.</h4>
                      <span>Founder @ DesignStudio</span>
                    </div>
                  </div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p className="testimonial-text">
                    "Encontramos el 80% de nuestros clientes actuales gracias a esta plataforma."
                  </p>
                </div>
              </div>
              {/* Gradient Overlays for Fade Effect */}
              <div className="slider-fade-left"></div>
              <div className="slider-fade-right"></div>
            </div>
            {/* Gradient Overlays for Fade Effect */}
            <div className="slider-fade-left"></div>
            <div className="slider-fade-right"></div>
          </div>
        </div>
      </section>

      {/* --- PRICING (Tech Panel) --- */}
      <section id="pricing" className="pricing-section-new">
        <div className="container">
          <div className="section-header center" style={{ marginBottom: '40px' }}>
            <h2>Elige el plan para tu crecimiento</h2>
            <p>

            </p>
          </div>

          <div className="pricing-controls">
            {/* Currency Toggle (Minimal Text Tabs) */}
            <div className="currency-selector">
              <button
                className={currency === 'ARS' ? 'active' : ''}
                onClick={() => setCurrency('ARS')}
              >
                🇦🇷 ARS
              </button>
              <span className="divider">|</span>
              <button
                className={currency === 'USD' ? 'active' : ''}
                onClick={() => setCurrency('USD')}
              >
                🌎 USD
              </button>
            </div>

            {/* Cycle Toggle (Prominent Pill) */}
            <div className="billing-toggle-pill">
              <button
                className={!isYearly ? 'active' : ''}
                onClick={() => setBillingCycle('monthly')}
              >
                Mensual
              </button>
              <button
                className={isYearly ? 'active' : ''}
                onClick={() => setBillingCycle('yearly')}
              >
                Anual <span className="save-badge">-20%</span>
              </button>
            </div>
          </div>

          {/* Wrapper for Grid + Bubble to align bubble to grid */}
          <div className="pricing-content-wrapper" style={{ position: 'relative' }}>

            <div className="pricing-grid-new">
              {plans.map((plan) => (
                <div key={plan.id} className={`plan-card-new ${plan.popular ? 'popular' : ''}`}>
                  {plan.popular && <div className="popular-badge">MÁS ELEGIDO</div>}

                  <div className="plan-header-new">
                    <h3>{plan.name}</h3>
                    <p>{plan.description}</p>
                  </div>

                  <div className="plan-price-new">
                    <span className="currency">{currency === 'USD' ? '$' : '$'}</span>
                    <span className="amount">{getPrice(plan).toLocaleString()}</span>
                    <span className="period">/{isYearly ? 'mes' : 'mes'}</span>
                  </div>

                  <ul className="plan-features-new">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className={!feature.included ? 'disabled' : ''}>
                        {feature.included ? <FiCheck /> : <FiX style={{ opacity: 0.5 }} />}
                        {feature.text}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`plan-btn-new ${plan.buttonClass === 'btn-primary' ? 'primary' : 'secondary'}`}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              ))}
            </div>

            {/* Extra Credits Text Line */}
            <div className="extra-credits-text" style={{
              textAlign: 'center',
              marginTop: '40px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem'
            }}>
              <p>¿Necesitas más capacidad? Packs de créditos extra disponibles desde <strong style={{ color: '#2563eb' }}>$1 USD</strong>.</p>
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

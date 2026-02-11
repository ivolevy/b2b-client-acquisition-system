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
import { FaLinkedin, FaTwitter, FaGithub, FaGoogle, FaMicrosoft, FaEnvelope, FaWhatsapp, FaInstagram } from 'react-icons/fa';
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
      title: 'Búsqueda inteligente',
      icon: <FiMapPin />,
      lead: (
        <>
          <p style={{ marginBottom: '16px' }}>La plataforma encuentra negocios que coinciden con tu rubro, ubicación y radio en segundos.</p>
          <p style={{ margin: 0 }}>Solo eliges a quién quieres venderle. El sistema hace el resto.</p>
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
      title: 'Datos verificados',
      icon: <FiDatabase />,
      lead: (
        <>
          <p style={{ marginBottom: '16px' }}>Analizamos cada empresa para obtener información real y actualizada.</p>
          <p style={{ margin: 0 }}>Emails válidos, teléfonos activos y perfiles digitales confiables para reducir rebotes.</p>
        </>
      ),
      visual: (
        <div className="visual-display-open">
        </div>
      )
    },
    {
      id: 'reach',
      title: 'Mensajes automáticos',
      icon: <FiZap />,
      lead: (
        <>
          <p style={{ marginBottom: '16px' }}><strong>Tus prospectos están a un click de distancia.</strong> Escala tu alcance con campañas automatizadas de Email y WhatsApp que se sienten personales.</p>
          <p style={{ margin: 0 }}>Sin configuraciones complejas, directo a la bandeja de entrada para cerrar ventas en piloto automático.</p>
        </>
      ),
      visual: (
        <div className="visual-display-open simple-integration">
          <div className="integration-hub">
            <div className="hub-central">
              <FiZap className="zap-pulse" />
            </div>
            <div className="hub-orbit">
              <div className="orbit-item gmail"><FaGoogle /></div>
              <div className="orbit-item outlook"><FaMicrosoft /></div>
              <div className="orbit-item whatsapp"><FaWhatsapp /></div>
            </div>
          </div>
          <div className="message-status-card">
            <div className="status-line"></div>
            <div className="status-content">
              <FiCheck className="text-success" />
              <span>Campaña enviada exitosamente</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'export',
      title: 'Listas y métricas',
      icon: <FiZap />,
      lead: (
        <>
          <p style={{ marginBottom: '16px' }}>Descarga tus contactos o analiza resultados en tiempo real.</p>
          <p style={{ margin: 0 }}>Más respuestas, más oportunidades, mejores decisiones.</p>
        </>
      ),
      visual: (
        <div className="visual-display-open">
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
            <button onClick={() => scrollToSection('features')}>Módulos</button>
            <button onClick={() => scrollToSection('pricing')}>Precios</button>
            <button onClick={() => scrollToSection('contact-simple')}>Contactanos</button>
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
            <button onClick={() => scrollToSection('features')}>
              <span className="nav-num">01</span> Módulos
            </button>
            <button onClick={() => scrollToSection('pricing')}>
              <span className="nav-num">02</span> Precios
            </button>
            <button onClick={() => {
              setMobileMenuOpen(false);
              scrollToSection('contact-simple');
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
              tu próxima venta <br />
              <span className="text-gradient">empieza acá</span>
            </h1>
            <p className="hero-subtext">
              Encuentra clientes validados en Google Maps con IA y contáctalos masivamente. 100% Automático.
            </p>
            <div className="hero-buttons">
              <button className="btn-primary btn-lg">
                Empieza Ahora <FiArrowRight />
              </button>
              <button className="btn-secondary btn-lg">
                Ver Demo
              </button>
            </div>
            <div className="hero-trust">
              <p>Confiado por +100 empresas</p>
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
        <h2>Todo lo que necesitas para convertir Google Maps en clientes</h2>
      </div>
      {/* Desktop View */}
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
        {/* Content Area */}
        <div className="selector-content-wrapper">
          {modules[activeModule] && (
            <div className="selector-content-inner" key={activeModule}>
              <div className="module-content">
                <div className="module-number">0{activeModule + 1}</div>
                <h2>{modules[activeModule].title}</h2>
                <div className="module-lead">
                  {modules[activeModule].lead}
                </div>
              </div>
              <div className="module-visual">
                {modules[activeModule].visual}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Accordion View */}
      <div className="accordion-mobile mobile-only">
        {modules.map((mod, idx) => (
          <div key={mod.id} className={`accordion-item ${activeModule === idx ? 'expanded' : ''}`}>
             <div className="accordion-header" onClick={() => setActiveModule(idx === activeModule ? -1 : idx)}>
                <div className="header-left">
                   <span className="accordion-num">0{idx + 1}</span>
                   <h3>{mod.title}</h3>
                </div>
                <div className="header-icon">
                   {activeModule === idx ? <div className="minus-icon">−</div> : <div className="plus-icon">+</div>}
                </div>
             </div>
             
             <div className={`accordion-body ${activeModule === idx ? 'open' : ''}`}>
                <div className="module-content-mobile">
                   <div className="module-lead-mobile">
                     {mod.lead}
                   </div>
                   <div className="module-visual-mobile">
                      {mod.visual}
                   </div>
                </div>
             </div>
          </div>
        ))}
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
        </div>

        <div className="testimonial-slider-container">
          <div className="testimonial-track marquee-animation">
            {/* ORIGINAL SET */}
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar blue">DS</div>
                <div className="author-info">
                  <h4>Diego Suárez</h4>
                  <span>Founder @ Nexo Comercial · Consultoría B2B</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Antes hacíamos la búsqueda de prospectos a mano. Hoy contactamos 10 veces más empresas por semana y duplicamos las reuniones mensuales.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar violet">MF</div>
                <div className="author-info">
                  <h4>Mariana Ferreyra</h4>
                  <span>Gerente Comercial @ Textil Aurora · Industria Textil</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Nos ayudó a llegar a nuevos distribuidores en todo el país. En dos meses generamos más contactos que en todo el semestre anterior.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar green">CB</div>
                <div className="author-info">
                  <h4>Carlos Benítez</h4>
                  <span>Director @ Metalúrgica Delta · Fábrica industrial</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “La segmentación por zona fue clave. En pocas semanas abrimos conversaciones con clientes que antes eran imposibles de alcanzar.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar blue">SL</div>
                <div className="author-info">
                  <h4>Sofía López</h4>
                  <span>CMO @ MarketBridge · Servicios Financieros</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Pasamos de 6 a 22 demos por semana. La personalización automática hace la diferencia.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar violet">LM</div>
                <div className="author-info">
                  <h4>Lucía Martínez</h4>
                  <span>Founder @ Estudio Prisma · Diseño y Branding</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Más del 70% de nuestros clientes actuales llegaron gracias a las campañas que lanzamos desde la plataforma.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar green">GT</div>
                <div className="author-info">
                  <h4>Gabriel Torres</h4>
                  <span>Responsable de Ventas @ EduPro · Proveedor de colegios</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Encontramos instituciones que no estaban en nuestras bases. Hoy todas las semanas agendamos reuniones nuevas.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar blue">MR</div>
                <div className="author-info">
                  <h4>Martín Ríos</h4>
                  <span>Head of Sales @ Crece Digital · Agencia de Performance</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Automatizamos el primer contacto y el equipo ahora se enfoca solo en cerrar. Aumentamos un 40% las oportunidades en el primer mes.”
              </p>
            </div>

            {/* DUPLICATE SET FOR LOOP */}
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar blue">DS</div>
                <div className="author-info">
                  <h4>Diego Suárez</h4>
                  <span>Founder @ Nexo Comercial · Consultoría B2B</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Antes hacíamos la búsqueda de prospectos a mano. Hoy contactamos 10 veces más empresas por semana y duplicamos las reuniones mensuales.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar violet">MF</div>
                <div className="author-info">
                  <h4>Mariana Ferreyra</h4>
                  <span>Gerente Comercial @ Textil Aurora · Industria Textil</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Nos ayudó a llegar a nuevos distribuidores en todo el país. En dos meses generamos más contactos que en todo el semestre anterior.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar green">CB</div>
                <div className="author-info">
                  <h4>Carlos Benítez</h4>
                  <span>Director @ Metalúrgica Delta · Fábrica industrial</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “La segmentación por zona fue clave. En pocas semanas abrimos conversaciones con clientes que antes eran imposibles de alcanzar.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar blue">SL</div>
                <div className="author-info">
                  <h4>Sofía López</h4>
                  <span>CMO @ MarketBridge · Servicios Financieros</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Pasamos de 6 a 22 demos por semana. La personalización automática hace la diferencia.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar violet">LM</div>
                <div className="author-info">
                  <h4>Lucía Martínez</h4>
                  <span>Founder @ Estudio Prisma · Diseño y Branding</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Más del 70% de nuestros clientes actuales llegaron gracias a las campañas que lanzamos desde la plataforma.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar green">GT</div>
                <div className="author-info">
                  <h4>Gabriel Torres</h4>
                  <span>Responsable de Ventas @ EduPro · Proveedor de colegios</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Encontramos instituciones que no estaban en nuestras bases. Hoy todas las semanas agendamos reuniones nuevas.”
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="author-avatar blue">MR</div>
                <div className="author-info">
                  <h4>Martín Ríos</h4>
                  <span>Head of Sales @ Crece Digital · Agencia de Performance</span>
                </div>
              </div>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                “Automatizamos el primer contacto y el equipo ahora se enfoca solo en cerrar. Aumentamos un 40% las oportunidades en el primer mes.”
              </p>
            </div>
          </div>
          {/* Gradient Overlays for Fade Effect */}
          <div className="slider-fade-left"></div>
          <div className="slider-fade-right"></div>
        </div>

      </section>

      {/* --- PRICING (Tech Panel) --- */}
      <section id="pricing" className="pricing-section-new">
        <div className="container">
          <div className="section-header center" style={{ marginBottom: '40px' }}>
            <h2>Elige el plan que te ayudará a conseguir más clientes</h2>
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
                style={{ position: 'relative' }}
              >
                🌎 USD <span style={{ 
                  fontSize: '0.65rem', 
                  opacity: 0.8, 
                  fontWeight: 400,
                  marginLeft: '4px',
                  verticalAlign: 'middle'
                }}>(Próximamente)</span>
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
                    onClick={() => currency !== 'USD' && handlePlanSelect(plan.id)}
                    disabled={currency === 'USD'}
                    style={{
                      opacity: currency === 'USD' ? 0.6 : 1,
                      cursor: currency === 'USD' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {currency === 'USD' ? 'Próximamente' : plan.buttonText}
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


      {/* --- SIMPLE CONTACT SECTION --- */}
      <section id="contact-simple" className="contact-simple-section">
        <div className="container">
           <div className="contact-simple-content">
              <h2>¿Tenés dudas? Hablemos.</h2>
              <div className="contact-links-row">
                  <a href="mailto:solutionsdota@gmail.com" className="contact-link-item">
                      <div className="icon-box"><FiMail /></div>
                      <span>solutionsdota@gmail.com</span>
                  </a>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                      <span style={{fontSize:'0.85rem', marginBottom:'8px', fontWeight:'600', color:'var(--text-secondary)'}}>Ivan Levy - CTO</span>
                      <a href="mailto:ivo.levy03@gmail.com" className="contact-link-item">
                          <div className="icon-box"><FiMail /></div>
                          <span>ivo.levy03@gmail.com</span>
                      </a>
                  </div>
                  <a href="https://wa.me/5491138240929" target="_blank" rel="noopener noreferrer" className="contact-link-item">
                      <div className="icon-box"><FaWhatsapp /></div>
                      <span>+54 9 11 3824-0929</span>
                  </a>
              </div>
              <div className="agency-link-container">
                  <p>Conocé más sobre nuestra agencia:</p>
                  <a href="https://dotasolutions.agency" target="_blank" rel="noopener noreferrer" className="agency-link">
                      Visitanos en <span className="agency-name">Dota Solutions</span> <FiArrowRight />
                  </a>
              </div>
              <div className="social-simple-row">
                  <p>Seguinos en:</p>
                  <div className="social-icons">
                    <a href="https://www.linkedin.com/company/dota-solutions/" target="_blank" rel="noopener noreferrer"><FaLinkedin /></a>
                    <a href="https://www.instagram.com/dota.solutions/" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
                  </div>
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
              <p>tu proxima venta empieza aca</p>
            </div>

            <div className="footer-col">
              <h4>Producto</h4>
              <button onClick={() => scrollToSection('features')} className="footer-link-btn">Módulos</button>
              <button onClick={() => scrollToSection('pricing')} className="footer-link-btn">Precios</button>
              <button onClick={() => scrollToSection('contact-simple')} className="footer-link-btn">Contactanos</button>
            </div>

            <div className="footer-col">
              <h4>Compañía</h4>
              <a href="https://dotasolutions.agency" target="_blank" rel="noopener noreferrer">Sobre Nosotros</a>
            </div>

            <div className="footer-col">
              <h4>Legal</h4>
              <button onClick={() => navigate('/privacidad')} className="footer-link-btn">Privacidad</button>
              <button onClick={() => navigate('/terminos')} className="footer-link-btn">Términos</button>
              <button onClick={() => navigate('/seguridad')} className="footer-link-btn">Seguridad</button>
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

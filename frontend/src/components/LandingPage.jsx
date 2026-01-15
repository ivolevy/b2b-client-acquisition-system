import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkedAlt, FaPaperPlane, FaSearch, FaCheckCircle, FaRocket, FaArrowRight } from 'react-icons/fa';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          dôta
        </div>
        <div className="landing-nav-links">
          <span className="nav-link" onClick={() => navigate('/')}>Home</span>
          <span className="nav-link" onClick={() => document.getElementById('features').scrollIntoView({behavior: 'smooth'})}>Services</span>
          <span className="nav-link" onClick={() => document.getElementById('pricing').scrollIntoView({behavior: 'smooth'})}>Contact</span>
        </div>
        <button className="btn-login" onClick={() => navigate('/')}>
          Let's work together
        </button>
      </nav>

      {/* Hero */}
      <header className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Building scalable <br/>
            <em>digital solutions</em>
          </h1>
          <p className="hero-subtitle">
            Custom software that cuts costs, boosts revenue, and automates workflows. See measurable ROI in weeks, not years.
          </p>
          
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '10px'}}>
             <span style={{color: '#f472b6', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}} onClick={() => navigate('/')}>
                Work with Dota <FaArrowRight size={12}/>
             </span>
          </div>

          <div className="stats-row">
             <div className="stat-card">
                <div className="stat-number">+19</div>
                <div className="stat-label">Projects delivered</div>
             </div>
             <div className="stat-card">
                <div className="stat-number">+2</div>
                <div className="stat-label">Years of experience</div>
             </div>
             <div className="stat-card">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Technical support</div>
             </div>
             <div className="stat-card">
                 <div className="stat-number">+3</div>
                 <div className="stat-label">Countries reached</div>
             </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="landing-features">
        <div className="section-header">
           <h2 className="section-title">AI-powered throughout the entire process</h2>
           <p className="section-desc">We leverage artificial intelligence at every stage of development to deliver smarter, faster, and more efficient solutions.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <h3 className="feature-title">Reduce operational costs</h3>
            <p className="feature-text">
              Automate repetitive tasks and eliminate manual processes. Cut overhead by up to 60% while improving accuracy and speed.
            </p>
          </div>

          <div className="feature-card">
            <h3 className="feature-title">Increase revenue</h3>
            <p className="feature-text">
              Streamline sales processes, improve customer experience, and unlock new revenue streams. See measurable growth in your bottom line.
            </p>
          </div>

          <div className="feature-card">
            <h3 className="feature-title">Fast ROI</h3>
            <p className="feature-text">
              Our solutions pay for themselves quickly. Most clients see positive ROI within the first quarter, with ongoing savings year after year.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing / Contact */}
      <section id="pricing" className="pricing-section">
         <div className="pricing-box">
             <h2 className="section-title" style={{fontSize: '2.5rem', marginBottom: '20px'}}>Ready to scale?</h2>
             <p className="pricing-cta-text">
                 Stop wasting time on manual outreach. Start automating your client acquisition today.
                 <br/><br/>
                 Contact an administrator to get your <strong>Free Trial</strong> account.
             </p>
             
             <button className="btn-cta-primary" onClick={() => window.location.href = 'mailto:admin@smartleads.com'}>
                 Let's work together <FaArrowRight />
             </button>
         </div>
      </section>

      {/* Footer */}
      <footer className="footer-dota">
         <div style={{marginBottom: '40px'}}>
             <h2 style={{fontSize: '2rem', fontFamily: 'Playfair Display', marginBottom: '20px'}}>dôta</h2>
             <div style={{display: 'flex', justifyContent: 'center', gap: '20px'}}>
                 <span style={{cursor: 'pointer'}}>Legal Notice</span>
                 <span style={{cursor: 'pointer'}}>Privacy Policy</span>
                 <span style={{cursor: 'pointer'}}>Cookies</span>
             </div>
         </div>
        <p>© 2026 dota solutions. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default LandingPage;

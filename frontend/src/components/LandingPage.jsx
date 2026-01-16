import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkedAlt, FaPlane, FaSearch, FaCheckCircle, FaRocket, FaCheck, FaDatabase, FaBolt, FaGlobeAmericas } from 'react-icons/fa';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Navbar Floating Pill */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <FaBolt /> Smart Leads
        </div>
        <div className="landing-nav-links">
          <span className="nav-link" onClick={() => document.getElementById('features').scrollIntoView({behavior: 'smooth'})}>Features</span>
          <span className="nav-link" onClick={() => document.getElementById('pricing').scrollIntoView({behavior: 'smooth'})}>Pricing</span>
          <span className="nav-link" onClick={() => window.location.href = 'mailto:support@smartleads.com'}>Support</span>
        </div>
        <button className="btn-login-nav" onClick={() => navigate('/')}>
          Login
        </button>
      </nav>

      {/* Hero Section */}
      <header className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            v2.0 Now Available
          </div>
          <h1 className="hero-title">
            Turn Google Maps into your<br/>
            <span>Client Database</span>
          </h1>
          <p className="hero-subtitle">
            Extract verified B2B leads, enrich data with social profiles, and automate your cold outreach—all from a single, beautiful interface.
          </p>
          <div className="hero-cta-group">
            <button className="btn-cta-primary" onClick={() => navigate('/')}>
              Get Started
            </button>
            <button className="btn-cta-secondary" onClick={() => document.getElementById('features').scrollIntoView({behavior: 'smooth'})}>
              How it works
            </button>
          </div>
        </div>
      </header>

      {/* Bento Grid Features */}
      <section id="features" className="landing-features">
        <div className="section-header">
          <h2 className="section-title">Everything you need to grow</h2>
          <p className="section-desc">Powerful tools designed for modern sales teams.</p>
        </div>

        <div className="bento-grid">
          {/* Main Feature - Wide */}
          <div className="bento-card wide">
            <div className="card-icon"><FaGlobeAmericas /></div>
            <h3 className="card-title">Global Geolocation Search</h3>
            <p className="card-text">
              Draw a radius anywhere in the world and identify every business in your niche. 
              Our integration with Google Places ensures 99.9% accuracy for local businesses.
            </p>
          </div>

          {/* Feature - Vertical */}
          <div className="bento-card tall">
            <div className="card-icon"><FaDatabase /></div>
            <h3 className="card-title">Data Enrichment</h3>
            <p className="card-text">
              We don't just find names. We find:
              <br/><br/>
              • Direct Emails<br/>
              • Phone Numbers<br/>
              • LinkedIn Profiles<br/>
              • Instagram Handles<br/>
              • Website Technology
            </p>
          </div>

          {/* Feature - Standard */}
          <div className="bento-card">
            <div className="card-icon"><FaCheckCircle /></div>
            <h3 className="card-title">Verified Contacts</h3>
            <p className="card-text">
              Stop bouncing. Our real-time validation engine tests every email before you send.
            </p>
          </div>

          {/* Feature - Standard */}
          <div className="bento-card">
            <div className="card-icon"><FaRocket /></div>
            <h3 className="card-title">Bulk Sender</h3>
            <p className="card-text">
              Launch campaigns to 1,000+ prospects with persistent personalized templates.
            </p>
          </div>

          {/* Feature - Wide */}
          <div className="bento-card wide">
            <div className="card-icon"><FaBolt /></div>
            <h3 className="card-title">Instant Export</h3>
             <p className="card-text">
              Push your leads directly to your CRM or download as CSV/Excel compatible with Apollo, Instantly, and more.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="landing-pricing">
        <div className="pricing-grid">
          {/* Unified Pro Plan */}
          <div className="pricing-card pro" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="pricing-header">
              <h3 className="plan-name" style={{color: '#60A5FA'}}>Premium Access</h3>
              <div className="price-container">
                <span className="price">Full Access</span>
              </div>
              <p className="period">All core features included</p>
            </div>
            <ul className="pricing-features">
              <li className="pricing-feature"><FaCheck /> Unlimited Searches</li>
              <li className="pricing-feature"><FaCheck /> Unlimited Leads</li>
              <li className="pricing-feature"><FaCheck /> Social Media Enrichment</li>
              <li className="pricing-feature"><FaCheck /> Advanced Email Validation</li>
              <li className="pricing-feature"><FaCheck /> Automated Bulk Sending</li>
              <li className="pricing-feature"><FaCheck /> Priority Support</li>
            </ul>
            <button className="btn-pricing glow" onClick={() => navigate('/')}>Access Now</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div>
            <div className="footer-logo">Smart Leads</div>
            <p className="footer-copy">© 2026 Smart Leads Inc.</p>
          </div>
          <div className="footer-copy">
            Privacy Policy • Terms of Service
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

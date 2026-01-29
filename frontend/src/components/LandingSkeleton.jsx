import React from 'react';
import './LandingPage.css';

const LandingSkeleton = () => {
  return (
    <div className="landing-page dark-theme" style={{ overflow: 'hidden' }}>

      {/* --- NAVBAR SKELETON --- */}
      <header className="landing-header">
        {/* Simplified Navbar Shadow */}
        <div style={{ height: '40px', width: '100%' }}></div>
      </header>

      {/* --- HERO SECTION SKELETON --- */}
      < section className="hero-section" >
        <div className="hero-bg-glow" style={{ opacity: 0.5 }}></div>
        <div className="container hero-content">

          {/* Left Text Column */}
          <div className="hero-text">
            {/* Badge */}
            <div className="badge-pill skeleton-pulse" style={{ width: '220px', height: '32px', border: 'none', background: 'rgba(59, 130, 246, 0.1)' }}></div>

            {/* Title */}
            <div className="skeleton-pulse" style={{ width: '90%', height: '60px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', marginBottom: '16px' }}></div>
            <div className="skeleton-pulse" style={{ width: '70%', height: '60px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', marginBottom: '32px' }}></div>

            {/* Subtext */}
            <div className="skeleton-pulse" style={{ width: '80%', height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '12px' }}></div>
            <div className="skeleton-pulse" style={{ width: '60%', height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '40px' }}></div>

            {/* Buttons */}
            <div className="hero-buttons">
              <div className="skeleton-pulse" style={{ width: '180px', height: '50px', borderRadius: '99px', background: 'rgba(59, 130, 246, 0.2)' }}></div>
              <div className="skeleton-pulse" style={{ width: '140px', height: '50px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)' }}></div>
            </div>

            {/* Trust */}
            <div className="skeleton-pulse" style={{ width: '200px', height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', marginBottom: '16px' }}></div>
            <div className="trust-logos">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton-pulse" style={{ width: '80px', height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
              ))}
            </div>
          </div>

          {/* Right Visual Column */}
          <div className="hero-visual">
            <div className="dashboard-mockup-3d skeleton-pulse" style={{ height: '400px', background: '#0f172a', borderColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }}></div>
            </div>
          </div>

        </div>
      </section >

      {/* --- MODULE 1 SKELETON (Hint of content below) --- */}
      < section className="product-module-section" >
        <div className="container module-layout">
          <div className="module-content">
            <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', marginBottom: '20px' }}></div>
            <div className="skeleton-pulse" style={{ width: '70%', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', marginBottom: '20px' }}></div>
            <div className="skeleton-pulse" style={{ width: '100%', height: '100px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}></div>
          </div>
          <div className="module-visual">
            <div className="visual-display-open skeleton-pulse" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.02)' }}></div>
          </div>
        </div>
      </section >

      <style>{`
        .skeleton-pulse {
          animation: skeleton-loading 1.5s infinite alternate;
        }
        @keyframes skeleton-loading {
          0% { opacity: 0.3; }
          100% { opacity: 0.7; }
        }
      `}</style>
    </div >
  );
};

export default LandingSkeleton;

import React from 'react';

const LandingSkeleton = () => {
  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', width: '100vw', paddingTop: '80px' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        {/* Navbar Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '80px' }}>
             <div style={{ width: '150px', height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
             <div style={{ display: 'flex', gap: '20px' }}>
                 <div style={{ width: '80px', height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
                 <div style={{ width: '80px', height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
             </div>
        </div>

        {/* Hero Text Skeleton */}
        <div style={{ maxWidth: '600px', marginBottom: '40px' }}>
           <div style={{ width: '70%', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}></div>
           <div style={{ width: '90%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '30px', animation: 'pulse 1.5s infinite' }}></div>
           <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '160px', height: '50px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}></div>
              <div style={{ width: '140px', height: '50px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}></div>
           </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default LandingSkeleton;

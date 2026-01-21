import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProBackground from './ProBackground';
import { FiAlertTriangle, FiArrowLeft, FiMail, FiUsers } from 'react-icons/fi';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-container pro-theme">
      <ProBackground />
      
      <div className="content-wrapper">
        <div className="error-code">404</div>
        <div className="divider"></div>
        <h1 className="title">Página no encontrada</h1>
        <p className="description">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>

        <div className="actions">
          <button onClick={() => window.location.href = 'mailto:admin@dotasolutions.com'} className="action-btn contact">
            <FiMail />
            Contactar Administrador
          </button>
          
          <button onClick={() => navigate('/landing')} className="action-btn about">
            <FiUsers />
            Más sobre nosotros
          </button>
        </div>

        <button onClick={() => navigate('/')} className="back-link">
          <FiArrowLeft />
          Volver al inicio
        </button>
      </div>

      <style jsx>{`
        .not-found-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          font-family: 'Inter', system-ui, sans-serif;
          color: #fff;
          overflow: hidden;
        }

        .content-wrapper {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem;
          max-width: 600px;
          animation: fadeIn 0.8s ease-out;
        }

        .error-code {
          font-size: 8rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.05em;
          filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.1));
        }

        .divider {
          width: 60px;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #ec4899);
          border-radius: 2px;
          margin-bottom: 2rem;
        }

        .title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #e2e8f0;
        }

        .description {
          font-size: 1.1rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 3rem;
          max-width: 400px;
        }

        .actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }

        .action-btn.contact {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .action-btn.contact:hover {
          background: rgba(59, 130, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .action-btn.about {
          background: rgba(236, 72, 153, 0.1);
          border: 1px solid rgba(236, 72, 153, 0.2);
          color: #f472b6;
        }

        .action-btn.about:hover {
          background: rgba(236, 72, 153, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.2);
        }

        .back-link {
          background: none;
          border: none;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: #fff;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
          .actions {
            flex-direction: column;
            width: 100%;
          }
          
          .action-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default NotFound;

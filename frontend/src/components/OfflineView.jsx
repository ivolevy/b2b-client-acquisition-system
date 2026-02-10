import React from 'react';
import { FiWifiOff } from 'react-icons/fi';
import './OfflineView.css';

const OfflineView = () => {
  return (
    <div className="offline-view-overlay">
      <div className="offline-content">
        <div className="offline-icon">
          <FiWifiOff />
        </div>
        <h2 className="offline-title">Sin Conexión</h2>
        <p className="offline-message">
          Parece que has perdido la conexión a internet.
        </p>
        <p className="offline-submessage">
          Verifica tu red. La aplicación se reconectará automáticamente cuando detecte señal.
        </p>
      </div>
    </div>
  );
};

export default OfflineView;

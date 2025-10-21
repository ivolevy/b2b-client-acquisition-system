import React, { useMemo } from 'react';
import './Dashboard.css';

function Dashboard({ empresas }) {

  const stats = useMemo(() => {
    const total = empresas.length;
    const conEmail = empresas.filter(e => e.email && e.email.trim() !== '').length;
    const conTelefono = empresas.filter(e => e.telefono && e.telefono.trim() !== '').length;
    const conWebsite = empresas.filter(e => e.website && e.website.trim() !== '').length;
    return { total, conEmail, conTelefono, conWebsite };
  }, [empresas]);


  return (
    <div className="dashboard-container">
      <div className="cards">
        <div className="card">
          <div className="card-title">Total</div>
          <div className="card-value">{stats.total}</div>
        </div>
        <div className="card">
          <div className="card-title">Con Email</div>
          <div className="card-value">{stats.conEmail}</div>
        </div>
        <div className="card">
          <div className="card-title">Con Teléfono</div>
          <div className="card-value">{stats.conTelefono}</div>
        </div>
        <div className="card">
          <div className="card-title">Con Website</div>
          <div className="card-value">{stats.conWebsite}</div>
        </div>
      </div>

      <div className="list">
        {empresas.map((e) => (
          <div key={e.id} className="list-row">
            <div className="name">{e.nombre || 'Sin nombre'}</div>
            <div className="meta">{e.rubro || 'N/A'}</div>
            <div className="meta">{e.ciudad || ''}</div>
            <div className="meta">{e.email || 'Sin email'}</div>
            <div className="meta">{e.telefono || 'Sin teléfono'}</div>
          </div>
        ))}
        {empresas.length === 0 && (
          <div className="empty">Sin datos filtrados</div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;



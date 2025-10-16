import React, { useMemo, useState } from 'react';
import axios from 'axios';
import './Dashboard.css';

const API_URL = 'http://localhost:8000';

function Dashboard({ empresas, onBulkStatusUpdated }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [targetStatus, setTargetStatus] = useState('contactada');

  const stats = useMemo(() => {
    const total = empresas.length;
    const byEstado = empresas.reduce((acc, e) => {
      const k = e.estado || 'sin_estado';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const validas = empresas.filter(e => e.validada === true || e.validada === 1).length;
    const conEmail = empresas.filter(e => e.email && e.email.trim() !== '').length;
    const conTelefono = empresas.filter(e => e.telefono && e.telefono.trim() !== '').length;
    return { total, byEstado, validas, conEmail, conTelefono };
  }, [empresas]);

  const allIds = useMemo(() => empresas.map(e => e.id).filter(Boolean), [empresas]);
  const allSelected = selectedIds.length > 0 && selectedIds.length === allIds.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const doBulkUpdate = async (ids) => {
    if (!ids || ids.length === 0) return;
    setUpdating(true);
    try {
      // Ejecutamos en serie simple para no saturar el backend
      for (const id of ids) {
        await axios.put(`${API_URL}/empresa/estado`, { id, estado: targetStatus });
      }
      if (onBulkStatusUpdated) onBulkStatusUpdated(ids, targetStatus);
      alert(`✓ Actualizado estado a ${targetStatus} para ${ids.length} empresas`);
    } catch (err) {
      alert('❌ Error en actualización masiva');
    } finally {
      setUpdating(false);
    }
  };

  const updateOne = async (id, estado) => {
    try {
      await axios.put(`${API_URL}/empresa/estado`, { id, estado });
      if (onBulkStatusUpdated) onBulkStatusUpdated([id], estado);
    } catch (err) {
      alert('❌ Error actualizando estado');
    }
  };

  const isAnySelected = selectedIds.length > 0;
  const bulkCount = selectedIds.length;

  return (
    <div className="dashboard-container">
      <div className="cards">
        <div className="card">
          <div className="card-title">Total</div>
          <div className="card-value">{stats.total}</div>
        </div>
        <div className="card">
          <div className="card-title">Válidas</div>
          <div className="card-value">{stats.validas}</div>
        </div>
        <div className="card">
          <div className="card-title">Con Email</div>
          <div className="card-value">{stats.conEmail}</div>
        </div>
        <div className="card">
          <div className="card-title">Con Teléfono</div>
          <div className="card-value">{stats.conTelefono}</div>
        </div>
      </div>

      <div className="status-breakdown">
        {['por_contactar','contactada','interesada','convertida','no_interesa','sin_estado'].map(k => (
          <div key={k} className="status-item">
            <span className={`estado-badge estado-${k}`}>{k.replace('_', ' ')}</span>
            <span className="count">{stats.byEstado[k] || 0}</span>
          </div>
        ))}
      </div>

      <div className="bulk-actions">
        <div className="controls">
          <div className="flow-hint">1) Seleccioná empresas · 2) Elegí estado · 3) Aplicá</div>
          <div className="status-segment">
            {[
              {k:'por_contactar', label:'Por contactar'},
              {k:'contactada', label:'Contactada'},
              {k:'interesada', label:'Interesada'},
              {k:'convertida', label:'Convertida'},
              {k:'no_interesa', label:'No interesa'},
            ].map(s => (
              <button
                key={s.k}
                type="button"
                className={`seg-btn seg-${s.k}${targetStatus === s.k ? ' active' : ''}`}
                onClick={() => setTargetStatus(s.k)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="buttons">
          <button className="btn btn-outline" disabled={updating} onClick={toggleSelectAll}>
            {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
          <button className="btn btn-outline" disabled={updating || selectedIds.length === 0} onClick={clearSelection}>
            Deseleccionar ({selectedIds.length})
          </button>
          <button 
            className="btn btn-success" 
            disabled={updating || bulkCount === 0} 
            onClick={() => doBulkUpdate(selectedIds)}
          >
            {`Actualizar seleccionados (${bulkCount})`}
          </button>
        </div>
      </div>

      <div className="list">
        {empresas.map((e) => (
          <label key={e.id} className="list-row">
            <input
              type="checkbox"
              checked={selectedIds.includes(e.id)}
              onChange={() => toggleSelectOne(e.id)}
            />
            <div className="name">{e.nombre || 'Sin nombre'}</div>
            <div className="meta">{e.rubro || 'N/A'}</div>
            <div className="meta">{e.ciudad || ''}</div>
            <span className={`estado-badge estado-${e.estado || 'sin_estado'}`}>{e.estado || 'sin_estado'}</span>
            <select
              className="row-status"
              value={e.estado || 'por_contactar'}
              onChange={(evt) => updateOne(e.id, evt.target.value)}
              title="Cambiar estado rápido"
            >
              <option value="por_contactar">Por contactar</option>
              <option value="contactada">Contactada</option>
              <option value="interesada">Interesada</option>
              <option value="convertida">Convertida</option>
              <option value="no_interesa">No interesa</option>
            </select>
          </label>
        ))}
        {empresas.length === 0 && (
          <div className="empty">Sin datos filtrados</div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;



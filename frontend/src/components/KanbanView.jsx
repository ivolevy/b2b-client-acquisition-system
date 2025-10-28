import React, { useMemo, useState } from 'react';
import axios from 'axios';
import './KanbanView.css';

const API_URL = 'http://localhost:8000';

function KanbanView({ empresas, onStatusUpdated }) {
  const [draggedCard, setDraggedCard] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const columns = useMemo(() => ([
    { key: 'por_contactar', title: ' Por contactar' },
    { key: 'contactada', title: ' Contactada' },
    { key: 'interesada', title: '⭐ Interesada' },
    { key: 'convertida', title: ' Convertida' },
    { key: 'no_interesa', title: ' No interesa' },
  ]), []);

  const grouped = useMemo(() => {
    const byStatus = {
      por_contactar: [],
      contactada: [],
      interesada: [],
      convertida: [],
      no_interesa: [],
    };
    (empresas || []).forEach((e) => {
      const estado = e.estado || 'por_contactar';
      if (byStatus[estado]) {
        byStatus[estado].push(e);
      } else {
        byStatus.por_contactar.push(e);
      }
    });
    return byStatus;
  }, [empresas]);

  const onDragStart = (e, card) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e, newEstado) => {
    e.preventDefault();
    if (!draggedCard || draggedCard.estado === newEstado) return;
    try {
      setUpdatingId(draggedCard.id);
      await axios.put(`${API_URL}/empresa/estado`, {
        id: draggedCard.id,
        nuevo_estado: newEstado,
      });
      if (onStatusUpdated) onStatusUpdated(draggedCard.id, newEstado);
    } catch (err) {
      alert('Error al actualizar estado');
      // no-op
    } finally {
      setUpdatingId(null);
      setDraggedCard(null);
    }
  };

  return (
    <div className="kanban-container">
      {columns.map((col) => (
        <div
          key={col.key}
          className="kanban-column"
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, col.key)}
        >
          <div className="kanban-column-header">{col.title}</div>
          <div className="kanban-column-body">
            {grouped[col.key].length === 0 && (
              <div className="kanban-empty">Vacío</div>
            )}
            {grouped[col.key].map((empresa) => (
              <div
                key={empresa.id}
                className={`kanban-card${updatingId === empresa.id ? ' updating' : ''}`}
                draggable
                onDragStart={(e) => onDragStart(e, empresa)}
                title={empresa.nombre || ''}
              >
                <div className="kanban-card-title">{empresa.nombre || 'Sin nombre'}</div>
                <div className="kanban-card-meta">
                  {empresa.rubro && <span className="pill">{empresa.rubro}</span>}
                  {empresa.ciudad && <span className="pill light">{empresa.ciudad}</span>}
                  {typeof empresa.lead_score === 'number' && (
                    <span className={`score ${empresa.lead_score >= 80 ? 'hot' : empresa.lead_score >= 60 ? 'warm' : empresa.lead_score >= 30 ? 'cold' : 'low'}`}>{empresa.lead_score}</span>
                  )}
                </div>
                {(empresa.website || empresa.sitio_web) && (
                  <a
                    className="kanban-card-link"
                    href={empresa.website || empresa.sitio_web}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                     Sitio
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default KanbanView;



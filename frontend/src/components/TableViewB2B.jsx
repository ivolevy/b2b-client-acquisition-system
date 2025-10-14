import React, { useState } from 'react';
import './TableView.css';

function TableViewB2B({ empresas }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = empresas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(empresas.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (empresas.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏢</div>
        <h3>No hay empresas para mostrar</h3>
        <p>Selecciona un rubro empresarial y busca en OpenStreetMap</p>
        <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
          💡 El sistema valida automáticamente emails y teléfonos
        </p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-header">
        <h2>Empresas B2B: {empresas.length} resultados</h2>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', fontWeight: 'normal' }}>
          ✓ <strong style={{color: '#059669'}}>Válida</strong> = tiene email o teléfono · 
          ⚠️ <strong style={{color: '#d97706'}}>Pendiente</strong> = sin contacto (solo ubicación/web)
        </div>
      </div>

      <div className="table-wrapper">
        <table className="properties-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Empresa</th>
              <th>Rubro</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Website</th>
              <th>Ciudad/País</th>
              <th>Validada</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((empresa) => (
              <tr key={empresa.id}>
                <td>{empresa.id}</td>
                <td className="name-cell">
                  {empresa.nombre || 'Sin nombre'}
                  {empresa.direccion && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      📍 {empresa.direccion}
                    </div>
                  )}
                </td>
                <td>
                  <span className="category-badge">{empresa.rubro || 'N/A'}</span>
                </td>
                <td>
                  {empresa.email ? (
                    <div>
                      <a href={`mailto:${empresa.email}`} className="link">
                        {empresa.email}
                      </a>
                      {empresa.email_valido && (
                        <span style={{ color: 'green', marginLeft: '5px' }}>✓</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-data">Sin email</span>
                  )}
                </td>
                <td>
                  {empresa.telefono ? (
                    <div>
                      <a href={`tel:${empresa.telefono}`} className="link">
                        {empresa.telefono}
                      </a>
                      {empresa.telefono_valido && (
                        <span style={{ color: 'green', marginLeft: '5px' }}>✓</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-data">Sin teléfono</span>
                  )}
                </td>
                <td>
                  {empresa.website ? (
                    <a 
                      href={empresa.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="link"
                    >
                      🔗 Ver sitio
                    </a>
                  ) : (
                    <span className="no-data">Sin web</span>
                  )}
                  {empresa.linkedin && (
                    <div>
                      <a 
                        href={empresa.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="link"
                        style={{ fontSize: '12px' }}
                      >
                        💼 LinkedIn
                      </a>
                    </div>
                  )}
                </td>
                <td>
                  {empresa.ciudad && <div>{empresa.ciudad}</div>}
                  {empresa.pais && (
                    <div style={{ fontSize: '12px', color: '#666' }}>{empresa.pais}</div>
                  )}
                </td>
                <td>
                  {empresa.validada ? (
                    <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Válida</span>
                  ) : (
                    <span style={{ color: 'orange' }}>⚠️ Pendiente</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Anterior
          </button>
          
          <div className="pagination-info">
            Página {currentPage} de {totalPages}
          </div>
          
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

export default TableViewB2B;


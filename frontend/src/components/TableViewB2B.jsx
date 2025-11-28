import React, { useState, useEffect, useRef } from 'react';
import './TableView.css';
import { FaInstagram, FaFacebook, FaXTwitter, FaLinkedin, FaYoutube, FaTiktok } from 'react-icons/fa6';

function TableViewB2B({ empresas }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const tableContainerRef = useRef(null);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = empresas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(empresas.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [empresas]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Hacer scroll solo hasta el inicio de la tabla, no hasta el top de la página
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (empresas.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"></div>
        <h3>No hay empresas para mostrar</h3>
        <p>Selecciona un rubro empresarial y busca en OpenStreetMap</p>
        <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
           El sistema valida automáticamente emails y teléfonos
        </p>
      </div>
    );
  }

  return (
    <div className="table-container" ref={tableContainerRef}>
      <div className="table-header">
        <h2>Empresas B2B: {empresas.length} resultados</h2>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', fontWeight: 'normal' }}>
           Empresas encontradas en OpenStreetMap
        </div>
      </div>

      <div className="table-wrapper">
        <table className="properties-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Rubro</th>
              <th>Distancia</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Website</th>
              <th>Redes</th>
              <th>Ciudad/País</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((empresa) => (
              <tr key={empresa.id}>
                <td className="name-cell">
                  {empresa.nombre || 'Sin nombre'}
                  {empresa.direccion && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                       {empresa.direccion}
                    </div>
                  )}
                </td>
                <td>
                  <span className="category-badge">{empresa.rubro || 'N/A'}</span>
                </td>
                <td>
                  {empresa.distancia_km !== null && empresa.distancia_km !== undefined ? (
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: '500',
                      color: '#667eea'
                    }}>
                      {empresa.distancia_km.toFixed(2)} km
                      {empresa.busqueda_ubicacion_nombre && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#6b7280', 
                          marginTop: '2px',
                          fontStyle: 'italic'
                        }}>
                          desde {empresa.busqueda_ubicacion_nombre.length > 30 
                            ? empresa.busqueda_ubicacion_nombre.substring(0, 30) + '...' 
                            : empresa.busqueda_ubicacion_nombre}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="no-data">-</span>
                  )}
                </td>
                <td>
                  {empresa.email ? (
                    <a href={`mailto:${empresa.email}`} className="link">
                      {empresa.email}
                    </a>
                  ) : (
                    <span className="no-data">Sin email</span>
                  )}
                </td>
                <td>
                  {empresa.telefono ? (
                    <a href={`tel:${empresa.telefono}`} className="link">
                      {empresa.telefono}
                    </a>
                  ) : (
                    <span className="no-data">Sin teléfono</span>
                  )}
                </td>
                <td>
                  {empresa.website || empresa.sitio_web ? (
                    <a 
                      href={empresa.website || empresa.sitio_web} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="link"
                    >
                       Ver sitio
                    </a>
                  ) : (
                    <span className="no-data">Sin web</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {empresa.instagram && (
                      <a 
                        href={empresa.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Instagram"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                          color: 'white',
                          fontSize: '18px',
                          transition: 'transform 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <FaInstagram />
                      </a>
                    )}
                    {empresa.facebook && (
                      <a 
                        href={empresa.facebook} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Facebook"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: '#1877f2',
                          color: 'white',
                          fontSize: '18px',
                          transition: 'transform 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <FaFacebook />
                      </a>
                    )}
                    {empresa.twitter && (
                      <a 
                        href={empresa.twitter} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Twitter/X"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: '#000000',
                          color: 'white',
                          fontSize: '18px',
                          transition: 'transform 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <FaXTwitter />
                      </a>
                  )}
                  {empresa.linkedin && (
                      <a 
                        href={empresa.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="LinkedIn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: '#0077b5',
                          color: 'white',
                          fontSize: '18px',
                          transition: 'transform 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <FaLinkedin />
                      </a>
                    )}
                    {empresa.youtube && (
                      <a 
                        href={empresa.youtube} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="YouTube"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: '#ff0000',
                          color: 'white',
                          fontSize: '18px',
                          transition: 'transform 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <FaYoutube />
                      </a>
                    )}
                    {empresa.tiktok && (
                      <a 
                        href={empresa.tiktok} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="TikTok"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: '#000000',
                          color: '#00f2ea',
                          fontSize: '18px',
                          transition: 'transform 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <FaTiktok />
                      </a>
                    )}
                    {!empresa.instagram && !empresa.facebook && !empresa.twitter && 
                     !empresa.linkedin && !empresa.youtube && !empresa.tiktok && (
                      <span className="no-data">-</span>
                    )}
                  </div>
                </td>
                <td>
                  {empresa.ciudad && <div>{empresa.ciudad}</div>}
                  {empresa.pais && (
                    <div style={{ fontSize: '12px', color: '#666' }}>{empresa.pais}</div>
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


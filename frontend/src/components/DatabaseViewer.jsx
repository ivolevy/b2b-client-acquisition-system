import React, { useState, useMemo, useEffect } from 'react';
import './DatabaseViewer.css';

function DatabaseViewer({ empresas, stats, onClose }) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRubro, setFilterRubro] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedRow, setExpandedRow] = useState(null);
  const itemsPerPage = 10;

  // Obtener rubros únicos
  const rubrosUnicos = useMemo(() => {
    return [...new Set(empresas.map(e => e.rubro))].filter(Boolean).sort();
  }, [empresas]);

  // Filtrar y ordenar empresas
  const empresasFiltradas = useMemo(() => {
    let filtered = [...empresas];

    // Búsqueda por texto
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.telefono?.includes(searchTerm) ||
        emp.direccion?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por rubro
    if (filterRubro) {
      filtered = filtered.filter(emp => emp.rubro === filterRubro);
    }


    // Ordenar
    filtered.sort((a, b) => {
      let aVal = a[sortColumn] || '';
      let bVal = b[sortColumn] || '';
      
      if (sortColumn === 'id') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [empresas, searchTerm, filterRubro, sortColumn, sortDirection]);

  // Paginación
  const totalPages = Math.ceil(empresasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const empresasPaginadas = empresasFiltradas.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles!');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRubro('');
    setCurrentPage(1);
  };

  return (
    <div className="db-viewer-overlay" onClick={onClose}>
      <div className="db-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="db-viewer-header">
          <h2> Vista de Base de Datos</h2>
          <button className="close-btn" onClick={onClose}></button>
        </div>

        <div className="db-viewer-content">
          {/* Estadísticas */}
          <div className="db-stats">
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-info">
                <div className="stat-value">{stats.total || 0}</div>
                <div className="stat-label">Total Empresas</div>
              </div>
            </div>
            
            
            <div className="stat-card blue">
              <div className="stat-icon"></div>
              <div className="stat-info">
                <div className="stat-value">{stats.con_email || 0}</div>
                <div className="stat-label">Con Email</div>
              </div>
            </div>
            
            <div className="stat-card purple">
              <div className="stat-icon"></div>
              <div className="stat-info">
                <div className="stat-value">{stats.con_telefono || 0}</div>
                <div className="stat-label">Con Teléfono</div>
              </div>
            </div>
            
            <div className="stat-card green">
              <div className="stat-icon"></div>
              <div className="stat-info">
                <div className="stat-value">{stats.con_website || 0}</div>
                <div className="stat-label">Con Website</div>
              </div>
            </div>
          </div>

          {/* Info de la DB */}
          <div className="db-info">
            <h3> Información de la Base de Datos</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Tipo:</strong> Base de datos (SQLite removido - pendiente migración)
              </div>
              <div className="info-item">
                <strong>Ubicación:</strong> N/A (pendiente migración)
              </div>
              <div className="info-item">
                <strong>Registros:</strong> {stats.total || 0} empresas
              </div>
              <div className="info-item">
                <strong>Estado:</strong> <span className="status-active">● Activa</span>
              </div>
            </div>
          </div>

          {/* Controles de Filtrado y Búsqueda */}
          <div className="db-controls">
            <div className="search-bar">
              <span className="search-icon"></span>
              <input
                type="text"
                placeholder="Buscar por nombre, email, teléfono o dirección..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}></button>
              )}
            </div>

            <div className="filters-row">
              <select 
                value={filterRubro} 
                onChange={(e) => {
                  setFilterRubro(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-select"
              >
                <option value=""> Todos los rubros</option>
                {rubrosUnicos.map(rubro => (
                  <option key={rubro} value={rubro}>{rubro}</option>
                ))}
              </select>


              <button className="btn-clear-filters" onClick={clearFilters}>
                 Limpiar Filtros
              </button>
            </div>

            <div className="results-info">
              Mostrando {empresasPaginadas.length} de {empresasFiltradas.length} empresas
              {empresasFiltradas.length !== empresas.length && ` (${empresas.length} total)`}
            </div>
          </div>

          {/* Tabla de Registros */}
          <div className="db-preview">
            {empresasFiltradas.length === 0 ? (
              <p className="empty-message">
                {searchTerm || filterRubro ? 
                  ' No se encontraron empresas con los filtros aplicados' : 
                  ' No hay registros en la base de datos'
                }
              </p>
            ) : (
              <>
                <div className="preview-table">
                  <table>
                    <thead>
                      <tr>
                        <th onClick={() => handleSort('id')} className="sortable">
                          ID {sortColumn === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => handleSort('nombre')} className="sortable">
                          Nombre {sortColumn === 'nombre' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => handleSort('rubro')} className="sortable">
                          Rubro {sortColumn === 'rubro' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Website</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresasPaginadas.map((empresa) => (
                        <React.Fragment key={empresa.id}>
                          <tr className={expandedRow === empresa.id ? 'expanded' : ''}>
                            <td>{empresa.id}</td>
                            <td className="empresa-nombre">
                              <div>{empresa.nombre}</div>
                              {empresa.direccion && (
                                <div className="direccion-small"> {empresa.direccion}</div>
                              )}
                            </td>
                            <td><span className="rubro-badge">{empresa.rubro}</span></td>
                            <td>
                              {empresa.email ? (
                                <div className="contact-field">
                                  <span>{empresa.email}</span>
                                </div>
                              ) : (
                                <span className="empty-field">Sin email</span>
                              )}
                            </td>
                            <td>
                              {empresa.telefono ? (
                                <div className="contact-field">
                                  <span>{empresa.telefono}</span>
                                </div>
                              ) : (
                                <span className="empty-field">Sin teléfono</span>
                              )}
                            </td>
                            <td>
                              {empresa.website ? (
                                <a href={empresa.website} target="_blank" rel="noopener noreferrer" className="website-link">
                                   Ver sitio
                                </a>
                              ) : (
                                <span className="empty-field">Sin website</span>
                              )}
                            </td>
                            <td>
                              <div className="action-buttons">
                                {empresa.email && (
                                  <button 
                                    className="btn-action" 
                                    onClick={() => copyToClipboard(empresa.email)}
                                    title="Copiar email"
                                  >
                                    
                                  </button>
                                )}
                                <button 
                                  className="btn-action" 
                                  onClick={() => setExpandedRow(expandedRow === empresa.id ? null : empresa.id)}
                                  title="Ver detalles"
                                >
                                  {expandedRow === empresa.id ? '▲' : '▼'}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedRow === empresa.id && (
                            <tr className="detail-row">
                              <td colSpan="7">
                                <div className="detail-content">
                                  <div className="detail-grid">
                                    <div className="detail-item">
                                      <strong> Dirección:</strong>
                                      <span>{empresa.direccion || 'No disponible'}</span>
                                    </div>
                                    <div className="detail-item">
                                      <strong> Sitio Web:</strong>
                                      {empresa.sitio_web ? (
                                        <a href={empresa.sitio_web} target="_blank" rel="noopener noreferrer">
                                          {empresa.sitio_web}
                                        </a>
                                      ) : (
                                        <span>No disponible</span>
                                      )}
                                    </div>
                                    <div className="detail-item">
                                      <strong> LinkedIn:</strong>
                                      {empresa.linkedin ? (
                                        <a href={empresa.linkedin} target="_blank" rel="noopener noreferrer">
                                          Ver perfil
                                        </a>
                                      ) : (
                                        <span>No disponible</span>
                                      )}
                                    </div>
                                    <div className="detail-item">
                                      <strong> Redes:</strong>
                                      <span>
                                        {(empresa.instagram || empresa.facebook || empresa.twitter || empresa.youtube || empresa.tiktok) ? (
                                          <span style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {empresa.instagram && (<a href={empresa.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>)}
                                            {empresa.facebook && (<a href={empresa.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>)}
                                            {empresa.twitter && (<a href={empresa.twitter} target="_blank" rel="noopener noreferrer">Twitter/X</a>)}
                                            {empresa.youtube && (<a href={empresa.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>)}
                                            {empresa.tiktok && (<a href={empresa.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>)}
                                          </span>
                                        ) : (
                                          'No disponible'
                                        )}
                                      </span>
                                    </div>
                                    <div className="detail-item">
                                      <strong> Coordenadas:</strong>
                                      <span>
                                        {empresa.latitud && empresa.longitud ? 
                                          `${empresa.latitud}, ${empresa.longitud}` : 
                                          'No disponible'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      ← Anterior
                    </button>
                    
                    <div className="pagination-info">
                      Página {currentPage} de {totalPages}
                    </div>
                    
                    <button 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="pagination-btn"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="db-viewer-footer">
          <div className="footer-stats">
            {empresasFiltradas.length} registro{empresasFiltradas.length !== 1 ? 's' : ''} {filterRubro || searchTerm ? 'filtrado' + (empresasFiltradas.length !== 1 ? 's' : '') : ''}
          </div>
          <button className="btn-close" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default DatabaseViewer;


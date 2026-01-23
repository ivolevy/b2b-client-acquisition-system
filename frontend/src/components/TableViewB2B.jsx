import React, { useState, useEffect, useRef, useMemo } from 'react';
import './TableView.css';
import { FaInstagram, FaFacebook, FaXTwitter, FaLinkedin, FaYoutube, FaTiktok, FaLocationDot, FaFilePdf } from 'react-icons/fa6';
import { useAuth } from '../AuthWrapper';

function TableViewB2B({ 
  empresas, 
  showAllResults = false, 
  rubros = {},
  view,
  setView,
  onExportCSV,
  onExportPDF,
  onDeleteResults,

  loading,
  toastWarning
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState(null);
  const [sortColumn, setSortColumn] = useState(null);
  const { user } = useAuth();
  const isPro = true; // Todo es Pro ahora
  // Limitar itemsPerPage para evitar problemas de rendimientoaa
  const itemsPerPage = (isPro && showAllResults) ? 500 : 10;
  const tableContainerRef = useRef(null);

  // Filtros instantáneos
  const [filtroRubro, setFiltroRubro] = useState('');
  const [filtroConEmail, setFiltroConEmail] = useState(false);
  const [filtroConTelefono, setFiltroConTelefono] = useState(false);
  const [filtroDistancia, setFiltroDistancia] = useState('');
  const [filtroDistanciaOperador, setFiltroDistanciaOperador] = useState('mayor');
  const [filtroConRedes, setFiltroConRedes] = useState('todas');
  
  // Estado para el dropdown de rubros con buscador
  const [rubroDropdownOpen, setRubroDropdownOpen] = useState(false);
  const [rubroBusqueda, setRubroBusqueda] = useState('');
  const rubroDropdownRef = useRef(null);
  
  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rubroDropdownRef.current && !rubroDropdownRef.current.contains(event.target)) {
        setRubroDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Filtrar rubros según búsqueda
  const rubrosFiltrados = useMemo(() => {
    const entries = Object.entries(rubros);
    if (!rubroBusqueda) return entries;
    return entries.filter(([key, nombre]) => 
      nombre.toLowerCase().includes(rubroBusqueda.toLowerCase()) ||
      key.toLowerCase().includes(rubroBusqueda.toLowerCase())
    );
  }, [rubros, rubroBusqueda]);
  
  const handleSelectRubro = (key) => {
    setFiltroRubro(key);
    setRubroDropdownOpen(false);
    setRubroBusqueda('');
  };

  // Aplicar filtros instantáneamente
  const empresasFiltradas = useMemo(() => {
    let filtered = [...empresas];

    if (filtroRubro) {
      filtered = filtered.filter(e => e.rubro_key === filtroRubro);
    }

    if (filtroConEmail) {
      filtered = filtered.filter(e => e.email && e.email.trim() !== '');
    }

    if (filtroConTelefono) {
      filtered = filtered.filter(e => e.telefono && e.telefono.trim() !== '');
    }

    if (filtroDistancia) {
      const distanciaValue = parseFloat(filtroDistancia);
      if (!isNaN(distanciaValue) && isFinite(distanciaValue) && distanciaValue >= 0) {
        if (filtroDistanciaOperador === 'mayor') {
          filtered = filtered.filter(e => {
            const dist = e.distancia_km;
            return dist !== null && dist !== undefined && 
                   typeof dist === 'number' && isFinite(dist) && dist > distanciaValue;
          });
        } else {
          filtered = filtered.filter(e => {
            const dist = e.distancia_km;
            return dist !== null && dist !== undefined && 
                   typeof dist === 'number' && isFinite(dist) && dist < distanciaValue;
          });
        }
      }
    }

    if (filtroConRedes === 'con') {
      filtered = filtered.filter(e => 
        e.instagram || e.facebook || e.twitter || e.linkedin || e.youtube || e.tiktok
      );
    } else if (filtroConRedes === 'sin') {
      filtered = filtered.filter(e => 
        !e.instagram && !e.facebook && !e.twitter && !e.linkedin && !e.youtube && !e.tiktok
      );
    }

    return filtered;
  }, [empresas, filtroRubro, filtroConEmail, filtroConTelefono, filtroDistancia, filtroDistanciaOperador, filtroConRedes]);

  // Ordenamiento
  const empresasOrdenadas = useMemo(() => {
    if (!sortBy || !sortColumn) return empresasFiltradas;

    return [...empresasFiltradas].sort((a, b) => {
      let valA, valB;

      switch (sortColumn) {
        case 'distancia':
          valA = a.distancia_km;
          valB = b.distancia_km;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;
          break;
        case 'nombre':
          valA = (a.nombre || '').toLowerCase();
          valB = (b.nombre || '').toLowerCase();
          break;
        case 'rubro':
          valA = (a.rubro || '').toLowerCase();
          valB = (b.rubro || '').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortBy === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
  }, [empresasFiltradas, sortBy, sortColumn]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = empresasOrdenadas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(empresasOrdenadas.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [empresas, sortBy, filtroRubro, filtroConEmail, filtroConTelefono, filtroDistancia, filtroDistanciaOperador, filtroConRedes]);

  const handleSort = (column) => {
    // Permitir ordenar por distancia a todos los usuarios
    if (column === 'distancia' || true) {
    if (sortColumn === column) {
      if (sortBy === 'asc') {
        setSortBy('desc');
      } else if (sortBy === 'desc') {
        setSortBy(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortBy('asc');
      }
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLimpiarFiltros = () => {
    setFiltroRubro('');
    setFiltroConEmail(false);
    setFiltroConTelefono(false);
    setFiltroDistancia('');
    setFiltroDistanciaOperador('mayor');
    setFiltroConRedes('todas');
  };

  const hayFiltrosActivos = filtroRubro || filtroConEmail || filtroConTelefono || filtroDistancia || filtroConRedes !== 'todas';

    return (
    <div className="unified-results-module" ref={tableContainerRef}>
      {/* Header unificado */}
      <div className="results-unified-header">
        <div className="results-title-section">
          <h2>Resultados</h2>
          <div className="results-counts">
            <span className="count-filtered">{empresasFiltradas.length}</span>
            {hayFiltrosActivos && <span className="count-separator">de</span>}
            {hayFiltrosActivos && <span className="count-total">{empresas.length}</span>}
            <span className="count-label">empresas</span>
          </div>

          <div className="header-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn-action-inline btn-export"
              onClick={() => onExportCSV(empresasFiltradas)}
              disabled={empresasFiltradas.length === 0}
              style={{ height: '32px', padding: '0 12px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>

            <button 
              type="button" 
              className="btn-action-inline btn-export-pdf"
              onClick={() => onExportPDF(empresasFiltradas)}
              disabled={empresasFiltradas.length === 0}
              style={{ height: '32px', padding: '0 12px' }}
              title="Exportar a PDF"
            >
              <FaFilePdf style={{ marginRight: '6px' }} />
              PDF
            </button>

            <button
              type="button"
              className="btn-action-inline btn-delete"
              onClick={onDeleteResults}
              disabled={loading || empresas.length === 0}
              title="Borrar todos los resultados"
              style={{ height: '32px', width: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filtros inline instantáneos */}
      <div className="filters-inline-bar">
        {/* Checkboxes de email y teléfono a la izquierda */}
        <div className="filter-checkboxes-group" style={{ marginRight: 'auto' }}>
          <label className="filter-checkbox-inline">
            <input
              type="checkbox"
              checked={filtroConEmail}
              onChange={(e) => setFiltroConEmail(e.target.checked)}
            />
            <span>Email</span>
          </label>

          <label className="filter-checkbox-inline">
            <input
              type="checkbox"
              checked={filtroConTelefono}
              onChange={(e) => setFiltroConTelefono(e.target.checked)}
            />
            <span>Teléfono</span>
          </label>
        </div>

        <div className="filter-distance-group">
          <div className="filter-distance-toggle">
            <button
              type="button"
              className={`filter-toggle-btn ${filtroDistanciaOperador === 'menor' ? 'active' : ''}`}
              onClick={() => setFiltroDistanciaOperador('menor')}
              title="Menos de X km"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="M12 5l-7 7 7 7"/>
              </svg>
              <span>Menos de</span>
            </button>
            <button
              type="button"
              className={`filter-toggle-btn ${filtroDistanciaOperador === 'mayor' ? 'active' : ''}`}
              onClick={() => setFiltroDistanciaOperador('mayor')}
              title="Más de X km"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="M12 5l7 7-7 7"/>
              </svg>
              <span>Más de</span>
            </button>
          </div>
          <input
            type="number"
            placeholder="km"
            value={filtroDistancia}
            onChange={(e) => setFiltroDistancia(e.target.value)}
            min="0"
            step="0.1"
            className="filter-inline-input filter-km"
          />
        </div>

        {/* Dropdown de rubros con buscador */}
        <div className="rubro-dropdown" ref={rubroDropdownRef}>
          <button 
            type="button"
            className={`rubro-dropdown-trigger ${filtroRubro ? 'has-value' : ''}`}
            onClick={() => setRubroDropdownOpen(!rubroDropdownOpen)}
          >
            <svg className="rubro-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span className="rubro-text">
              {filtroRubro ? rubros[filtroRubro] || filtroRubro : 'Todos los rubros'}
            </span>
            <svg className={`rubro-chevron ${rubroDropdownOpen ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          
          {rubroDropdownOpen && (
            <div className="rubro-dropdown-menu">
              <div className="rubro-search-container">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar rubro..."
                  value={rubroBusqueda}
                  onChange={(e) => setRubroBusqueda(e.target.value)}
                  className="rubro-search-input"
                  autoFocus
                />
              </div>
              <div className="rubro-options-list">
                <button
                  type="button"
                  className={`rubro-option ${!filtroRubro ? 'selected' : ''}`}
                  onClick={() => handleSelectRubro('')}
                >
                  Todos los rubros
                </button>
                {rubrosFiltrados.map(([key, nombre]) => (
                  <button
                    key={key}
                    type="button"
                    className={`rubro-option ${filtroRubro === key ? 'selected' : ''}`}
                    onClick={() => handleSelectRubro(key)}
                  >
                    {nombre}
                  </button>
                ))}
                {rubrosFiltrados.length === 0 && (
                  <div className="rubro-no-results">
                    No se encontraron rubros
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="custom-select-wrapper">
          <select 
            value={filtroConRedes} 
            onChange={(e) => setFiltroConRedes(e.target.value)}
            className="filter-inline-input"
          >
            <option value="todas">Redes: todas</option>
            <option value="con">Con redes</option>
            <option value="sin">Sin redes</option>
          </select>
          <svg className="select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Selector de ordenamiento */}
        {/* Selector de ordenamiento */}
        <div className="custom-select-wrapper" style={{ width: 'auto', minWidth: '180px' }}>
          <select 
            value={sortColumn && sortBy ? `${sortColumn}-${sortBy}` : ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value) {
                const [column, order] = value.split('-');
                setSortColumn(column);
                setSortBy(order);
              } else {
                setSortColumn(null);
                setSortBy(null);
              }
            }}
            className="filter-inline-input"
            style={{ minWidth: '100%' }}
          >
            <option value="">Ordenar por...</option>
            <option value="distancia-asc">Distancia: Más cercano</option>
            <option value="distancia-desc">Distancia: Más lejano</option>
            <option value="nombre-asc">Nombre: A-Z</option>
            <option value="nombre-desc">Nombre: Z-A</option>
            <option value="rubro-asc">Rubro: A-Z</option>
            <option value="rubro-desc">Rubro: Z-A</option>
          </select>
          <svg className="select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {hayFiltrosActivos && (
          <button 
            type="button" 
            className="btn-clear-filters"
            onClick={handleLimpiarFiltros}
            title="Limpiar filtros"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}


      </div>

      {/* Contenido: Tabla o Empty State o Loading Skeleton */}
      {loading ? (
        <div className="table-wrapper">
          <table className="properties-table">
             <thead>
               <tr>
                 <th style={{width:'45px'}}>#</th>
                 <th>Empresa</th>
                 <th>Rubro</th>
                 <th>Dist.</th>
                 <th>Email</th>
                 <th>Teléfono</th>
                 <th>Web</th>
                 <th>Redes</th>
                 <th style={{width:'80px'}}>Ir</th>
               </tr>
             </thead>
             <tbody>
                {[...Array(8)].map((_, i) => (
                  <tr key={i}>
                     <td><div className="skeleton skeleton-text" style={{width:'20px'}}></div></td>
                     <td><div className="skeleton skeleton-text" style={{width:'150px'}}></div></td>
                     <td><div className="skeleton skeleton-text" style={{width:'100px'}}></div></td>
                     <td><div className="skeleton skeleton-text" style={{width:'60px'}}></div></td>
                     <td><div className="skeleton skeleton-text" style={{width:'120px'}}></div></td>
                     <td><div className="skeleton skeleton-text" style={{width:'100px'}}></div></td>
                     <td><div className="skeleton skeleton-text" style={{width:'40px'}}></div></td>
                     <td><div className="skeleton skeleton-text" style={{width:'100px'}}></div></td>
                     <td><div className="skeleton skeleton-text" style={{width:'30px'}}></div></td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      ) : empresas.length === 0 ? (
        <div className="empty-state-inline">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <h3>No hay empresas para mostrar</h3>
          <p>Realiza una búsqueda para ver resultados aquí</p>
        </div>
      ) : empresasFiltradas.length === 0 ? (
        <div className="empty-state-inline">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </div>
          <h3>Sin resultados con estos filtros</h3>
          <p>Prueba ajustando los filtros o</p>
          <button onClick={handleLimpiarFiltros} className="btn-link">limpiar todos</button>
        </div>
      ) : (
        <>
      <div className="table-wrapper">
        <table className="properties-table">
          <thead>
            <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                  <th
                    onClick={() => handleSort('nombre')}
                    className="sortable-header"
                    title="Click para ordenar"
                  >
                    Empresa
                    {sortColumn === 'nombre' && (
                      <span className="sort-indicator">{sortBy === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                  <th
                    onClick={() => handleSort('rubro')}
                    className="sortable-header"
                    title="Click para ordenar"
                  >
                    Rubro
                    {sortColumn === 'rubro' && (
                      <span className="sort-indicator">{sortBy === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                  <th
                    onClick={() => handleSort('distancia')}
                    className="sortable-header"
                    title="Click para ordenar por distancia"
                  >
                    Dist.
                    {sortColumn === 'distancia' && (
                      <span className="sort-indicator">{sortBy === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
              <th>Email</th>
              <th>Teléfono</th>
                  <th>Web</th>
              <th>Redes</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Ir</th>
            </tr>
          </thead>
          <tbody>
                {currentItems.map((empresa, index) => (
              <tr key={empresa.id}>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#3b82f6' }}>
                      {indexOfFirstItem + index + 1}
                    </td>
                <td className="name-cell">
                  {empresa.nombre || 'Sin nombre'}

                </td>
                <td>
                  <span className="category-badge">{empresa.rubro || 'N/A'}</span>
                </td>
                <td>
                  {empresa.distancia_km !== null && empresa.distancia_km !== undefined ? (
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#3b82f6' }}>
                          {empresa.distancia_km.toFixed(1)} km
                        </span>
                  ) : (
                    <span className="no-data">-</span>
                  )}
                </td>
                <td>
                  {empresa.email ? (
                        <a href={`mailto:${empresa.email}`} className="link" style={{ fontSize: '12px' }}>
                          {empresa.email.length > 25 ? empresa.email.substring(0, 25) + '...' : empresa.email}
                    </a>
                  ) : (
                        <span className="no-data">-</span>
                  )}
                </td>
                <td>
                  {empresa.telefono ? (
                        <a href={`tel:${empresa.telefono}`} className="link" style={{ fontSize: '12px' }}>
                      {empresa.telefono}
                    </a>
                  ) : (
                        <span className="no-data">-</span>
                  )}
                </td>
                <td>
                  {empresa.website || empresa.sitio_web ? (
                    <a 
                      href={empresa.website || empresa.sitio_web} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="link"
                          style={{ fontSize: '12px' }}
                    >
                          Ver
                    </a>
                  ) : (
                        <span className="no-data">-</span>
                  )}
                </td>
                <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {empresa.instagram && (
                          <a href={empresa.instagram} target="_blank" rel="noopener noreferrer" className="social-icon instagram" title="Instagram">
                        <FaInstagram />
                      </a>
                    )}
                    {empresa.facebook && (
                          <a href={empresa.facebook} target="_blank" rel="noopener noreferrer" className="social-icon facebook" title="Facebook">
                        <FaFacebook />
                      </a>
                    )}
                    {empresa.twitter && (
                          <a href={empresa.twitter} target="_blank" rel="noopener noreferrer" className="social-icon twitter" title="Twitter/X">
                        <FaXTwitter />
                      </a>
                  )}
                  {empresa.linkedin && (
                          <a href={empresa.linkedin} target="_blank" rel="noopener noreferrer" className="social-icon linkedin" title="LinkedIn">
                        <FaLinkedin />
                      </a>
                    )}
                    {empresa.youtube && (
                          <a href={empresa.youtube} target="_blank" rel="noopener noreferrer" className="social-icon youtube" title="YouTube">
                        <FaYoutube />
                      </a>
                    )}
                    {empresa.tiktok && (
                          <a href={empresa.tiktok} target="_blank" rel="noopener noreferrer" className="social-icon tiktok" title="TikTok">
                        <FaTiktok />
                      </a>
                    )}
                    {!empresa.instagram && !empresa.facebook && !empresa.twitter && 
                     !empresa.linkedin && !empresa.youtube && !empresa.tiktok && (
                      <span className="no-data">-</span>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                        {(empresa.direccion || empresa.ciudad || (empresa.latitud && empresa.longitud)) && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${empresa.direccion && empresa.ciudad ? encodeURIComponent(`${empresa.direccion}, ${empresa.ciudad}${empresa.codigo_postal ? ` ${empresa.codigo_postal}` : ''}${empresa.pais ? `, ${empresa.pais}` : ''}`) : empresa.direccion ? encodeURIComponent(empresa.direccion) : `${empresa.latitud},${empresa.longitud}`}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn-mini go-btn"
                      title="Ir a la ubicación en Google Maps"
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '16px',
                        textDecoration: 'none'
                      }}
                          >
                            <FaLocationDot style={{ color: '#EA4335', fontSize: '18px' }} />
                          </a>
                        )}
                  {!empresa.direccion && !empresa.ciudad && !empresa.latitud && !empresa.longitud && (
                    <span className="no-data">-</span>
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
          
          {/* Atribución de Google - Requerida por TOS */}
          {empresas.some(e => e.fuente === 'google') && (
            <div className="google-attribution-container" style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginTop: '1.5rem',
              padding: '10px',
              borderTop: '1px solid rgba(255,105,180,0.1)'
            }}>
              <img 
                src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" 
                alt="Powered by Google" 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.insertAdjacentHTML('afterend', '<span style="color: #666; font-size: 11px; font-weight: 500; font-family: sans-serif;">Powered by Google</span>');
                }}
                style={{ height: '18px', opacity: 0.8, display: 'block' }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TableViewB2B;

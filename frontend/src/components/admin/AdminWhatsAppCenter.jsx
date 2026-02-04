import React, { useState, useEffect, useMemo, useRef } from 'react';
import { adminService } from '../../lib/supabase';
import WhatsAppSender from '../WhatsAppSender';
import TemplateManager from '../TemplateManager';
import { FiSearch, FiMessageCircle, FiCheckSquare, FiSquare, FiFilter, FiUsers, FiLayout } from 'react-icons/fi';
import '../TableView.css'; // Reuse TableView styles
import './AdminUsers.css'; // Reuse Admin styles

function AdminWhatsAppCenter() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('prospectos'); // prospectos | plantillas
  
  // Selection
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Modals
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'compose'

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [itemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Load Users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error: usersError } = await adminService.getAllUsers();
      if (usersError) throw usersError;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter Logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Must have phone
      if (!user.phone || user.phone.length < 5) return false;

      // Role Filter
      if (filterRole !== 'all' && user.role !== filterRole) return false;
      
      // Search Filter
      if (searchText) {
        const term = searchText.toLowerCase();
        const name = (user.name || '').toLowerCase();
        const phone = (user.phone || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        if (!name.includes(term) && !phone.includes(term) && !email.includes(term)) return false;
      }
      
      return true;
    });
  }, [users, filterRole, searchText]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection Logic
  const toggleUser = (user) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const toggleAllPage = () => {
    const allIdsOnPage = paginatedUsers.map(u => u.id);
    const allSelected = allIdsOnPage.every(id => selectedUsers.find(u => u.id === id));
    
    if (allSelected) {
      setSelectedUsers(selectedUsers.filter(u => !allIdsOnPage.includes(u.id)));
    } else {
      const newSelected = [...selectedUsers];
      paginatedUsers.forEach(user => {
        if (!newSelected.find(u => u.id === user.id)) {
          newSelected.push(user);
        }
      });
      setSelectedUsers(newSelected);
    }
  };
  
  const isAllPageSelected = paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.find(sel => sel.id === u.id));

  // Adapter for WhatsAppSender
  const getSelectedAsEmpresas = () => {
    return selectedUsers.map(u => ({
      id: u.id,
      nombre: u.name || u.email.split('@')[0],
      email: u.email,
      telefono: u.phone,
      rubro: u.role === 'admin' ? 'Admin' : 'Usuario',
      ciudad: 'N/A'
    }));
  };

  const handleClearFilters = () => {
    setSearchText('');
    setFilterRole('all');
  };

  const tableContainerRef = useRef(null);
  const handlePageChange = (p) => {
    setCurrentPage(p);
    if(tableContainerRef.current) tableContainerRef.current.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  return (
    <div className="unified-results-module" style={{padding: '2rem'}}>
      {/* Header Unificado */}
      <div className="results-unified-header">
        <div className="results-title-section">
          <h2>WhatsApp Marketing</h2>
        </div>
         {/* Tab Navigation */}
         <div className="view-toggle-inline" style={{marginLeft: 'auto', marginRight: 'auto'}}> 
            <button 
                className={activeTab === 'prospectos' ? 'active' : ''} 
                onClick={() => setActiveTab('prospectos')}
            >
                <FiUsers /> Prospectos
            </button>
            <button 
                className={activeTab === 'plantillas' ? 'active' : ''} 
                onClick={() => setActiveTab('plantillas')}
            >
                <FiLayout /> Plantillas
            </button>
         </div>
      </div>

      {activeTab === 'prospectos' ? (
        <>
           {/* Only show Filters and Table if in list mode */}
           {viewMode === 'list' && (
             <>
            {/* Inline Filters Bar */}
            <div className="filters-inline-bar">
                {/* Search */}
                <div className="filter-distance-group" style={{ flex: '0 1 400px', minWidth: '200px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                    <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, tel o email..."
                        className="filter-inline-input"
                        style={{ width: '100%', paddingLeft: '32px' }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                    </div>
                </div>

                {/* Role Filter */}
                <div className="custom-select-wrapper filter-item-rubro">
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="filter-inline-input"
                >
                    <option value="all">Plan: Todos</option>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="scale">Scale</option>
                </select>
                <svg className="select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
                </div>

                {(searchText || filterRole !== 'all') && (
                <button 
                    type="button" 
                    className="btn-clear-filters filter-item-clear"
                    onClick={handleClearFilters}
                    title="Limpiar filtros"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                )}
                {/* Action Button for Send */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="results-counts" style={{fontSize: '0.9rem', color: '#888', marginRight: '8px'}}>
                        <span className="count-filtered">{filteredUsers.length}</span> prospectos
                    </span>
                    <button 
                    type="button" 
                    className="btn-whatsapp"
                    onClick={() => setViewMode('compose')}
                    disabled={selectedUsers.length === 0}
                    style={{ 
                        height: '36px', 
                        padding: '0 20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        opacity: selectedUsers.length === 0 ? 0.6 : 1,
                        cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: selectedUsers.length > 0 ? '0 2px 4px rgba(37, 211, 102, 0.2)' : 'none',
                        transition: 'all 0.2s'
                    }}
                    >
                    <FiMessageCircle />
                    Enviar Mensaje
                    </button>
                </div>
            </div>

            {/* Table Content */}
            <div className="table-wrapper" ref={tableContainerRef}>
                {loading ? (
                <div style={{padding: '40px', textAlign: 'center'}}>
                    <div className="spinner"></div>
                    <p>Cargando usuarios...</p>
                </div>
                ) : filteredUsers.length === 0 ? (
                <div className="empty-state-inline">
                    <h3>No se encontraron usuarios con móvil</h3>
                    <p>O los filtros no coinciden con ningún usuario.</p>
                </div>
                ) : (
                <table className="properties-table">
                    <thead>
                    <tr>
                        <th style={{width: '40px', textAlign: 'center'}} onClick={toggleAllPage} className="th-check cursor-pointer">
                        {isAllPageSelected ? <FiCheckSquare color="#25D366"/> : <FiSquare />}
                        </th>
                        <th>Nombre</th>
                        <th>Teléfono</th>
                        <th>Email</th>
                    </tr>
                    </thead>
                    <tbody>
                    {paginatedUsers.map(user => {
                        const isSelected = selectedUsers.find(u => u.id === user.id);
                        return (
                        <tr key={user.id} onClick={() => toggleUser(user)} className={isSelected ? 'selected-row' : ''} style={{cursor: 'pointer', background: isSelected ? 'rgba(37, 211, 102, 0.05)' : ''}}>
                            <td style={{textAlign: 'center'}}>
                            {isSelected ? <FiCheckSquare color="#25D366"/> : <FiSquare color="#cbd5e1"/>}
                            </td>
                            <td className="name-cell">
                            <span style={{fontWeight: 500}}>{user.name || 'Sin nombre'}</span>
                            </td>
                            <td>
                            <span className="contact-badge phone" style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                                <FiMessageCircle size={12}/> {user.phone}
                            </span>
                            </td>
                            <td>
                            <span style={{color: '#666', fontSize: '0.9em'}}>{user.email}</span>
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                >
                    ← Anterior
                </button>
                <div className="pagination-info">Página {currentPage} de {totalPages}</div>
                <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                >
                    Siguiente →
                </button>
                </div>
            )}
            </>
          )}
        </>
      ) : (
        /* Templates Tab Content */
        <div style={{padding: '24px'}}>
            <TemplateManager type="whatsapp" embedded={true} />
        </div>
      )}

      {viewMode === 'compose' && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
             <button 
                onClick={() => setViewMode('list')}
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#666', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500
                }}
             >
                ← Volver a la lista
             </button>
          </div>
          <WhatsAppSender 
            empresas={getSelectedAsEmpresas()}
            onClose={() => setViewMode('list')}
            embedded={true}
          />
        </div>
      )}
    </div>
  );
}

export default AdminWhatsAppCenter;

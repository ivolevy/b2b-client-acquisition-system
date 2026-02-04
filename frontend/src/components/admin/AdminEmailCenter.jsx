import React, { useState, useEffect, useMemo, useRef } from 'react';
import { adminService } from '../../lib/supabase';
import EmailSender from '../EmailSender';
import TemplateManager from '../TemplateManager';
import { FiSearch, FiMail, FiCheckSquare, FiSquare, FiFilter, FiDownload, FiTrash2, FiUsers, FiLayout } from 'react-icons/fi';
import '../TableView.css'; // Reuse TableView styles
import './AdminUsers.css'; // Reuse Admin styles

function AdminEmailCenter() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('prospectos'); // prospectos | plantillas // <!-- Added activeTab state -->
  
  // Selection
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [itemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // ... (Load Users and Filter Logic remain the same) ...
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
      // Plan Filter
      if (filterPlan !== 'all' && user.plan !== filterPlan) return false;
      
      // Search Filter
      if (searchText) {
        const term = searchText.toLowerCase();
        const name = (user.name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        if (!name.includes(term) && !email.includes(term)) return false;
      }
      
      return true;
    });
  }, [users, filterPlan, searchText]);

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
      // Deselect all on this page
      setSelectedUsers(selectedUsers.filter(u => !allIdsOnPage.includes(u.id)));
    } else {
      // Select all on this page (adding unique ones)
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

  // Adapter for EmailSender
  const getSelectedAsEmpresas = () => {
    return selectedUsers.map(u => ({
      id: u.id,
      nombre: u.name || u.email.split('@')[0],
      email: u.email,
      telefono: u.phone,
      rubro: u.plan?.toUpperCase() || 'GRATIS',
      ciudad: 'N/A'
    }));
  };

  const handleClearFilters = () => {
    setSearchText('');
    setFilterPlan('all');
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
          <h2>Email Marketing</h2>
        </div>
         {/* Tab Navigation */}
         <div className="view-toggle-inline" style={{marginLeft: 'auto', marginRight: 'auto'}}> {/* Center tabs */}
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
        <> {/* Prospectos Content */}
            {/* Inline Filters Bar */}
            <div className="filters-inline-bar">
                {/* Search */}
                <div className="filter-distance-group" style={{ flex: '0 1 400px', minWidth: '200px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                    <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        className="filter-inline-input"
                        style={{ width: '100%', paddingLeft: '32px' }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                    </div>
                </div>

                {/* Plan Filter */}
                <div className="custom-select-wrapper filter-item-rubro">
                <select
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
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

                {(searchText || filterPlan !== 'all') && (
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
                     <span style={{fontSize: '0.9rem', color: '#888', marginRight: '8px'}}>
                        {selectedUsers.length} seleccionados
                     </span>
                     <button 
                        type="button" 
                        className="btn-primary"
                        onClick={() => setShowEmailModal(true)}
                        disabled={selectedUsers.length === 0}
                        style={{ height: '36px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                     >
                        <FiMail />
                        Enviar Campaña
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
                    <h3>No se encontraron usuarios</h3>
                    <p>Intenta ajustar los filtros de búsqueda.</p>
                </div>
                ) : (
                <table className="properties-table">
                    <thead>
                    <tr>
                        <th style={{width: '40px', textAlign: 'center'}} onClick={toggleAllPage} className="th-check cursor-pointer">
                        {isAllPageSelected ? <FiCheckSquare color="var(--primary)"/> : <FiSquare />}
                        </th>
                        <th>Nombre</th>
                        <th>Plan</th>
                        <th>Email</th>
                    </tr>
                    </thead>
                    <tbody>
                    {paginatedUsers.map(user => {
                        const isSelected = selectedUsers.find(u => u.id === user.id);
                        return (
                        <tr key={user.id} onClick={() => toggleUser(user)} className={isSelected ? 'selected-row' : ''} style={{cursor: 'pointer', background: isSelected ? 'rgba(59, 130, 246, 0.05)' : ''}}>
                            <td style={{textAlign: 'center'}}>
                            {isSelected ? <FiCheckSquare color="var(--primary)"/> : <FiSquare color="#cbd5e1"/>}
                            </td>
                             <td className="name-cell">
                            <span style={{fontWeight: 500}}>{user.name || 'Sin nombre'}</span>
                            </td>
                            <td>
                            <span className={`plan-badge plan-${user.plan || 'free'}`} style={{
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: user.plan === 'scale' ? '#fde68a' : user.plan === 'growth' ? '#bfdbfe' : user.plan === 'starter' ? '#bbf7d0' : '#f1f5f9',
                                color: user.plan === 'scale' ? '#92400e' : user.plan === 'growth' ? '#1e40af' : user.plan === 'starter' ? '#166534' : '#64748b'
                            }}>
                                {user.plan || 'free'}
                            </span>
                            </td>
                            <td>
                            <span style={{color: '#666'}}>{user.email}</span>
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
      ) : (  
        /* Templates Tab Content */
        <div style={{padding: '24px'}}>
            <TemplateManager type="email" embedded={true} />
        </div>
      )}

      {showEmailModal && (
        <EmailSender 
          empresas={getSelectedAsEmpresas()}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}

export default AdminEmailCenter;

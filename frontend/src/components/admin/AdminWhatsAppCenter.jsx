import React, { useState, useEffect, useMemo, useRef } from 'react';
import { adminService } from '../../lib/supabase';
import WhatsAppSender from '../WhatsAppSender';
import { FiSearch, FiMessageCircle, FiCheckSquare, FiSquare, FiFilter } from 'react-icons/fi';
import '../TableView.css'; // Reuse TableView styles
import './AdminUsers.css'; // Reuse Admin styles

function AdminWhatsAppCenter() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Selection
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Modals
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

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
      // Filter out users without phone numbers initially? Or handle in rendering?
      // Better to check for phone numbers if this is the "WhatsApp Center"
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
          <div className="results-counts">
            <span className="count-filtered">{filteredUsers.length}</span>
            <span className="count-label">usuarios con móvil</span>
          </div>

          <div className="header-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{fontSize: '0.9rem', color: '#888', marginRight: '8px'}}>
               {selectedUsers.length} seleccionados
            </span>
            <button 
              type="button" 
              className="btn-whatsapp"
              onClick={() => setShowWhatsAppModal(true)}
              disabled={selectedUsers.length === 0}
              style={{ 
                height: '36px', 
                padding: '0 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 500,
                opacity: selectedUsers.length === 0 ? 0.6 : 1,
                cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <FiMessageCircle />
              Enviar Mensaje
            </button>
          </div>
        </div>
      </div>

      {/* Inline Filters Bar */}
      <div className="filters-inline-bar">
        {/* Search */}
        <div className="filter-distance-group" style={{flex: 2, minWidth: '200px'}}>
             <div style={{position: 'relative', width: '100%'}}>
               <FiSearch style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666'}} />
               <input
                 type="text"
                 placeholder="Buscar por nombre, tel o email..."
                 className="filter-inline-input"
                 style={{width: '100%', paddingLeft: '32px'}}
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
            <option value="all">Rol: Todos</option>
            <option value="user">Usuario</option>
            <option value="admin">Admin</option>
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
                <th>Rol</th>
                <th>Email</th>
                <th style={{textAlign: 'center', width: '80px'}}>Acción</th>
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
                      <span className={`role-badge ${user.role}`}>{user.role}</span>
                    </td>
                     <td>
                      <span style={{color: '#666', fontSize: '0.9em'}}>{user.email}</span>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <button 
                        className="btn-icon-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUsers([user]);
                          setShowWhatsAppModal(true);
                        }}
                        title="Enviar WhatsApp Individual"
                        style={{color: '#25D366'}}
                      >
                        <FiMessageCircle />
                      </button>
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

      {showWhatsAppModal && (
        <WhatsAppSender 
          empresas={getSelectedAsEmpresas()}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
    </div>
  );
}

export default AdminWhatsAppCenter;

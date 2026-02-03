import React, { useState, useEffect } from 'react';
import { adminService } from '../../lib/supabase';
import EmailSender from '../EmailSender';
import WhatsAppSender from '../WhatsAppSender';
import { 
  FiSearch,
  FiMail,
  FiMessageCircle,
  FiCheckSquare,
  FiSquare,
  FiUsers,
  FiFilter
} from 'react-icons/fi';
import './AdminUsers.css'; // Reusing admin styles
import './AdminLayout.css';

function ContactCenter() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    hasPhone: false
  });
  
  // Selection state
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Modals state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Fetch all users
      const { data, error: usersError } = await adminService.getAllUsers();
      if (usersError) throw usersError;
      
      // Filter locally for now
      let filtered = data || [];
      
      if (filters.search) {
        const term = filters.search.toLowerCase();
        filtered = filtered.filter(u => 
          (u.email && u.email.toLowerCase().includes(term)) ||
          (u.name && u.name.toLowerCase().includes(term)) ||
          (u.phone && u.phone.includes(term))
        );
      }
      
      if (filters.role) {
        filtered = filtered.filter(u => u.role === filters.role);
      }
      
      if (filters.hasPhone) {
        filtered = filtered.filter(u => u.phone && u.phone.length > 5);
      }
      
      setUsers(filtered);
      
      // Clear selection if users list changed drastically? No, keep selection if possible.
      // But verify selected users still exist? 
      // For simplicity, just keep IDs.
      
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const toggleUser = (user) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const toggleAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers([...users]);
    }
  };

  // Adapter for EmailSender/WhatsAppSender
  // These components expect "empresas" with {id, email, nombre} or {id, telefono, nombre}
  const getSelectedAsEmpresas = () => {
    return selectedUsers.map(u => ({
      id: u.id,
      nombre: u.name || u.email.split('@')[0],
      email: u.email,
      telefono: u.phone,
      rubro: u.role === 'admin' ? 'Admin' : 'Usuario', // Metadata for template vars
      ciudad: 'N/A'
    }));
  };

  return (
    <div className="admin-users">
      <div className="admin-header">
        <h1 className="admin-title">Centro de Contacto</h1>
        <p className="admin-subtitle">Gestiona la comunicación con tus usuarios vía Email y WhatsApp.</p>
      </div>

      <div className="users-filters">
        <div className="filter-group" style={{flex: 2}}>
          <FiSearch className="filter-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            className="filter-input"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{paddingLeft: '32px'}}
          />
        </div>
        
        <div className="filter-group">
          <select
            className="filter-select"
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          >
            <option value="">Todos los roles</option>
            <option value="user">Usuario</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="checkbox-label" style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none'}}>
            <input 
              type="checkbox" 
              checked={filters.hasPhone}
              onChange={e => setFilters({...filters, hasPhone: e.target.checked})}
            />
            Solo con WhatsApp
          </label>
        </div>
      </div>

      <div className="admin-actions-bar" style={{
        margin: '16px 0', 
        padding: '12px', 
        background: 'rgba(255,255,255,0.03)', 
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div className="selection-stats">
          <span style={{fontWeight: 'bold', color: '#fff'}}>{selectedUsers.length}</span> usuarios seleccionados
        </div>
        <div className="action-buttons-group" style={{display: 'flex', gap: '12px'}}>
          <button 
            className="btn-primary" 
            style={{display: 'flex', alignItems: 'center', gap: '8px'}}
            onClick={() => setShowEmailModal(true)}
            disabled={selectedUsers.length === 0}
          >
            <FiMail /> Enviar Email
          </button>
          <button 
            className="btn-whatsapp" 
            style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: '#25D366',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 500,
              cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedUsers.length === 0 ? 0.5 : 1
            }}
            onClick={() => setShowWhatsAppModal(true)}
            disabled={selectedUsers.length === 0}
          >
            <FiMessageCircle /> Enviar WhatsApp
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th style={{width: '40px'}} onClick={toggleAll} className="th-check">
                  {users.length > 0 && selectedUsers.length === users.length ? <FiCheckSquare color="#3b82f6"/> : <FiSquare />}
                </th>
                <th>Usuario</th>
                <th>Contacto</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const isSelected = selectedUsers.find(u => u.id === user.id);
                return (
                  <tr key={user.id} className={isSelected ? 'row-selected' : ''} onClick={() => toggleUser(user)} style={{cursor: 'pointer'}}>
                    <td onClick={(e) => { e.stopPropagation(); toggleUser(user); }}>
                       {isSelected ? <FiCheckSquare color="#3b82f6"/> : <FiSquare color="#64748b"/>}
                    </td>
                    <td>
                      <div className="user-info-cell">
                        <span className="user-name">{user.name || 'Sin nombre'}</span>
                        <span className="user-email-sm">{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info-cell">
                        {user.email && <div className="contact-badge"><FiMail size={12}/> {user.email}</div>}
                        {user.phone ? (
                          <div className="contact-badge phone"><FiMessageCircle size={12}/> {user.phone}</div>
                        ) : (
                          <span className="no-phone">-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${user.role}`}>{user.role}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button 
                          className="btn-icon-action" 
                          title="Enviar Email"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUsers([user]);
                            setShowEmailModal(true);
                          }}
                        >
                          <FiMail />
                        </button>
                        {user.phone && (
                           <button 
                            className="btn-icon-action" 
                            title="Enviar WhatsApp"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUsers([user]);
                              setShowWhatsAppModal(true);
                            }}
                          >
                            <FiMessageCircle />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                   <td colSpan="5" className="no-data">No se encontraron usuarios</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showEmailModal && (
        <EmailSender 
          empresas={getSelectedAsEmpresas()} 
          onClose={() => setShowEmailModal(false)} 
        />
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

export default ContactCenter;

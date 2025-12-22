import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../lib/supabase';
import './AdminUsers.css';
import './AdminLayout.css';

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const loadUsers = useCallback(async (searchTerm = '') => {
    setLoading(true);
    setError('');
    
    try {
      const activeFilters = {};
      if (searchTerm && searchTerm.trim()) {
        activeFilters.search = searchTerm.trim();
      }
      
      const { data, error: usersError } = await adminService.getAllUsers(activeFilters);
      if (usersError) throw usersError;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(`Error al cargar usuarios: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar usuarios al montar
  useEffect(() => {
    loadUsers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce para búsqueda
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Si search está vacío, cargar todos los usuarios inmediatamente
    if (!search) {
      loadUsers('');
      return;
    }
    
    // Si hay búsqueda, esperar 300ms
    searchTimeoutRef.current = setTimeout(() => {
      loadUsers(search);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async () => {
    if (!selectedUser) return;
    
    setDeleteLoading(true);
    try {
      const { error: deleteError } = await adminService.deleteUser(selectedUser.id);
      if (deleteError) throw deleteError;
      
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Error al eliminar usuario: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };


  if (loading && users.length === 0) {
    return (
      <div className="admin-users">
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users">
      <div className="admin-header">
        <h1>Gestión de Usuarios</h1>
      </div>

      {/* Búsqueda */}
      <div className="users-filters">
        <input
          type="text"
          placeholder="Buscar por email o nombre..."
          className="filter-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={loadUsers}>Reintentar</button>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nombre</th>
              <th>Plan</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  {loading ? 'Cargando...' : 'No se encontraron usuarios'}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.name || '-'}</td>
                  <td>
                    <span className={`plan-badge ${user.plan}`}>
                      {user.plan === 'pro' ? 'PRO' : 'Free'}
                    </span>
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? 'Admin' : 'Usuario'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-action btn-view"
                        onClick={() => navigate(`/backoffice/users/${user.id}`)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteModal(true);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmar Eliminación</h2>
            <p>
              ¿Estás seguro de que quieres eliminar al usuario <strong>{selectedUser.email}</strong>?
            </p>
            <p className="warning-text">
              Esta acción es permanente y no se puede deshacer. Se eliminarán todos los datos del usuario.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminUsers;


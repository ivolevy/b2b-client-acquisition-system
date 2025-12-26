import React, { useState, useEffect, useRef } from 'react';
import { adminService } from '../../lib/supabase';
import UserDetailModal from './UserDetailModal';
import CreateUserModal from './CreateUserModal';
import './AdminUsers.css';
import './AdminLayout.css';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    plan: '',
    role: '',
    search: ''
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const loadUsers = async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    
    try {
      const activeFilters = {};
      if (filters.plan) activeFilters.plan = filters.plan;
      if (filters.role) activeFilters.role = filters.role;
      if (filters.search && filters.search.trim()) {
        activeFilters.search = filters.search.trim();
      }
      
      console.log('[AdminUsers] Loading users with filters:', activeFilters);
      // Si es refresh forzado, hacer una pequeña pausa para asegurar que la BD se actualizó
      if (forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      const { data, error: usersError } = await adminService.getAllUsers(activeFilters);
      
      if (usersError) {
        console.error('[AdminUsers] Error from getAllUsers:', usersError);
        throw usersError;
      }
      
      console.log('[AdminUsers] Loaded users:', data);
      setUsers(data || []);
    } catch (err) {
      console.error('[AdminUsers] Error loading users:', err);
      setError(`Error al cargar usuarios: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Cargar usuarios al montar y cuando cambien los filtros
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Si hay búsqueda, esperar 300ms
    if (filters.search) {
      searchTimeoutRef.current = setTimeout(() => {
        loadUsers();
      }, 300);
    } else {
      // Si no hay búsqueda, cargar inmediatamente
      loadUsers();
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.plan, filters.role, filters.search]);

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
      {/* Filtros y búsqueda */}
      <div className="users-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            className="filter-input"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <select
            className="filter-select"
            value={filters.plan}
            onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
          >
            <option value="">Todos los planes</option>
            <option value="free">Free</option>
            <option value="pro">PRO</option>
          </select>
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
      </div>

      <div className="users-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Crear Usuario
        </button>
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
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDetailModal(true);
                        }}
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

      {/* Modal de detalle de usuario */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          userId={selectedUser.id}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
          onUpdate={() => loadUsers(true)}
        />
      )}

      {/* Modal de creación de usuario */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadUsers(true);
          }}
        />
      )}

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


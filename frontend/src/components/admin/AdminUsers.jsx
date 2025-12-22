import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../lib/supabase';
import './AdminUsers.css';
import './AdminLayout.css';

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    plan: '',
    role: '',
    search: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error: usersError } = await adminService.getAllUsers(filters);
      if (usersError) throw usersError;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

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

  const handleExport = async (userId) => {
    try {
      const { data, error: exportError } = await adminService.exportUserData(userId);
      if (exportError) throw exportError;
      
      // Crear archivo JSON para descargar
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-${userId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting user data:', err);
      alert('Error al exportar datos: ' + err.message);
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
        <div className="admin-nav">
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin')}
          >
            Dashboard
          </button>
          <button 
            className="admin-nav-btn active"
            onClick={() => navigate('/admin/users')}
          >
            Usuarios
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/promo-codes')}
          >
            Códigos Promocionales
          </button>
        </div>
      </div>

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
              <th>Teléfono</th>
              <th>Plan</th>
              <th>Rol</th>
              <th>Registro</th>
              <th>Último Login</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  No se encontraron usuarios
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.name}</td>
                  <td>{user.phone || '-'}</td>
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
                    {user.created_at 
                      ? new Date(user.created_at).toLocaleDateString('es-ES')
                      : '-'
                    }
                  </td>
                  <td>
                    {user.last_login_at 
                      ? new Date(user.last_login_at).toLocaleDateString('es-ES')
                      : 'Nunca'
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-action btn-view"
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                        title="Ver detalles"
                      >
                        👁️
                      </button>
                      <button
                        className="btn-action btn-export"
                        onClick={() => handleExport(user.id)}
                        title="Exportar datos"
                      >
                        📥
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteModal(true);
                        }}
                        title="Eliminar"
                      >
                        🗑️
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

      {/* Modal de crear usuario */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Usuario</h2>
            <p className="info-text">
              Para crear usuarios, usa el panel de Supabase Auth o implementa una función edge.
              Por ahora, los usuarios se crean automáticamente al registrarse.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;


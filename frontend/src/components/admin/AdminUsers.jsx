import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../lib/supabase';
import './AdminUsers.css';

function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error: usersError } = await adminService.getAllUsers({});
      
      if (usersError) {
        console.error('Error:', usersError);
        setError('Error al cargar usuarios: ' + usersError.message);
        return;
      }
      
      console.log('Usuarios cargados:', data);
      setUsers(data || []);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-users">
      <div className="admin-header">
        <button onClick={() => navigate('/backoffice')} className="back-btn">
          ← Volver
        </button>
        <h1>Usuarios</h1>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      ) : (
        <div className="users-container">
          <div className="users-count">
            Total: {users.length} usuarios
          </div>
          
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Plan</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                      No hay usuarios
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.name || '-'}</td>
                      <td>
                        <span className={`badge badge-${user.plan}`}>
                          {user.plan?.toUpperCase() || 'FREE'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${user.role}`}>
                          {user.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;

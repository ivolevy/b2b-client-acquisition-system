import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../lib/supabase';
import './AdminUserDetail.css';
import './AdminLayout.css';

function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [editForm, setEditForm] = useState({
    email: '',
    name: '',
    phone: '',
    role: 'user'
  });

  useEffect(() => {
    loadUserData();
  }, [id]);

  const loadUserData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Cargar datos del usuario
      const { data: userData, error: userError } = await adminService.getUserById(id);
      if (userError) throw userError;
      setUser(userData);

      // Llenar formulario de edición
      if (userData) {
        setEditForm({
          email: userData.email || '',
          name: userData.name || '',
          phone: userData.phone || '',
          role: userData.role || 'user'
        });
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Error al cargar datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updates = {
        email: editForm.email,
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role
      };

      const { data, error: updateError } = await adminService.updateUser(id, updates);
      if (updateError) throw updateError;

      setSuccess('Usuario actualizado exitosamente');
      setTimeout(() => {
        loadUserData();
      }, 1000);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Error al actualizar usuario: ' + err.message);
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return (
      <div className="admin-user-detail">
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Cargando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-user-detail">
        <div className="admin-error">
          <p>Usuario no encontrado</p>
          <button onClick={() => navigate('/backoffice/users')}>Volver a usuarios</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-user-detail">
      <div className="admin-header">
        <div className="admin-header-content-wrapper">
          <button 
            className="admin-detail-back-btn"
            onClick={() => navigate('/backoffice/users')}
            title="Volver a usuarios"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>Detalle de Usuario</h1>
        </div>
        <div className="header-actions">
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <p>{success}</p>
        </div>
      )}

      {/* Formulario de Edición */}
        <div className="detail-content">
          <div className="form-section">
            <h2>Información Personal</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Plan y Rol</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="form-select"
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => loadUserData()}
            >
              Cancelar
            </button>
          </div>
        </div>
    </div>
  );
}

export default AdminUserDetail;


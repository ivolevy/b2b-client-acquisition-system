import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminService } from '../../lib/supabase';
import './UserDetailModal.css';

function UserDetailModal({ userId, onClose, onUpdate }) {
  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('edit');
  
  const [editForm, setEditForm] = useState({
    email: '',
    name: '',
    phone: '',
    plan: 'free',
    role: 'user',
    plan_expires_at: ''
  });

  useEffect(() => {
    loadUserData();
  }, [userId]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: userData, error: userError } = await adminService.getUserById(userId);
      if (userError) throw userError;
      setUser(userData);

      const { data: activityData } = await adminService.getUserActivity(userId);
      setActivity(activityData);

      if (userData) {
        setEditForm({
          email: userData.email || '',
          name: userData.name || '',
          phone: userData.phone || '',
          plan: userData.plan || 'free',
          role: userData.role || 'user',
          plan_expires_at: userData.plan_expires_at 
            ? new Date(userData.plan_expires_at).toISOString().split('T')[0]
            : ''
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
        plan: editForm.plan,
        role: editForm.role
      };

      if (editForm.plan === 'pro' && editForm.plan_expires_at) {
        updates.plan_expires_at = new Date(editForm.plan_expires_at).toISOString();
      } else if (editForm.plan === 'free') {
        updates.plan_expires_at = null;
      }

      const { error: updateError } = await adminService.updateUser(userId, updates);
      if (updateError) throw updateError;

      setSuccess('Usuario actualizado exitosamente');
      
      // Recargar datos del usuario actualizado
      await loadUserData();
      
      // Llamar al callback para actualizar la lista de usuarios
      if (onUpdate) {
        // Pequeño delay para asegurar que la BD se actualizó
        setTimeout(() => {
          onUpdate();
        }, 300);
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Error al actualizar usuario: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data, error: exportError } = await adminService.exportUserData(userId);
      if (exportError) throw exportError;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-${userId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess('Datos exportados exitosamente');
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Error al exportar datos: ' + err.message);
    }
  };

  const modalContent = loading ? (
    <div className="modal-overlay">
      <div className="user-detail-modal loading-modal">
        <div className="spinner"></div>
        <p>Cargando usuario...</p>
      </div>
    </div>
  ) : !user ? (
    <div className="modal-overlay">
      <div className="user-detail-modal error-modal">
        <p>Usuario no encontrado</p>
        <button onClick={onClose} className="btn-close">Cerrar</button>
      </div>
    </div>
  ) : (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-content">
            <h2>Detalle de Usuario</h2>
            <p className="modal-subtitle">{user.email}</p>
          </div>
          <button className="btn-close-icon" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="modal-alert alert-error">
            {error}
          </div>
        )}
        {success && (
          <div className="modal-alert alert-success">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            Editar
          </button>
          <button
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Actividad
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Tab: Editar */}
          {activeTab === 'edit' && (
            <div className="tab-content">
              <div className="form-section">
                <h3>Información Personal</h3>
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
                <h3>Plan y Rol</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Plan</label>
                    <select
                      value={editForm.plan}
                      onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                      className="form-select"
                    >
                      <option value="free">Free</option>
                      <option value="pro">PRO</option>
                    </select>
                  </div>
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
                  {editForm.plan === 'pro' && (
                    <div className="form-group">
                      <label>Expiración del Plan PRO</label>
                      <input
                        type="date"
                        value={editForm.plan_expires_at}
                        onChange={(e) => setEditForm({ ...editForm, plan_expires_at: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Actividad */}
          {activeTab === 'activity' && activity && (
            <div className="tab-content">
              <div className="activity-section">
                <h3>Búsquedas ({activity.searches?.length || 0})</h3>
                <div className="activity-list">
                  {activity.searches && activity.searches.length > 0 ? (
                    activity.searches.slice(0, 10).map((search) => (
                      <div key={search.id} className="activity-item">
                        <div className="activity-header">
                          <strong>{search.rubro}</strong>
                          <span className="activity-date">
                            {new Date(search.created_at).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <div className="activity-details">
                          {search.ubicacion_nombre && (
                            <span>📍 {search.ubicacion_nombre}</span>
                          )}
                          <span>🔍 {search.empresas_encontradas} empresas</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-data">No hay búsquedas registradas</p>
                  )}
                </div>
              </div>

              <div className="activity-section">
                <h3>Empresas Guardadas ({activity.companies?.length || 0})</h3>
                <div className="activity-list">
                  {activity.companies && activity.companies.length > 0 ? (
                    activity.companies.slice(0, 10).map((company) => (
                      <div key={company.id} className="activity-item">
                        <div className="activity-header">
                          <strong>{company.empresa_data?.nombre || 'Sin nombre'}</strong>
                          <span className="activity-date">
                            {new Date(company.created_at).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <div className="activity-details">
                          <span className={`status-pill ${company.estado}`}>
                            {company.estado}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-data">No hay empresas guardadas</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {activeTab === 'edit' && (
            <>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="btn-export" onClick={handleExport}>
                Exportar
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default UserDetailModal;


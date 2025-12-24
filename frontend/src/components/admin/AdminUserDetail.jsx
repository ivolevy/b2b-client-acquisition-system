import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../lib/supabase';
import './AdminUserDetail.css';
import './AdminLayout.css';

function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('edit'); // 'edit', 'activity', 'email'
  
  const [editForm, setEditForm] = useState({
    email: '',
    name: '',
    phone: '',
    plan: 'free',
    role: 'user',
    plan_expires_at: ''
  });

  const [emailForm, setEmailForm] = useState({
    subject: '',
    body: '',
    isHtml: false
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

      // Cargar actividad
      const { data: activityData, error: activityError } = await adminService.getUserActivity(id);
      if (activityError) throw activityError;
      setActivity(activityData);

      // Llenar formulario de edición
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

  const handleSendEmail = async () => {
    if (!emailForm.subject || !emailForm.body) {
      setError('El asunto y el cuerpo del email son requeridos');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data, error: emailError } = await adminService.sendEmailToUser(
        id,
        emailForm.subject,
        emailForm.body,
        emailForm.isHtml
      );
      if (emailError) throw emailError;

      setSuccess('Email enviado exitosamente (requiere configuración de servicio)');
      setEmailForm({ subject: '', body: '', isHtml: false });
    } catch (err) {
      console.error('Error sending email:', err);
      setError('Error al enviar email: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data, error: exportError } = await adminService.exportUserData(id);
      if (exportError) throw exportError;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-${id}-${new Date().toISOString().split('T')[0]}.json`;
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
          <button className="btn-secondary" onClick={handleExport}>
            📥 Exportar Datos
          </button>
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

      {/* Tabs */}
      <div className="detail-tabs">
        <button
          className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          ✏️ Editar
        </button>
        <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📊 Actividad
        </button>
        <button
          className={`tab-btn ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          ✉️ Enviar Email
        </button>
      </div>

      {/* Tab: Editar */}
      {activeTab === 'edit' && (
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
      )}

      {/* Tab: Actividad */}
      {activeTab === 'activity' && activity && (
        <div className="detail-content">
          <div className="activity-section">
            <h2>Búsquedas ({activity.searches?.length || 0})</h2>
            <div className="activity-list">
              {activity.searches && activity.searches.length > 0 ? (
                activity.searches.map((search) => (
                  <div key={search.id} className="activity-item">
                    <div className="activity-header">
                      <strong>{search.rubro}</strong>
                      <span className="activity-date">
                        {new Date(search.created_at).toLocaleString('es-ES')}
                      </span>
                    </div>
                    <div className="activity-details">
                      <span>Ubicación: {search.ubicacion_nombre || 'Personalizada'}</span>
                      <span>Empresas encontradas: {search.empresas_encontradas}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No hay búsquedas registradas</p>
              )}
            </div>
          </div>

          <div className="activity-section">
            <h2>Empresas Guardadas ({activity.companies?.length || 0})</h2>
            <div className="activity-list">
              {activity.companies && activity.companies.length > 0 ? (
                activity.companies.map((company) => (
                  <div key={company.id} className="activity-item">
                    <div className="activity-header">
                      <strong>{company.empresa_data?.nombre || 'Sin nombre'}</strong>
                      <span className="activity-date">
                        {new Date(company.created_at).toLocaleString('es-ES')}
                      </span>
                    </div>
                    <div className="activity-details">
                      <span>Estado: {company.estado}</span>
                      {company.notas && <span>Notas: {company.notas}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No hay empresas guardadas</p>
              )}
            </div>
          </div>

          <div className="activity-section">
            <h2>Suscripciones ({activity.subscriptions?.length || 0})</h2>
            <div className="activity-list">
              {activity.subscriptions && activity.subscriptions.length > 0 ? (
                activity.subscriptions.map((sub) => (
                  <div key={sub.id} className="activity-item">
                    <div className="activity-header">
                      <strong>Plan {sub.plan.toUpperCase()}</strong>
                      <span className={`status-badge ${sub.status}`}>
                        {sub.status}
                      </span>
                    </div>
                    <div className="activity-details">
                      <span>Inicio: {new Date(sub.starts_at).toLocaleDateString('es-ES')}</span>
                      <span>Expira: {new Date(sub.expires_at).toLocaleDateString('es-ES')}</span>
                      <span>Método: {sub.payment_method}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No hay suscripciones registradas</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Enviar Email */}
      {activeTab === 'email' && (
        <div className="detail-content">
          <div className="form-section">
            <h2>Enviar Email a {user.email}</h2>
            <div className="form-group">
              <label>Asunto</label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                className="form-input"
                placeholder="Asunto del email"
              />
            </div>
            <div className="form-group">
              <label>Mensaje</label>
              <textarea
                value={emailForm.body}
                onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                className="form-textarea"
                rows="10"
                placeholder="Cuerpo del email"
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={emailForm.isHtml}
                  onChange={(e) => setEmailForm({ ...emailForm, isHtml: e.target.checked })}
                />
                Formato HTML
              </label>
            </div>
            <div className="form-actions">
              <button
                className="btn-primary"
                onClick={handleSendEmail}
                disabled={saving || !emailForm.subject || !emailForm.body}
              >
                {saving ? 'Enviando...' : 'Enviar Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserDetail;


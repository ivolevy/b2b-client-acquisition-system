import React, { useState } from 'react';
import { adminService } from '../../lib/supabase';
import './CreateUserModal.css';

function CreateUserModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    plan: 'free',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error: createError } = await adminService.createUser(formData);
      if (createError) throw createError;

      setSuccess('Usuario creado exitosamente. El usuario debe confirmar su email.');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-user-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Crear Usuario</h2>
        
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input"
              required
              placeholder="usuario@email.com"
            />
          </div>

          <div className="form-group">
            <label>Contraseña *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="form-input"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className="form-group">
            <label>Nombre *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              required
              placeholder="Nombre completo"
            />
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="form-input"
              placeholder="+54 11 1234-5678"
            />
          </div>

          <div className="form-group">
            <label>Plan</label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              className="form-select"
            >
              <option value="free">Free</option>
              <option value="pro">PRO</option>
            </select>
          </div>

          <div className="form-group">
            <label>Rol</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="form-select"
            >
              <option value="user">Usuario</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !formData.email || !formData.password || !formData.name}
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUserModal;


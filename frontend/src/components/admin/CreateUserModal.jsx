import React, { useState } from 'react';
import { adminService } from '../../lib/supabase';
import './CreateUserModal.css';

import { createPortal } from 'react-dom';
// ... imports

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

  const validateForm = () => {
    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      throw new Error('El formato del email no es válido');
    }

    // Validate Phone (optional but if present must be valid)
    if (formData.phone) {
      if (formData.phone.length > 20) {
        throw new Error('El número de teléfono es demasiado largo (máx 20 caracteres)');
      }
      const phoneRegex = /^[+]?[\d\s-]*$/;
      if (!phoneRegex.test(formData.phone)) {
        throw new Error('El teléfono solo puede contener números, espacios, guiones y +');
      }
    }

    // Validate Name
    if (formData.name.length < 2) {
      throw new Error('El nombre es muy corto');
    }
    if (formData.name.length > 100) {
      throw new Error('El nombre es demasiado largo');
    }
    
    // Validate Password
    if (formData.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      validateForm();
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

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-user-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Crear Usuario</h2>
          <button className="btn-close-icon" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Main Content (Scrollable) */}
          <div className="modal-body">
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
            </div>
          </div>

          {/* Footer (Fixed at bottom) */}
          <div className="modal-footer">
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

  return createPortal(modalContent, document.body);
}

export default CreateUserModal;


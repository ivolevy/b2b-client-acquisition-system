import React, { useState } from 'react';
import { adminService } from '../../lib/supabase';
import './CreateUserModal.css';

import { createPortal } from 'react-dom';
// ... imports

function CreateUserModal({ onClose, onSuccess }) {
  // ... state

  // ... handleSubmit logic ...

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


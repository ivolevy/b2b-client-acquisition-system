import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../lib/supabase';
import './AdminPromoCodes.css';
import './AdminLayout.css';

function AdminPromoCodes() {
  const navigate = useNavigate();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [newCode, setNewCode] = useState({
    code: '',
    plan: 'pro',
    duration_days: 30,
    max_uses: '',
    expires_at: '',
    is_active: true
  });

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error: codesError } = await adminService.getAllPromoCodes();
      if (codesError) throw codesError;
      setCodes(data || []);
    } catch (err) {
      console.error('Error loading promo codes:', err);
      setError('Error al cargar códigos promocionales');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCode.code.trim()) {
      setError('El código es requerido');
      return;
    }

    setError('');
    try {
      const codeData = {
        ...newCode,
        max_uses: newCode.max_uses ? parseInt(newCode.max_uses) : null,
        expires_at: newCode.expires_at || null
      };

      const { data, error: createError } = await adminService.createPromoCode(codeData);
      if (createError) throw createError;

      setShowCreateModal(false);
      setNewCode({
        code: '',
        plan: 'pro',
        duration_days: 30,
        max_uses: '',
        expires_at: '',
        is_active: true
      });
      loadCodes();
    } catch (err) {
      console.error('Error creating promo code:', err);
      setError('Error al crear código: ' + err.message);
    }
  };

  const handleToggleActive = async (codeId, currentStatus) => {
    try {
      const { error: updateError } = await adminService.updatePromoCode(codeId, {
        is_active: !currentStatus
      });
      if (updateError) throw updateError;
      loadCodes();
    } catch (err) {
      console.error('Error updating promo code:', err);
      setError('Error al actualizar código: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedCode) return;
    
    setDeleteLoading(true);
    try {
      const { error: deleteError } = await adminService.deletePromoCode(selectedCode.id);
      if (deleteError) throw deleteError;
      
      setShowDeleteModal(false);
      setSelectedCode(null);
      loadCodes();
    } catch (err) {
      console.error('Error deleting promo code:', err);
      setError('Error al eliminar código: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && codes.length === 0) {
    return (
      <div className="admin-promo-codes">
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>Cargando códigos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-promo-codes">
      <div className="admin-header">
        <h1>Gestión de Códigos Promocionales</h1>
        <div className="admin-nav">
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/backoffice')}
          >
            Dashboard
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/backoffice/users')}
          >
            Usuarios
          </button>
          <button 
            className="admin-nav-btn active"
            onClick={() => navigate('/backoffice/promo-codes')}
          >
            Códigos Promocionales
          </button>
        </div>
      </div>

      <div className="codes-header">
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Crear Código
        </button>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={() => setError('')}>Cerrar</button>
        </div>
      )}

      {/* Lista de códigos */}
      <div className="codes-list">
        {codes.length === 0 ? (
          <div className="no-data">
            <p>No hay códigos promocionales creados</p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              Crear primer código
            </button>
          </div>
        ) : (
          codes.map((code) => (
            <div key={code.id} className={`code-card ${!code.is_active ? 'inactive' : ''}`}>
              <div className="code-header">
                <div className="code-info">
                  <h3 className="code-name">{code.code}</h3>
                  <span className={`code-status ${code.is_active ? 'active' : 'inactive'}`}>
                    {code.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="code-actions">
                  <button
                    className={`btn-toggle ${code.is_active ? 'active' : ''}`}
                    onClick={() => handleToggleActive(code.id, code.is_active)}
                    title={code.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {code.is_active ? '✓' : '✗'}
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => {
                      setSelectedCode(code);
                      setShowDeleteModal(true);
                    }}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="code-details">
                <div className="detail-item">
                  <span className="detail-label">Plan:</span>
                  <span className={`plan-badge ${code.plan}`}>
                    {code.plan === 'pro' ? 'PRO' : 'Free'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Duración:</span>
                  <span>{code.duration_days} días</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Usos:</span>
                  <span>
                    {code.used_count} / {code.max_uses || '∞'}
                  </span>
                </div>
                {code.expires_at && (
                  <div className="detail-item">
                    <span className="detail-label">Expira:</span>
                    <span>
                      {new Date(code.expires_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">Creado:</span>
                  <span>
                    {new Date(code.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
              {code.promo_code_uses && code.promo_code_uses.length > 0 && (
                <div className="code-uses">
                  <h4>Usos recientes:</h4>
                  <div className="uses-list">
                    {code.promo_code_uses.slice(0, 5).map((use) => (
                      <div key={use.id} className="use-item">
                        <span>{use.users?.email || 'Usuario desconocido'}</span>
                        <span className="use-date">
                          {new Date(use.used_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    ))}
                    {code.promo_code_uses.length > 5 && (
                      <p className="more-uses">
                        +{code.promo_code_uses.length - 5} usos más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de crear código */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Código Promocional</h2>
            <div className="form-group">
              <label>Código *</label>
              <input
                type="text"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                className="form-input"
                placeholder="PRO2024"
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label>Plan</label>
              <select
                value={newCode.plan}
                onChange={(e) => setNewCode({ ...newCode, plan: e.target.value })}
                className="form-select"
              >
                <option value="free">Free</option>
                <option value="pro">PRO</option>
              </select>
            </div>
            <div className="form-group">
              <label>Duración (días) *</label>
              <input
                type="number"
                value={newCode.duration_days}
                onChange={(e) => setNewCode({ ...newCode, duration_days: parseInt(e.target.value) || 30 })}
                className="form-input"
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Límite de usos (dejar vacío para ilimitado)</label>
              <input
                type="number"
                value={newCode.max_uses}
                onChange={(e) => setNewCode({ ...newCode, max_uses: e.target.value })}
                className="form-input"
                min="1"
                placeholder="Ilimitado"
              />
            </div>
            <div className="form-group">
              <label>Fecha de expiración del código (opcional)</label>
              <input
                type="date"
                value={newCode.expires_at}
                onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={newCode.is_active}
                  onChange={(e) => setNewCode({ ...newCode, is_active: e.target.checked })}
                />
                Activo
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCode({
                    code: '',
                    plan: 'pro',
                    duration_days: 30,
                    max_uses: '',
                    expires_at: '',
                    is_active: true
                  });
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!newCode.code.trim()}
              >
                Crear Código
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && selectedCode && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmar Eliminación</h2>
            <p>
              ¿Estás seguro de que quieres eliminar el código <strong>{selectedCode.code}</strong>?
            </p>
            <p className="warning-text">
              Esta acción es permanente. Se eliminará el código y su historial de usos.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCode(null);
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

export default AdminPromoCodes;


import React, { useState, useEffect, useRef } from 'react';
import { adminService } from '../../lib/supabase';
import './AdminPromoCodes.css';
import './AdminLayout.css';

function AdminPromoCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    plan: '',
    search: '',
    expiration: '',
    usage: ''
  });
  const searchTimeoutRef = useRef(null);

  const [newCode, setNewCode] = useState({
    code: '',
    plan: 'pro',
    duration_days: 30,
    max_uses: '',
    expires_at: '',
    is_active: true
  });

  const loadCodes = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error: codesError } = await adminService.getAllPromoCodes();
      if (codesError) throw codesError;
      
      // Aplicar filtros en el frontend
      let filteredCodes = data || [];
      
      const now = new Date();
      
      // Filtro por estado (activo/inactivo)
      if (filters.status === 'active') {
        filteredCodes = filteredCodes.filter(code => code.is_active);
      } else if (filters.status === 'inactive') {
        filteredCodes = filteredCodes.filter(code => !code.is_active);
      }
      
      // Filtro por expiración
      if (filters.expiration === 'expired') {
        // Códigos expirados (tienen expires_at y ya pasó la fecha)
        filteredCodes = filteredCodes.filter(code => 
          code.expires_at && new Date(code.expires_at) < now
        );
      } else if (filters.expiration === 'expiring_soon') {
        // Códigos que expiran en los próximos 7 días
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        filteredCodes = filteredCodes.filter(code => 
          code.expires_at && 
          new Date(code.expires_at) >= now && 
          new Date(code.expires_at) <= weekFromNow
        );
      } else if (filters.expiration === 'no_expiration') {
        // Códigos sin fecha de expiración
        filteredCodes = filteredCodes.filter(code => !code.expires_at);
      } else if (filters.expiration === 'not_expired') {
        // Códigos que no han expirado (tienen fecha futura o no tienen fecha)
        filteredCodes = filteredCodes.filter(code => 
          !code.expires_at || new Date(code.expires_at) >= now
        );
      }
      
      // Ordenamiento por fecha de vencimiento
      if (filters.expiration === 'sort_soonest') {
        // Ordenar: más pronto a más tarde (los sin fecha al final)
        filteredCodes.sort((a, b) => {
          if (!a.expires_at && !b.expires_at) return 0;
          if (!a.expires_at) return 1;
          if (!b.expires_at) return -1;
          return new Date(a.expires_at) - new Date(b.expires_at);
        });
      } else if (filters.expiration === 'sort_latest') {
        // Ordenar: más tarde a más pronto (los sin fecha al final)
        filteredCodes.sort((a, b) => {
          if (!a.expires_at && !b.expires_at) return 0;
          if (!a.expires_at) return 1;
          if (!b.expires_at) return -1;
          return new Date(b.expires_at) - new Date(a.expires_at);
        });
      } else if (!filters.expiration) {
        // Por defecto, ordenar por fecha de vencimiento (más pronto primero)
        filteredCodes.sort((a, b) => {
          if (!a.expires_at && !b.expires_at) return 0;
          if (!a.expires_at) return 1;
          if (!b.expires_at) return -1;
          return new Date(a.expires_at) - new Date(b.expires_at);
        });
      }
      
      // Filtro por usos
      if (filters.usage === 'exhausted') {
        // Códigos agotados (alcanzaron el límite de usos)
        filteredCodes = filteredCodes.filter(code => 
          code.max_uses && code.used_count >= code.max_uses
        );
      } else if (filters.usage === 'available') {
        // Códigos con usos disponibles
        filteredCodes = filteredCodes.filter(code => 
          !code.max_uses || code.used_count < code.max_uses
        );
      } else if (filters.usage === 'unlimited') {
        // Códigos ilimitados (sin max_uses)
        filteredCodes = filteredCodes.filter(code => !code.max_uses);
      } else if (filters.usage === 'limited') {
        // Códigos con límite de usos
        filteredCodes = filteredCodes.filter(code => code.max_uses);
      }
      
      // Filtro por plan
      if (filters.plan) {
        filteredCodes = filteredCodes.filter(code => code.plan === filters.plan);
      }
      
      // Filtro por búsqueda
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.trim().toLowerCase();
        filteredCodes = filteredCodes.filter(code =>
          code.code.toLowerCase().includes(searchTerm)
        );
      }
      
      setCodes(filteredCodes);
    } catch (err) {
      console.error('Error loading promo codes:', err);
      setError('Error al cargar códigos promocionales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (filters.search) {
      searchTimeoutRef.current = setTimeout(() => {
        loadCodes();
      }, 300);
    } else {
      loadCodes();
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.plan, filters.search, filters.expiration, filters.usage]);

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
      setCodes(codes.map(code => 
        code.id === codeId ? { ...code, is_active: !currentStatus } : code
      ));
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
      {/* Filtros y búsqueda */}
      <div className="codes-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Buscar por código..."
            className="filter-input"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <select
            className="filter-select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        <div className="filter-group">
          <select
            className="filter-select"
            value={filters.expiration}
            onChange={(e) => setFilters({ ...filters, expiration: e.target.value })}
          >
            <option value="">Ordenar: Más pronto primero</option>
            <option value="sort_soonest">Ordenar: Más pronto primero</option>
            <option value="sort_latest">Ordenar: Más tarde primero</option>
            <option value="expired">Solo expirados</option>
            <option value="expiring_soon">Expiran pronto (7 días)</option>
            <option value="not_expired">Solo no expirados</option>
            <option value="no_expiration">Solo sin fecha</option>
          </select>
        </div>
        <div className="filter-group">
          <select
            className="filter-select"
            value={filters.usage}
            onChange={(e) => setFilters({ ...filters, usage: e.target.value })}
          >
            <option value="">Todos los usos</option>
            <option value="available">Con usos disponibles</option>
            <option value="exhausted">Agotados</option>
            <option value="unlimited">Ilimitados</option>
            <option value="limited">Con límite</option>
          </select>
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
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Crear Código
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button onClick={() => setError('')}>Cerrar</button>
        </div>
      )}

      {/* Tabla de códigos */}
      <div className="codes-table-container">
        <table className="codes-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Plan</th>
              <th>Duración</th>
              <th>Usos</th>
              <th>Estado</th>
              <th>Expira</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  {loading ? 'Cargando...' : 'No se encontraron códigos'}
                </td>
              </tr>
            ) : (
              codes.map((code) => (
                <tr key={code.id}>
                  <td className="code-name">{code.code}</td>
                  <td>
                    <span className={`plan-badge ${code.plan}`}>
                      {code.plan === 'pro' ? 'PRO' : 'Free'}
                    </span>
                  </td>
                  <td>{code.duration_days} días</td>
                  <td>{code.used_count} / {code.max_uses || '∞'}</td>
                  <td>
                    <span className={`status-badge ${code.is_active ? 'active' : 'inactive'}`}>
                      {code.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {code.expires_at
                      ? new Date(code.expires_at).toLocaleDateString('es-ES')
                      : '-'}
                  </td>
                  <td className="actions-cell">
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
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

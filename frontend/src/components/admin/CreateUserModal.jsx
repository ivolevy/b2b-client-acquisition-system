import React, { useState } from 'react';
import { adminService } from '../../lib/supabase';
import './CreateUserModal.css';

import { createPortal } from 'react-dom';
// ... imports

function CreateUserModal({ onClose, onSuccess }) {

// Lista de países con prefijos telefónicos
const COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', prefix: '+54' },
  { code: 'MX', name: 'México', flag: '🇲🇽', prefix: '+52' },
  { code: 'ES', name: 'España', flag: '🇪🇸', prefix: '+34' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', prefix: '+57' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', prefix: '+56' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', prefix: '+51' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', prefix: '+58' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', prefix: '+593' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', prefix: '+502' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺', prefix: '+53' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', prefix: '+591' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', prefix: '+1' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', prefix: '+504' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', prefix: '+595' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', prefix: '+503' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', prefix: '+505' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', prefix: '+506' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', prefix: '+507' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', prefix: '+598' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', prefix: '+1' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', prefix: '+55' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷', prefix: '+33' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪', prefix: '+49' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', prefix: '+39' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', prefix: '+44' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦', prefix: '+1' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', prefix: '+61' },
  { code: 'NZ', name: 'Nueva Zelanda', flag: '🇳🇿', prefix: '+64' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵', prefix: '+81' },
  { code: 'CN', name: 'China', flag: '🇨🇳', prefix: '+86' },
  { code: 'IN', name: 'India', flag: '🇮🇳', prefix: '+91' },
  { code: 'RU', name: 'Rusia', flag: '🇷🇺', prefix: '+7' },
  { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷', prefix: '+82' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', prefix: '+351' },
  { code: 'NL', name: 'Países Bajos', flag: '🇳🇱', prefix: '+31' },
  { code: 'BE', name: 'Bélgica', flag: '🇧🇪', prefix: '+32' },
  { code: 'CH', name: 'Suiza', flag: '🇨🇭', prefix: '+41' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', prefix: '+43' },
  { code: 'SE', name: 'Suecia', flag: '🇸🇪', prefix: '+46' },
  { code: 'NO', name: 'Noruega', flag: '🇳🇴', prefix: '+47' },
  { code: 'DK', name: 'Dinamarca', flag: '🇩🇰', prefix: '+45' },
  { code: 'FI', name: 'Finlandia', flag: '🇫🇮', prefix: '+358' },
  { code: 'PL', name: 'Polonia', flag: '🇵🇱', prefix: '+48' },
  { code: 'GR', name: 'Grecia', flag: '🇬🇷', prefix: '+30' },
  { code: 'TR', name: 'Turquía', flag: '🇹🇷', prefix: '+90' },
  { code: 'SA', name: 'Arabia Saudí', flag: '🇸🇦', prefix: '+966' },
  { code: 'AE', name: 'Emiratos Árabes', flag: '🇦🇪', prefix: '+971' },
  { code: 'ZA', name: 'Sudáfrica', flag: '🇿🇦', prefix: '+27' },
  { code: 'EG', name: 'Egipto', flag: '🇪🇬', prefix: '+20' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', prefix: '+972' },
  { code: 'SG', name: 'Singapur', flag: '🇸🇬', prefix: '+65' },
  { code: 'MY', name: 'Malasia', flag: '🇲🇾', prefix: '+60' },
  { code: 'TH', name: 'Tailandia', flag: '🇹🇭', prefix: '+66' },
  { code: 'PH', name: 'Filipinas', flag: '🇵🇭', prefix: '+63' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', prefix: '+62' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', prefix: '+84' },
];

function CreateUserModal({ onClose, onSuccess }) {

  useEffect(() => {
    console.log('CreateUserModal mounted. Countries loaded:', COUNTRIES.length);
  }, []);

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
  
  // Phone components state
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Argentina default
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Validations matched to Login.jsx
  const validateEmail = (email) => {
    if (!email || email.trim() === '') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) throw new Error('El formato del email no es válido');
    if (email.length > 255) throw new Error('El email es demasiado largo');
    return true;
  };

  const validateName = (name) => {
    if (!name || name.trim() === '') throw new Error('El nombre es requerido');
    const trimmedName = name.trim();
    if (trimmedName.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres');
    if (trimmedName.length > 20) throw new Error('El nombre es demasiado largo (máximo 20 caracteres)');
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
    if (!nameRegex.test(trimmedName)) throw new Error('El nombre solo puede contener letras, espacios y guiones');
    return true;
  };

  const validatePhone = (phone) => {
    if (!phone) return true; // Optional
    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length > 0) {
      if (cleanPhone.length < 8) throw new Error('El número debe tener al menos 8 dígitos');
      if (cleanPhone.length > 12) throw new Error('El número es demasiado largo (máx 12 dígitos)');
    }
    return true;
  };

  const validatePassword = (password) => {
    if (!password || password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
    if (!/[a-zA-Z]/.test(password)) throw new Error('Al menos una letra');
    if (!/\d/.test(password)) throw new Error('Al menos un número');
    return true;
  };

  const validateForm = () => {
    validateEmail(formData.email);
    validatePhone(formData.phone);
    validateName(formData.name);
    validatePassword(formData.password);
  };
  
  // Filter countries
  const filteredCountries = COUNTRIES.filter(country => 
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.prefix.includes(countrySearch) ||
    country.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      validateForm();
      // Combine prefix and phone for submission
      const fullPhone = formData.phone ? `${selectedCountry.prefix}${formData.phone}` : '';
      const submissionData = { ...formData, phone: fullPhone };
      
      const { data, error: createError } = await adminService.createUser(submissionData);
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
                minLength={8}
                placeholder="Mínimo 8 caracteres, letra y número"
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
              <div className="input-wrapper phone-country-selector">
                <div className="country-selector-wrapper">
                  <button
                    type="button"
                    className="country-selector-button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    disabled={loading}
                  >
                    <span className="country-flag">{selectedCountry.flag}</span>
                    <span className="country-prefix">{selectedCountry.prefix}</span>
                    <span className="dropdown-arrow">▼</span>
                  </button>
                  {showCountryDropdown && (
                    <div className="country-dropdown">
                      <div className="country-dropdown-search">
                        <input
                          type="text"
                          placeholder="Buscar país..."
                          className="country-search-input"
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="country-list">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              className={`country-option ${selectedCountry.code === country.code ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedCountry(country);
                                setShowCountryDropdown(false);
                                setCountrySearch('');
                              }}
                            >
                              <span className="country-flag">{country.flag}</span>
                              <span className="country-name">{country.name}</span>
                              <span className="country-prefix">{country.prefix}</span>
                            </button>
                          ))
                        ) : (
                          <div className="country-no-results">No se encontraron países</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d]/g, '');
                    setFormData({ ...formData, phone: val });
                  }}
                  className="form-input phone-input-field"
                  placeholder="1112345678"
                  maxLength={12}
                />
              </div>
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

  // Render using Portal
  return createPortal(modalContent, document.body);
}

export default CreateUserModal;


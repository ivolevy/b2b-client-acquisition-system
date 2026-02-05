import React, { useState, useEffect } from 'react';
import { adminService } from '../../lib/supabase';
import EmailSender from '../EmailSender';
import '../TableView.css'; 
import './AdminUsers.css'; 

function AdminEmailCenter() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load Users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error: usersError } = await adminService.getAllUsers();
      if (usersError) throw usersError;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Transform user data for EmailSender
  const getAllAsEmpresas = () => {
    return users.map(u => ({
      id: u.id,
      nombre: u.name || u.email.split('@')[0],
      email: u.email,
      telefono: u.phone,
      rubro: u.plan?.toUpperCase() || 'GRATIS',
      ciudad: 'N/A'
    })).filter(u => u.email && u.email.includes('@'));
  };

  if (loading) {
      return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="unified-results-module" style={{padding: '24px', height: '100%'}}>
      <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>Email Marketing</h2>
          <p style={{ color: '#6b7280', marginTop: '4px' }}>Gestioná tus campañas y envíos de Correo.</p>
      </div>

      <div style={{ height: 'calc(100vh - 180px)', background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <EmailSender 
          empresas={getAllAsEmpresas()}
          onClose={() => {}} 
          embedded={true}
        />
      </div>
    </div>
  );
}

export default AdminEmailCenter;

import React, { useState, useEffect } from 'react';
import { adminService } from '../../lib/supabase';
import WhatsAppSender from '../WhatsAppSender';
// import TemplateManager from '../TemplateManager'; // Handled inside WhatsAppSender
import { FiUsers, FiLayout } from 'react-icons/fi'; // Might not need these if removing tabs
import '../TableView.css'; 
import './AdminUsers.css'; 

function AdminWhatsAppCenter() {
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

  // Transform all users to empresas format directly, passing all to WhatsAppSender
  // WhatsAppSender will handle the selection/display
  const getAllAsEmpresas = () => {
    return users.map(u => ({
      id: u.id,
      nombre: u.name || u.email.split('@')[0],
      email: u.email,
      telefono: u.phone,
      rubro: u.role === 'admin' ? 'Admin' : 'Usuario',
      ciudad: 'N/A'
    })).filter(u => u.telefono && u.telefono.length > 5); // Basic filter before passing
  };

  if (loading) {
      return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="unified-results-module" style={{padding: '24px', height: '100%'}}>
      {/* 
          We removed the internal tabs (Prospectos/Plantillas) because WhatsAppSender 
          has its own internal tabs and we want the "Sender" view to be the primary view.
      */}
      <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>WhatsApp Marketing</h2>
          <p style={{ color: '#6b7280', marginTop: '4px' }}>Gestioná tus campañas y envíos de WhatsApp.</p>
      </div>

      <div style={{ height: 'calc(100vh - 180px)', background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <WhatsAppSender 
          empresas={getAllAsEmpresas()}
          onClose={() => {}} // No close action needed for embedded main view
          embedded={true}
        />
      </div>
    </div>
  );
}

export default AdminWhatsAppCenter;

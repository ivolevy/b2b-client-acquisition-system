import api from './api';

export const leadsService = {
  getRubros: async () => {
    const res = await api.get('/api/rubros');
    return res.data;
  },
  
  getEmpresas: async () => {
    const res = await api.get('/api/empresas');
    return res.data;
  },
  
  exportLeads: async (data) => {
    const isBlob = data.formato === 'pdf';
    const config = isBlob ? { responseType: 'blob' } : {};
    
    // Note: App_B2B used /exportar but backend is /api/exportar
    const res = await api.post('/api/exportar', data, config);
    return res.data;
  },
  
  updateStatus: async (id, estado, notas) => {
    const res = await api.put('/api/empresa/estado', { id, estado, notas });
    return res.data;
  },
  
  updateNotes: async (id, notas) => {
    const res = await api.put('/api/empresa/notas', { id, notas });
    return res.data;
  }
};

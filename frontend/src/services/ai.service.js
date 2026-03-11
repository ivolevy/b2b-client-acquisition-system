import api from './api';

export const aiService = {
  transcribeAudio: async (formData) => {
    const res = await api.post('/api/ai/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  }
};

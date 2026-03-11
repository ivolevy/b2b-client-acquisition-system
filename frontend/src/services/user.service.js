import api from './api';

export const userService = {
  getCredits: async (userId) => {
    const res = await api.get(`/api/users/${userId}/credits?_t=${Date.now()}`);
    return res.data;
  }
};

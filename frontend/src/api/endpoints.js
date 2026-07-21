import api from './axios';

export const login   = (data)   => api.post('/api/auth/login', data);
export const signup  = (data)   => api.post('/api/auth/signup', data);

export const getActiveRides = ()               => api.get('/api/rides/active');
export const getMyOffers    = ()               => api.get('/api/rides/my-offers');
export const createOffer    = (data)           => api.post('/api/rides/offer', data);
export const editOffer      = (offerId, data)  => api.put(`/api/rides/offer/${offerId}`, data);
export const deleteOffer    = (offerId)        => api.delete(`/api/rides/offer/${offerId}`);
export const toggleOffer    = (offerId)        => api.put(`/api/rides/offer/${offerId}/toggle`);
export const joinRide        = (offerId, data)  => api.post(`/api/rides/join/${offerId}`, data);
export const getRequests     = (offerId)        => api.get(`/api/rides/offer/${offerId}/requests`);
export const updateRequest   = (requestId, status) =>
  api.put(`/api/rides/request/${requestId}/status`, null, { params: { status } });

export const getPublicConfig = (domain)       => api.get(`/api/public/config/domain`, { params: { name: domain } });
export const getAllConfigs   = ()             => api.get('/api/admin/config');
export const saveConfig      = (data)         => api.post('/api/admin/config', data);
export const uploadLogo      = (domain, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/api/admin/config/${domain}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getAllUsers      = ()      => api.get('/api/admin/whitelist');
export const toggleUserStatus = (email) => api.put(`/api/admin/whitelist/${email}/toggle`);

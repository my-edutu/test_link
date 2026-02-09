import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const setAuthToken = (token: string) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const adminApi = {
    // User Moderation
    getUsers: () => api.get('/admin/users'),
    warnUser: (userId: string, reason: string) => api.post(`/admin/users/${userId}/warn`, { reason }),
    banUser: (userId: string, reason: string) => api.post(`/admin/users/${userId}/ban`, { reason }),

    // Financial
    getPendingPayouts: () => api.get('/admin/payouts/pending'),
    processPayout: (id: string, details: any) => api.post(`/admin/payouts/${id}/process`, details),
    completePayout: (id: string, reference: string) => api.post(`/admin/payouts/${id}/complete`, { reference }),

    // Content Moderation
    getFlaggedContent: () => api.get('/moderation/flagged'),
    resolveReport: (reportId: string, action: 'approve' | 'reject') =>
        api.post(`/moderation/reports/${reportId}/resolve`, { action }),
};

export default api;

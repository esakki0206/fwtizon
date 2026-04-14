import axios from 'axios';

/**
 * Admin Analytics service — wraps all /api/admin/analytics/* endpoints.
 * Returns parsed data payload from structured API responses.
 */

/**
 * Fetch enhanced dashboard analytics with period comparisons.
 * @returns {Promise<Object>} Dashboard analytics data
 */
export const getAnalytics = async () => {
  const res = await axios.get('/api/admin/analytics');
  return res.data.data;
};

/**
 * Fetch advanced analytics with date range filtering.
 * @param {Object} params - { from?: string, to?: string } ISO date strings
 * @returns {Promise<Object>} Advanced analytics data
 */
export const getAdvancedAnalytics = async ({ from, to } = {}) => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const query = params.toString();
  const res = await axios.get(`/api/admin/analytics/advanced${query ? `?${query}` : ''}`);
  return res.data.data;
};

/**
 * Fetch admin activity feed with pagination.
 * @param {Object} params - { page?: number, limit?: number }
 * @returns {Promise<Object>} { data, total, page, totalPages }
 */
export const getActivityFeed = async ({ page = 1, limit = 20 } = {}) => {
  const res = await axios.get(`/api/admin/activity-feed?page=${page}&limit=${limit}`);
  return res.data;
};

/**
 * Fetch admin-level notifications.
 * @returns {Promise<Object>} { data, unreadCount }
 */
export const getAdminNotifications = async () => {
  const res = await axios.get('/api/admin/admin-notifications');
  return res.data;
};

/**
 * Mark a notification as read.
 * @param {string} id - Notification ID
 * @returns {Promise<Object>}
 */
export const markNotificationRead = async (id) => {
  const res = await axios.patch(`/api/admin/admin-notifications/${id}/read`);
  return res.data;
};

/**
 * Export analytics data as CSV file download.
 * @param {Object} params - { type: 'users'|'enrollments'|'revenue', from?: string, to?: string }
 */
export const exportData = async ({ type = 'users', from, to } = {}) => {
  const params = new URLSearchParams({ type });
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const res = await axios.get(`/api/admin/analytics/export?${params.toString()}`, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${type}-export-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default {
  getAnalytics,
  getAdvancedAnalytics,
  getActivityFeed,
  getAdminNotifications,
  markNotificationRead,
  exportData,
};

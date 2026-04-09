import axios from 'axios';

/**
 * Admin Students service — wraps every /api/admin/students/* endpoint.
 *
 * All methods return the parsed `data` payload from the structured API
 * response so callers don't have to keep destructuring `res.data.data`.
 */

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, value);
  });
  const str = search.toString();
  return str ? `?${str}` : '';
};

export const studentService = {
  list: async ({ page = 1, limit = 10, search = '', status = '', role = '', sortBy = 'createdAt', sortOrder = 'desc' } = {}) => {
    const res = await axios.get(`/api/admin/students${buildQuery({ page, limit, search, status, role, sortBy, sortOrder })}`);
    return res.data; // { success, data, total, page, totalPages, ... }
  },

  get: async (id) => {
    const res = await axios.get(`/api/admin/students/${id}`);
    return res.data.data;
  },

  update: async (id, payload) => {
    const res = await axios.put(`/api/admin/students/${id}`, payload);
    return res.data.data;
  },

  remove: async (id) => {
    const res = await axios.delete(`/api/admin/students/${id}`);
    return res.data;
  },

  toggleSuspend: async (id) => {
    const res = await axios.patch(`/api/admin/students/${id}/suspend`);
    return res.data.data; // { _id, status }
  },

  resetPassword: async (id) => {
    const res = await axios.post(`/api/admin/students/${id}/reset-password`);
    return res.data.data; // { tempPassword }
  },

  exportCsv: async () => {
    const res = await axios.get('/api/admin/students/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `students-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default studentService;

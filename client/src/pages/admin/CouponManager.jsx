import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiTag,
  FiCheck, FiToggleLeft, FiToggleRight, FiRefreshCw,
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:    { label: 'Active',    bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400' },
  inactive:  { label: 'Inactive',  bg: 'bg-gray-100 dark:bg-gray-800',       text: 'text-gray-600 dark:text-gray-400' },
  expired:   { label: 'Expired',   bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400' },
  scheduled: { label: 'Scheduled', bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400' },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const toInputDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  // Format for datetime-local input: YYYY-MM-DDTHH:mm
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

// ── Default form state ────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  code: '',
  description: '',
  discountPercentage: '',
  isActive: true,
  startDate: '',
  expiryDate: '',
  usageLimit: '',
  minimumPrice: '',
  applicableCourses: [],
};

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

// ── Coupon Form Modal ─────────────────────────────────────────────────────────
const CouponModal = ({ isOpen, onClose, initialData, courses, onSaved }) => {
  const isEdit = Boolean(initialData?._id);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          code: initialData.code || '',
          description: initialData.description || '',
          discountPercentage: String(initialData.discountPercentage || ''),
          isActive: initialData.isActive !== undefined ? initialData.isActive : true,
          startDate: toInputDate(initialData.startDate),
          expiryDate: toInputDate(initialData.expiryDate),
          usageLimit: initialData.usageLimit != null ? String(initialData.usageLimit) : '',
          minimumPrice: initialData.minimumPrice != null ? String(initialData.minimumPrice) : '',
          applicableCourses: initialData.applicableCourses?.map((c) =>
            typeof c === 'object' ? c._id : c
          ) || [],
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = () => {
    const errs = {};
    if (!form.code.trim()) errs.code = 'Code is required';
    else if (!/^[A-Z0-9_-]{3,20}$/i.test(form.code.trim())) errs.code = 'Must be 3–20 chars (A-Z, 0-9, _, -)';

    const pct = Number(form.discountPercentage);
    if (!form.discountPercentage) errs.discountPercentage = 'Required';
    else if (isNaN(pct) || pct < 1 || pct > 100) errs.discountPercentage = 'Must be 1–100';

    if (!form.expiryDate) errs.expiryDate = 'Expiry date is required';
    else if (new Date(form.expiryDate) <= new Date()) errs.expiryDate = 'Must be in the future';

    if (form.startDate && form.expiryDate && new Date(form.startDate) >= new Date(form.expiryDate)) {
      errs.startDate = 'Start date must be before expiry';
    }
    if (form.usageLimit && (isNaN(Number(form.usageLimit)) || Number(form.usageLimit) < 1)) {
      errs.usageLimit = 'Must be a positive integer';
    }
    if (form.minimumPrice && (isNaN(Number(form.minimumPrice)) || Number(form.minimumPrice) < 0)) {
      errs.minimumPrice = 'Must be zero or greater';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discountPercentage: Number(form.discountPercentage),
        isActive: form.isActive,
        startDate: form.startDate || null,
        expiryDate: form.expiryDate,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        minimumPrice: form.minimumPrice ? Number(form.minimumPrice) : null,
        applicableCourses: form.applicableCourses,
      };

      if (isEdit) {
        await axios.put(`/api/admin/coupons/${initialData._id}`, payload);
        toast.success('Coupon updated');
      } else {
        await axios.post('/api/admin/coupons', payload);
        toast.success('Coupon created');
      }

      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (err) =>
    `w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
      err ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'
    }`;

  const toggleCourse = (id) =>
    setForm((f) => ({
      ...f,
      applicableCourses: f.applicableCourses.includes(id)
        ? f.applicableCourses.filter((c) => c !== id)
        : [...f.applicableCourses, id],
    }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 z-10"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Coupon' : 'Create Coupon'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Code + Discount */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Coupon Code *" error={errors.code}>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SAVE20"
                className={inputCls(errors.code)}
                maxLength={20}
              />
            </Field>
            <Field label="Discount Percentage *" error={errors.discountPercentage}>
              <div className="relative">
                <input
                  type="number"
                  value={form.discountPercentage}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercentage: e.target.value }))}
                  placeholder="20"
                  min={1}
                  max={100}
                  className={inputCls(errors.discountPercentage) + ' pr-8'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </Field>
          </div>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description for internal reference"
              rows={2}
              className={inputCls()}
            />
          </Field>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date (optional)" error={errors.startDate}>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className={inputCls(errors.startDate)}
              />
            </Field>
            <Field label="Expiry Date *" error={errors.expiryDate}>
              <input
                type="datetime-local"
                value={form.expiryDate}
                onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                className={inputCls(errors.expiryDate)}
              />
            </Field>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Usage Limit (optional)" error={errors.usageLimit}>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                placeholder="Unlimited"
                min={1}
                className={inputCls(errors.usageLimit)}
              />
            </Field>
            <Field label="Minimum Course Price (₹)" error={errors.minimumPrice}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  value={form.minimumPrice}
                  onChange={(e) => setForm((f) => ({ ...f, minimumPrice: e.target.value }))}
                  placeholder="No minimum"
                  min={0}
                  className={inputCls(errors.minimumPrice) + ' pl-7'}
                />
              </div>
            </Field>
          </div>

          {/* Active toggle */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                form.isActive ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                  form.isActive ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {form.isActive ? 'Active — coupon is usable' : 'Inactive — coupon is disabled'}
            </span>
          </div>

          {/* Course-specific mapping */}
          {courses.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Applicable Courses{' '}
                <span className="font-normal text-gray-400">(leave empty for global)</span>
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-44 overflow-y-auto space-y-1">
                {courses.map((c) => {
                  const selected = form.applicableCourses.includes(c._id);
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => toggleCourse(c._id)}
                      className={`w-full flex items-center text-left px-3 py-2 rounded-lg text-sm transition ${
                        selected
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border mr-3 flex items-center justify-center flex-shrink-0 ${
                        selected
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selected && <FiCheck size={10} className="text-white" />}
                      </span>
                      <span className="truncate">{c.title}</span>
                    </button>
                  );
                })}
              </div>
              {form.applicableCourses.length > 0 && (
                <p className="text-xs text-primary-600 mt-1">
                  {form.applicableCourses.length} course{form.applicableCourses.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[120px]">
              {saving ? (
                <span className="flex items-center">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving…
                </span>
              ) : isEdit ? 'Update Coupon' : 'Create Coupon'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm = ({ coupon, onCancel, onConfirm, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 z-10"
    >
      <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
        <FiTrash2 className="text-red-600 dark:text-red-400" size={22} />
      </div>
      <h3 className="text-center text-lg font-bold text-gray-900 dark:text-white mb-1">Delete Coupon</h3>
      <p className="text-center text-sm text-gray-500 mb-5">
        Are you sure you want to delete coupon{' '}
        <span className="font-mono font-bold text-gray-900 dark:text-white">{coupon.code}</span>?
        This cannot be undone.
      </p>
      <div className="flex space-x-3">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </motion.div>
  </div>
);

// ── Main CouponManager ────────────────────────────────────────────────────────
const CouponManager = () => {
  const [coupons, setCoupons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deletingCoupon, setDeletingCoupon] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggling, setToggling] = useState(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await axios.get('/api/admin/coupons', { params });
      setCoupons(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const fetchCourses = useCallback(async () => {
    try {
      const [coursesRes, liveCoursesRes] = await Promise.all([
        axios.get('/api/admin/courses', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
        axios.get('/api/admin/live-courses', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } }))
      ]);
      const regularCourses = (coursesRes.data?.data || []).map(c => ({ ...c, title: c.title + ' (Course)' }));
      const liveCourses = (liveCoursesRes.data?.data || []).map(c => ({ ...c, title: c.title + ' (Live)' }));
      setCourses([...regularCourses, ...liveCourses]);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);
  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchCoupons(); }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const handleToggle = async (coupon) => {
    setToggling(coupon._id);
    try {
      const res = await axios.patch(`/api/admin/coupons/${coupon._id}/toggle`);
      const updated = res.data.data;
      setCoupons((prev) => prev.map((c) => c._id === coupon._id ? { ...c, isActive: updated.isActive } : c));
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle coupon');
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingCoupon) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`/api/admin/coupons/${deletingCoupon._id}`);
      toast.success('Coupon deleted');
      setDeletingCoupon(null);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete coupon');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openCreate = () => { setEditingCoupon(null); setModalOpen(true); };
  const openEdit = (c) => { setEditingCoupon(c); setModalOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FiTag className="text-primary-500" size={22} />
            Coupon Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} coupon{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCoupons}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            title="Refresh"
          >
            <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <FiPlus size={16} /> New Coupon
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coupon code…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX size={14} />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-20 text-center">
            <FiTag size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">No coupons found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first coupon to get started</p>
            <Button onClick={openCreate} className="mt-4">
              <FiPlus size={15} className="mr-2" /> Create Coupon
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {['Code', 'Discount', 'Status', 'Usage', 'Expiry', 'Scope', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {coupons.map((coupon) => (
                    <tr key={coupon._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                            {coupon.code}
                          </span>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{coupon.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-primary-600 dark:text-primary-400 text-base">
                          {coupon.discountPercentage}%
                        </span>
                        {coupon.minimumPrice != null && (
                          <p className="text-xs text-gray-400">Min ₹{coupon.minimumPrice}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={coupon.effectiveStatus} />
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{coupon.usedCount}</span>
                        {coupon.usageLimit != null && (
                          <span className="text-gray-400"> / {coupon.usageLimit}</span>
                        )}
                        {coupon.usageLimit == null && <span className="text-gray-400"> / ∞</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {coupon.startDate && (
                          <div className="text-gray-400">
                            From: {fmtDate(coupon.startDate)}
                          </div>
                        )}
                        <div className={coupon.isExpired ? 'text-red-500 font-semibold' : ''}>
                          {fmtDate(coupon.expiryDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {coupon.applicableCourses?.length > 0 ? (
                          <span className="text-primary-600 dark:text-primary-400">
                            {coupon.applicableCourses.length} course{coupon.applicableCourses.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400 font-medium">Global</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Toggle */}
                          <button
                            onClick={() => handleToggle(coupon)}
                            disabled={toggling === coupon._id}
                            title={coupon.isActive ? 'Deactivate' : 'Activate'}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500"
                          >
                            {coupon.isActive
                              ? <FiToggleRight size={18} className="text-green-500" />
                              : <FiToggleLeft size={18} className="text-gray-400" />}
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(coupon)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-blue-500"
                            title="Edit"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDeletingCoupon(coupon)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-500"
                            title="Delete"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {coupons.map((coupon) => (
                <div key={coupon._id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-sm">
                        {coupon.code}
                      </span>
                      {coupon.description && (
                        <p className="text-xs text-gray-400 mt-1">{coupon.description}</p>
                      )}
                    </div>
                    <StatusBadge status={coupon.effectiveStatus} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400 mb-0.5">Discount</p>
                      <p className="font-bold text-primary-600">{coupon.discountPercentage}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Usage</p>
                      <p className="font-medium">{coupon.usedCount}/{coupon.usageLimit ?? '∞'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Expires</p>
                      <p className={`font-medium ${coupon.isExpired ? 'text-red-500' : ''}`}>
                        {fmtDate(coupon.expiryDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(coupon)} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg">
                      {coupon.isActive ? <FiToggleRight className="text-green-500" /> : <FiToggleLeft className="text-gray-400" />}
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => openEdit(coupon)} className="flex items-center gap-1 text-xs text-blue-600 px-2 py-1 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <FiEdit2 size={12} /> Edit
                    </button>
                    <button onClick={() => setDeletingCoupon(coupon)} className="flex items-center gap-1 text-xs text-red-600 px-2 py-1 border border-red-200 dark:border-red-800 rounded-lg">
                      <FiTrash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modalOpen && (
          <CouponModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            initialData={editingCoupon}
            courses={courses}
            onSaved={fetchCoupons}
          />
        )}
        {deletingCoupon && (
          <DeleteConfirm
            coupon={deletingCoupon}
            onCancel={() => setDeletingCoupon(null)}
            onConfirm={handleDelete}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CouponManager;

import { useState, useEffect, useCallback } from 'react';
import {
  FiPlus, FiTrash2, FiEdit2, FiX, FiCheck,
  FiFileText, FiFilter, FiRefreshCw, FiAlertTriangle,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { formatINRFull } from './FinancialSummaryCards';
import { cn } from '../../../lib/utils';
import axios from 'axios';

// ─── Constants ────────────────────────────────────────────────────────────────
const RP_METHODS  = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'NEFT', 'RTGS', 'Other'];
const RP_STATUSES = ['pending', 'paid'];
const OTHER_CATS  = [
  { value: 'marketing',     label: 'Marketing & Ads'        },
  { value: 'venue',         label: 'Venue & Facilities'     },
  { value: 'software_tools',label: 'Software & Tools'       },
  { value: 'certificates',  label: 'Certificates'           },
  { value: 'travel',        label: 'Travel'                 },
  { value: 'food',          label: 'Food & Beverage'        },
  { value: 'printing',      label: 'Printing'               },
  { value: 'miscellaneous', label: 'Miscellaneous'          },
];

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────
const ConfirmDeleteModal = ({ open, onCancel, onConfirm, busy }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6"
          initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <FiAlertTriangle size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Delete Expense</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {busy ? <span className="animate-spin rounded-full w-3.5 h-3.5 border-b-2 border-white" /> : <FiTrash2 size={13} />}
              Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── ResourcePersonModal ──────────────────────────────────────────────────────
const ResourcePersonModal = ({ open, onClose, onSaved, courses, editData }) => {
  const isEdit = !!editData;
  const blank  = { courseId: '', courseType: 'self-paced', resourcePersonName: '', amount: '', paymentDate: '', paymentMethod: '', status: 'pending', notes: '' };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEdit && editData) {
        const cId = editData.course?._id || editData.liveCourse?._id || '';
        setForm({
          courseId:            cId,
          courseType:          editData.courseType,
          resourcePersonName:  editData.resourcePersonName || '',
          amount:              String(editData.amount ?? ''),
          paymentDate:         editData.paymentDate ? editData.paymentDate.split('T')[0] : '',
          paymentMethod:       editData.paymentMethod || '',
          status:              editData.status || 'pending',
          notes:               editData.notes || '',
        });
      } else {
        setForm(blank);
      }
    }
  }, [open, editData]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.courseId)                   return toast.error('Please select a course');
    if (!form.resourcePersonName.trim())  return toast.error('Resource person name is required');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Valid amount is required');
    if (!form.paymentDate)                return toast.error('Payment date is required');

    setBusy(true);
    try {
      const payload = {
        courseId:           form.courseId,
        courseType:         form.courseType,
        resourcePersonName: form.resourcePersonName.trim(),
        amount:             Number(form.amount),
        paymentDate:        form.paymentDate,
        paymentMethod:      form.paymentMethod,
        status:             form.status,
        notes:              form.notes,
      };
      if (isEdit) {
        await axios.put(`/api/admin/expenses/resource-person/${editData._id}`, payload);
        toast.success('Expense updated');
      } else {
        await axios.post('/api/admin/expenses/resource-person', payload);
        toast.success('Expense added');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                {isEdit ? 'Edit Resource Person Expense' : 'Add Resource Person Expense'}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <FiX size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Course selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Course *</label>
                <select
                  value={form.courseId}
                  onChange={(e) => {
                    const selected = courses.find((c) => String(c._id) === e.target.value);
                    set('courseId',   e.target.value);
                    set('courseType', selected?.courseType || 'self-paced');
                  }}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                >
                  <option value="">Select a course…</option>
                  {courses.map((c) => (
                    <option key={String(c._id)} value={String(c._id)}>
                      [{c.courseType === 'live' ? 'LIVE' : 'SP'}] {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource person name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Resource Person Name *</label>
                <input
                  type="text"
                  value={form.resourcePersonName}
                  onChange={(e) => set('resourcePersonName', e.target.value)}
                  placeholder="e.g. Dr. Priya Sharma"
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>

              {/* Amount + Date row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    value={form.amount}
                    onChange={(e) => set('amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Payment Date *</label>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) => set('paymentDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Method + Status row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => set('paymentMethod', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                  >
                    <option value="">Select…</option>
                    {RP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status *</label>
                  <select
                    value={form.status}
                    onChange={(e) => set('status', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                  >
                    {RP_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Optional notes or context…"
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={busy}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-primary-500/20"
              >
                {busy ? <span className="animate-spin rounded-full w-3.5 h-3.5 border-b-2 border-white" /> : <FiCheck size={14} />}
                {isEdit ? 'Save Changes' : 'Add Expense'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── OtherExpenseModal ────────────────────────────────────────────────────────
const OtherExpenseModal = ({ open, onClose, onSaved, courses, editData }) => {
  const isEdit = !!editData;
  const blank  = { courseId: '', courseType: 'self-paced', title: '', category: '', amount: '', date: '', notes: '' };
  const [form,   setForm]   = useState(blank);
  const [file,   setFile]   = useState(null);
  const [busy,   setBusy]   = useState(false);

  useEffect(() => {
    if (open) {
      if (isEdit && editData) {
        const cId = editData.course?._id || editData.liveCourse?._id || '';
        setForm({
          courseId:   cId,
          courseType: editData.courseType,
          title:      editData.title      || '',
          category:   editData.category   || '',
          amount:     String(editData.amount ?? ''),
          date:       editData.date ? editData.date.split('T')[0] : '',
          notes:      editData.notes      || '',
        });
        setFile(null);
      } else {
        setForm(blank);
        setFile(null);
      }
    }
  }, [open, editData]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.courseId)              return toast.error('Please select a course');
    if (!form.title.trim())          return toast.error('Expense title is required');
    if (!form.category)              return toast.error('Please select a category');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Valid amount is required');
    if (!form.date)                  return toast.error('Date is required');

    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('receipt', file);

      if (isEdit) {
        await axios.put(`/api/admin/expenses/other/${editData._id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Expense updated');
      } else {
        await axios.post('/api/admin/expenses/other', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Expense added');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                {isEdit ? 'Edit Expense' : 'Add Other Expense'}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <FiX size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Course */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Course *</label>
                <select
                  value={form.courseId}
                  onChange={(e) => {
                    const selected = courses.find((c) => String(c._id) === e.target.value);
                    set('courseId',   e.target.value);
                    set('courseType', selected?.courseType || 'self-paced');
                  }}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                >
                  <option value="">Select a course…</option>
                  {courses.map((c) => (
                    <option key={String(c._id)} value={String(c._id)}>
                      [{c.courseType === 'live' ? 'LIVE' : 'SP'}] {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Expense Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="e.g. Facebook Ads"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                  >
                    <option value="">Select…</option>
                    {OTHER_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    value={form.amount}
                    onChange={(e) => set('amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Optional notes…"
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                />
              </div>

              {/* Receipt upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Receipt (optional)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setFile(e.target.files[0] || null)}
                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-400 cursor-pointer"
                  />
                  {isEdit && editData?.receiptUrl && !file && (
                    <a href={editData.receiptUrl} target="_blank" rel="noreferrer" className="mt-1 text-xs text-primary-600 hover:underline flex items-center gap-1">
                      <FiFileText size={11} /> View existing receipt
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={busy}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-primary-500/20"
              >
                {busy ? <span className="animate-spin rounded-full w-3.5 h-3.5 border-b-2 border-white" /> : <FiCheck size={14} />}
                {isEdit ? 'Save Changes' : 'Add Expense'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Main ExpenseManager component ───────────────────────────────────────────
const ExpenseManager = () => {
  const [activeTab,  setActiveTab]  = useState('resource_person');
  const [expenses,   setExpenses]   = useState([]);
  const [courses,    setCourses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterType, setFilterType] = useState('all');

  // Modal state
  const [rpOpen,    setRpOpen]    = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [editData,  setEditData]  = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [delBusy,   setDelBusy]   = useState(false);

  // Load course list once
  useEffect(() => {
    axios.get('/api/admin/financial/courses-list')
      .then((res) => setCourses(res.data.data || []))
      .catch(() => {});
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'resource_person'
        ? '/api/admin/expenses/resource-person'
        : '/api/admin/expenses/other';
      const res = await axios.get(endpoint);
      setExpenses(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const openAdd  = () => { setEditData(null); activeTab === 'resource_person' ? setRpOpen(true) : setOtherOpen(true); };
  const openEdit = (exp) => { setEditData(exp); activeTab === 'resource_person' ? setRpOpen(true) : setOtherOpen(true); };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDelBusy(true);
    try {
      const endpoint = activeTab === 'resource_person'
        ? `/api/admin/expenses/resource-person/${delTarget}`
        : `/api/admin/expenses/other/${delTarget}`;
      await axios.delete(endpoint);
      toast.success('Expense deleted');
      setDelTarget(null);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setDelBusy(false);
    }
  };

  const filtered = expenses.filter((e) => filterType === 'all' || e.courseType === filterType);

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <>
      {/* Modals */}
      <ResourcePersonModal
        open={rpOpen && activeTab === 'resource_person'}
        onClose={() => { setRpOpen(false); setEditData(null); }}
        onSaved={fetchExpenses}
        courses={courses}
        editData={editData}
      />
      <OtherExpenseModal
        open={otherOpen && activeTab === 'other'}
        onClose={() => { setOtherOpen(false); setEditData(null); }}
        onSaved={fetchExpenses}
        courses={courses}
        editData={editData}
      />
      <ConfirmDeleteModal
        open={!!delTarget}
        onCancel={() => setDelTarget(null)}
        onConfirm={handleDelete}
        busy={delBusy}
      />

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {[['resource_person', 'Resource Persons'], ['other', 'Other Expenses']].map(([tab, lbl]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  activeTab === tab
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">All Types</option>
              <option value="live">Live</option>
              <option value="self-paced">Self-Paced</option>
            </select>
            <button
              onClick={fetchExpenses}
              disabled={loading}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-primary-500/20"
            >
              <FiPlus size={13} />
              Add Expense
            </button>
          </div>
        </div>

        {/* Summary strip */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-2.5 bg-gray-50/70 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              Total: {formatINRFull(totalFiltered)}
            </span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto min-h-[280px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              <span className="text-sm">Loading expenses…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <FiFilter size={28} className="text-gray-300 dark:text-gray-700" />
              <p className="text-sm">No expenses recorded yet.</p>
              <button
                onClick={openAdd}
                className="mt-1 text-xs font-semibold text-primary-600 hover:underline"
              >
                Add the first one →
              </button>
            </div>
          ) : activeTab === 'resource_person' ? (
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Resource Person</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {filtered.map((exp) => (
                  <tr key={exp._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {exp.paymentDate ? new Date(exp.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">
                        {exp.course?.title || exp.liveCourse?.title || '—'}
                      </p>
                      <span className={cn(
                        'text-[9px] font-bold uppercase',
                        exp.courseType === 'live' ? 'text-purple-500' : 'text-sky-500'
                      )}>
                        {exp.courseType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {exp.resourcePersonName}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {formatINRFull(exp.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{exp.paymentMethod || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                        exp.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )}>
                        {exp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(exp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDelTarget(exp._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {filtered.map((exp) => {
                  const cat = OTHER_CATS.find((c) => c.value === exp.category);
                  return (
                    <tr key={exp._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">
                          {exp.course?.title || exp.liveCourse?.title || '—'}
                        </p>
                        <span className={cn(
                          'text-[9px] font-bold uppercase',
                          exp.courseType === 'live' ? 'text-purple-500' : 'text-sky-500'
                        )}>
                          {exp.courseType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{exp.title}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold uppercase">
                          {cat?.label || exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatINRFull(exp.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {exp.receiptUrl ? (
                          <a href={exp.receiptUrl} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                            <FiFileText size={11} /> View
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(exp)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDelTarget(exp._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default ExpenseManager;

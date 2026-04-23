import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckCircle, FiXCircle, FiDownload, FiEye,
  FiFileText, FiCreditCard, FiRefreshCw, FiSearch,
  FiAlertCircle,
} from 'react-icons/fi';

// ─── Authenticated PDF download (sends Bearer token via axios) ────────────────
const downloadPdf = async (receiptId, type = 'download') => {
  const toastId = toast.loading('Preparing PDF…');
  try {
    const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const url = `${backendBase}/api/receipts/${receiptId}/${type}`;
    const response = await axios.get(url, {
      responseType: 'blob',
      withCredentials: true,
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    if (type === 'download') {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${receiptId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    toast.success(type === 'download' ? 'Download started!' : 'Opened in new tab!', { id: toastId });
  } catch (err) {
    console.error('PDF error:', err);
    toast.error(
      err.response?.status === 404
        ? 'Receipt PDF not found.'
        : err.response?.status === 403
        ? 'Access denied.'
        : 'Failed to load PDF. Try again.',
      { id: toastId }
    );
  }
};

// ─── Badge ────────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const ok = status === 'success' || status === 'active' || status === 'completed' || status === 'SUCCESS';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
      ok
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {ok ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}
      {String(status).toUpperCase()}
    </span>
  );
};

// ─── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-100 dark:border-gray-800">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
      </td>
    ))}
  </tr>
);

// ─── Search bar ───────────────────────────────────────────────────────────────
const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative flex-1 min-w-0 max-w-sm">
    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400"
    />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PaymentManager = () => {
  const [activeTab, setActiveTab] = useState('payments');

  // Payments tab
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState(null);
  const [paymentSearch, setPaymentSearch] = useState('');

  // Receipts tab
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState(null);
  const [receiptSearch, setReceiptSearch] = useState('');

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const res = await axios.get('/api/admin/enrollments');
      const formatted = (res.data.data || []).map((en) => ({
        id: en.paymentId || `mock_${en._id?.slice(-6)}`,
        studentName: en.fullName || en.user?.name || 'Unknown',
        email: en.email || en.user?.email || '—',
        course: en.liveCourse?.title || en.course?.title || 'Unknown Course',
        amount: en.amount ?? 0,
        status: en.status === 'active' || en.status === 'completed' ? 'success' : en.status,
        date: en.createdAt,
      }));
      setPayments(formatted);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load payments';
      setPaymentsError(msg);
      toast.error(msg);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const fetchReceipts = useCallback(async () => {
    setReceiptsLoading(true);
    setReceiptsError(null);
    try {
      const res = await axios.get('/api/admin/receipts');
      setReceipts(res.data.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load receipts';
      setReceiptsError(msg);
      toast.error(msg);
    } finally {
      setReceiptsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    if (activeTab === 'receipts' && receipts.length === 0 && !receiptsLoading && !receiptsError) {
      fetchReceipts();
    }
  }, [activeTab, receipts.length, receiptsLoading, receiptsError, fetchReceipts]);

  // Filtered lists
  const filteredPayments = payments.filter((p) => {
    const q = paymentSearch.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      p.studentName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.course.toLowerCase().includes(q)
    );
  });

  const filteredReceipts = receipts.filter((r) => {
    const q = receiptSearch.toLowerCase();
    return (
      (r.receiptId || '').toLowerCase().includes(q) ||
      (r.userName || '').toLowerCase().includes(q) ||
      (r.userEmail || '').toLowerCase().includes(q) ||
      (r.courseName || '').toLowerCase().includes(q) ||
      (r.user?.name || '').toLowerCase().includes(q) ||
      (r.user?.email || '').toLowerCase().includes(q)
    );
  });

  const tabs = [
    { key: 'payments', label: 'Payments', Icon: FiCreditCard },
    { key: 'receipts', label: 'Receipts', Icon: FiFileText },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          Payment Operations &amp; Receipts
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track Razorpay transactions and download official payment receipts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative flex items-center gap-2 pb-3 px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === key
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={14} />
            {label}
            {activeTab === key && (
              <motion.div
                layoutId="admin-payment-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'payments' ? (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <TableCard
              title={`All Transactions (${filteredPayments.length})`}
              searchBar={
                <SearchBar
                  value={paymentSearch}
                  onChange={setPaymentSearch}
                  placeholder="Search by ID, student, course…"
                />
              }
              onRefresh={fetchPayments}
              loading={paymentsLoading}
              error={paymentsError}
              onRetry={fetchPayments}
              empty={filteredPayments.length === 0}
              emptyMsg={paymentSearch ? 'No transactions match your search.' : 'No transactions recorded yet.'}
            >
              {/* Table head */}
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3">Transaction ID</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Course</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 hidden md:table-cell">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
                {paymentsLoading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  : filteredPayments.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                            {p.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.studentName}</p>
                          <p className="text-[11px] text-gray-500 hidden xs:block">{p.email}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell max-w-[200px]">
                          <span className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">{p.course}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            ₹{Number(p.amount).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-gray-500">
                            {new Date(p.date).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </TableCard>
          </motion.div>
        ) : (
          <motion.div
            key="receipts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <TableCard
              title={`All Receipts (${filteredReceipts.length})`}
              searchBar={
                <SearchBar
                  value={receiptSearch}
                  onChange={setReceiptSearch}
                  placeholder="Search by receipt ID, student, course…"
                />
              }
              onRefresh={fetchReceipts}
              loading={receiptsLoading}
              error={receiptsError}
              onRetry={fetchReceipts}
              empty={filteredReceipts.length === 0}
              emptyMsg={receiptSearch ? 'No receipts match your search.' : 'No receipts generated yet.'}
            >
              {/* Table head */}
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3">Receipt No</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Course</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 hidden md:table-cell">Date</th>
                  <th className="px-4 py-3">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
                {receiptsLoading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  : filteredReceipts.map((r) => {
                      const studentName = r.userName || r.user?.name || '—';
                      const studentEmail = r.userEmail || r.user?.email || '—';
                      const course = r.courseName || r.course?.title || r.liveCourse?.title || '—';
                      return (
                        <tr
                          key={r._id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                              {r.receiptId || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentName}</p>
                            <p className="text-[11px] text-gray-500 hidden xs:block">{studentEmail}</p>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell max-w-[180px]">
                            <span className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">{course}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              ₹{Number(r.amount || 0).toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-gray-500">
                              {new Date(r.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {r.receiptId ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => downloadPdf(r.receiptId, 'download')}
                                  title="Download PDF"
                                  className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                                >
                                  <FiDownload size={14} />
                                </button>
                                <button
                                  onClick={() => downloadPdf(r.receiptId, 'view')}
                                  title="View in browser"
                                  className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                  <FiEye size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No PDF</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </TableCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Reusable table wrapper ───────────────────────────────────────────────────
const TableCard = ({
  title,
  searchBar,
  onRefresh,
  loading,
  error,
  onRetry,
  empty,
  emptyMsg,
  children,
}) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
    {/* Card header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-5 border-b border-gray-100 dark:border-gray-800">
      <h2 className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{title}</h2>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {searchBar}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh"
          className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50 shrink-0"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>

    {/* Error state */}
    {error && !loading && (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <FiAlertCircle className="text-red-400" size={32} />
        <p className="text-sm text-red-500 font-medium">{error}</p>
        <button
          onClick={onRetry}
          className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
        >
          <FiRefreshCw size={13} /> Retry
        </button>
      </div>
    )}

    {/* Table */}
    {!error && (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    )}

    {/* Empty state */}
    {!loading && !error && empty && (
      <div className="flex flex-col items-center gap-3 p-10 text-center border-t border-gray-100 dark:border-gray-800">
        <FiFileText className="text-gray-300 dark:text-gray-700" size={32} />
        <p className="text-sm text-gray-500">{emptyMsg}</p>
      </div>
    )}
  </div>
);

export default PaymentManager;

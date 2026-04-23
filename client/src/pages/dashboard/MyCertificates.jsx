import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAward, FiFileText, FiDownload, FiCheckCircle,
  FiExternalLink, FiEye, FiAlertCircle, FiRefreshCw,
  FiCalendar, FiHash, FiCreditCard, FiShare2,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Download a protected PDF via axios (sends Authorization header automatically).
 */
const downloadPdf = async (relativeUrl, filename) => {
  const toastId = toast.loading('Preparing download…');
  try {
    const isAbsolute = relativeUrl.startsWith('http');
    const url = isAbsolute ? relativeUrl : `${BACKEND_BASE}${relativeUrl}`;
    const response = await axios.get(url, { responseType: 'blob', withCredentials: true });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    toast.success('Download started!', { id: toastId });
  } catch (err) {
    console.error('PDF download error:', err);
    toast.error(
      err.response?.status === 403 ? 'Access denied — please log in again.'
        : err.response?.status === 404 ? 'File not found. Please contact support.'
        : 'Download failed. Please try again.',
      { id: toastId }
    );
  }
};

/**
 * Open a PDF inline (view in new tab) via authenticated axios → blob URL.
 */
const viewPdf = async (relativeUrl) => {
  const toastId = toast.loading('Opening document…');
  try {
    const isAbsolute = relativeUrl.startsWith('http');
    const url = isAbsolute ? relativeUrl : `${BACKEND_BASE}${relativeUrl}`;
    const response = await axios.get(url, { responseType: 'blob', withCredentials: true });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    toast.success('Opened in new tab!', { id: toastId });
  } catch (err) {
    console.error('PDF view error:', err);
    toast.error('Could not open document. Please try downloading instead.', { id: toastId });
  }
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── Skeleton ────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 animate-pulse">
    <div className="h-40 bg-gray-100 dark:bg-gray-700/50 rounded-xl mb-4" />
    <div className="h-5 bg-gray-100 dark:bg-gray-700/50 rounded-lg w-3/4 mb-3" />
    <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg w-1/2 mb-5" />
    <div className="flex gap-2">
      <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-xl flex-1" />
      <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const MyCertificates = () => {
  const [activeTab, setActiveTab] = useState('certificates');
  const [certificates, setCertificates] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'certificates') {
        const res = await axios.get('/api/certificates/my');
        if (res.data.success) setCertificates(res.data.data);
      } else {
        const res = await axios.get('/api/receipts/my');
        if (res.data.success) setReceipts(res.data.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tabs = [
    { key: 'certificates', label: 'Certificates', Icon: FiAward, count: certificates.length },
    { key: 'receipts', label: 'Receipts', Icon: FiFileText, count: receipts.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 md:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── Hero Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-primary-200/30 to-purple-200/20 dark:from-primary-900/20 dark:to-purple-900/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-gradient-to-tr from-amber-100/30 to-primary-100/20 dark:from-amber-900/10 dark:to-primary-900/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 p-5 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <FiAward className="text-white" size={22} />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    Certificates & Receipts
                  </h1>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Your achievements and payment records
                  </p>
                </div>
              </div>

              {/* Stats pills */}
              <div className="flex gap-2.5">
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 rounded-xl px-3.5 py-2 text-center min-w-[70px]">
                  <div className="text-lg font-black text-primary-700 dark:text-primary-400">{certificates.length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-primary-500/70 dark:text-primary-500/60">Certs</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/50 rounded-xl px-3.5 py-2 text-center min-w-[70px]">
                  <div className="text-lg font-black text-amber-700 dark:text-amber-400">{receipts.length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-amber-500/70 dark:text-amber-500/60">Receipts</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl border border-gray-100 dark:border-gray-800 p-1.5 shadow-sm inline-flex w-full sm:w-auto">
          {tabs.map(({ key, label, Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 md:px-6 py-2.5 text-sm font-bold rounded-lg md:rounded-xl transition-all duration-200 ${
                activeTab === key
                  ? 'text-white shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              {activeTab === key && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-600 dark:to-primary-500 rounded-lg md:rounded-xl"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={15} />
                <span className="hidden xs:inline">{label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>{count}</span>
              </span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="min-h-[360px]">
          {/* Error */}
          {error && !loading && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center gap-4 p-10 text-center bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <FiAlertCircle className="text-red-500" size={28} />
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{error}</p>
              <button onClick={fetchData}
                className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400 hover:underline">
                <FiRefreshCw size={14} /> Try Again
              </button>
            </motion.div>
          )}

          {/* Loading */}
          {loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Data */}
          {!loading && !error && (
            <AnimatePresence mode="wait">
              {activeTab === 'certificates' ? (
                <motion.div key="certs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                  {certificates.length === 0 ? (
                    <EmptyState
                      Icon={FiAward}
                      gradient="from-primary-500 to-purple-600"
                      title="No certificates yet"
                      description="Complete a course or submit feedback for a live cohort to earn your official certificate."
                      action={<Link to="/dashboard" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm px-6 py-2.5 rounded-xl font-bold shadow-md shadow-primary-500/20 transition-colors">Go to Dashboard</Link>}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {certificates.map((cert, i) => (
                        <motion.div key={cert._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.3 }}>
                          <CertificateCard cert={cert} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="receipts" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                  {receipts.length === 0 ? (
                    <EmptyState
                      Icon={FiFileText}
                      gradient="from-amber-500 to-orange-600"
                      title="No receipts found"
                      description="Payment receipts appear here automatically after a successful course purchase."
                      action={<Link to="/courses" className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm px-6 py-2.5 rounded-xl font-bold shadow-md transition-colors">Explore Courses</Link>}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {receipts.map((receipt, i) => (
                        <motion.div key={receipt._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.3 }}>
                          <ReceiptCard receipt={receipt} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Certificate Card ─────────────────────────────────────────────────────────
const CertificateCard = ({ cert }) => {
  const thumbnail = cert.course?.thumbnail || cert.liveCourse?.thumbnail || null;
  const downloadUrl = cert.downloadUrl || `/api/certificates/${cert.certificateId}/download`;
  const viewUrl = cert.viewUrl || `/api/certificates/${cert.certificateId}/view`;
  const isCohort = cert.type === 'COHORT';

  return (
    <div className="group flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary-500/5 dark:hover:shadow-primary-500/5 transition-all duration-300 hover:-translate-y-0.5">
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={cert.courseName}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${isCohort ? 'from-purple-100 to-indigo-200 dark:from-purple-900/40 dark:to-indigo-900/30' : 'from-primary-100 to-blue-200 dark:from-primary-900/40 dark:to-blue-900/30'}`}>
            <FiAward className={`${isCohort ? 'text-purple-400' : 'text-primary-400'} opacity-60`} size={44} />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-sm text-white shadow-sm ${isCohort ? 'bg-purple-600/90' : 'bg-primary-600/90'}`}>
            {isCohort ? '🎓 Cohort' : '📚 Course'}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-lg">
            <FiCheckCircle size={10} /> Issued
          </span>
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <span className="text-[10px] font-mono font-bold bg-white/15 backdrop-blur-md text-white/90 px-2.5 py-1 rounded-md border border-white/10">
            <FiHash size={9} className="inline -mt-px mr-0.5" />{cert.certificateId}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-grow p-4 gap-2">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
          {cert.courseName}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <FiCalendar size={11} />
          <span>{formatDate(cert.issueDate)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button onClick={() => downloadPdf(downloadUrl, `${cert.certificateId}.pdf`)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-primary-500/20 active:scale-[0.98]">
          <FiDownload size={13} /> Download
        </button>
        <button onClick={() => viewPdf(viewUrl)} title="View in browser"
          className="p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
          <FiEye size={15} />
        </button>
        <Link to={`/certificate/${cert.certificateId}`} title="Share & verify"
          className="p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
          <FiShare2 size={15} />
        </Link>
      </div>
    </div>
  );
};

// ─── Receipt Card ─────────────────────────────────────────────────────────────
const ReceiptCard = ({ receipt }) => {
  const downloadUrl = receipt.downloadUrl || `/api/receipts/${receipt.receiptId}/download`;
  const viewUrl = receipt.viewUrl || `/api/receipts/${receipt.receiptId}/view`;

  return (
    <div className="group flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300 hover:-translate-y-0.5">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />

      <div className="p-5 flex flex-col flex-grow">
        {/* Header: Status + Date */}
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-100 dark:border-green-800/40">
            <FiCheckCircle size={11} /> Payment Successful
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            <FiCalendar size={10} />
            {formatDate(receipt.createdAt)}
          </span>
        </div>

        {/* Course name */}
        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2 mb-4">
          {receipt.courseName || receipt.course?.title || receipt.liveCourse?.title || 'Course'}
        </h3>

        {/* Amount highlight */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 mb-4 border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Amount Paid</span>
            <span className="text-lg font-black text-gray-900 dark:text-white">
              ₹{Number(receipt.amount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <DetailRow icon={FiHash} label="Receipt No" value={receipt.receiptId} mono />
          {receipt.paymentId && receipt.paymentId !== 'N/A' && (
            <DetailRow icon={FiCreditCard} label="Payment ID" value={receipt.paymentId} mono small />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-50 dark:border-gray-800">
          <button onClick={() => downloadPdf(downloadUrl, `${receipt.receiptId}.pdf`)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold py-2.5 rounded-xl transition-all duration-200 shadow-sm active:scale-[0.98]">
            <FiDownload size={13} /> Download
          </button>
          <button onClick={() => viewPdf(viewUrl)} title="View in browser"
            className="p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <FiEye size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value, mono, small }) => (
  <div className="flex items-center justify-between gap-3 text-xs">
    <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 shrink-0">
      {Icon && <Icon size={11} />} {label}
    </span>
    <span className={[
      'text-right truncate max-w-[180px]',
      'text-gray-700 dark:text-gray-300 font-medium',
      mono ? 'font-mono' : '',
      small ? 'text-[10px]' : '',
    ].join(' ')} title={value}>
      {value}
    </span>
  </div>
);

const EmptyState = ({ Icon, gradient, title, description, action }) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center p-10 md:p-16 text-center bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
    <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${gradient} rounded-2xl md:rounded-3xl flex items-center justify-center mb-5 shadow-lg`}>
      <Icon className="text-white" size={28} />
    </div>
    <h3 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-7 leading-relaxed">{description}</p>
    {action}
  </motion.div>
);

export default MyCertificates;

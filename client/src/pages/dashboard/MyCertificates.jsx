import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAward, FiFileText, FiDownload, FiCheckCircle,
  FiExternalLink, FiEye, FiAlertCircle, FiRefreshCw,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// ─── Skeleton ────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
    <div className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" />
    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-5" />
    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
  </div>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Download a protected PDF via axios (sends Authorization header automatically).
 * Falls back to direct window.open if the URL is an external Cloudinary link.
 */
const downloadPdf = async (relativeUrl, filename) => {
  const toastId = toast.loading('Preparing download…');
  try {
    const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    // If already an absolute URL (e.g. Cloudinary), open directly
    const isAbsolute = relativeUrl.startsWith('http');
    const url = isAbsolute ? relativeUrl : `${backendBase}${relativeUrl}`;

    const response = await axios.get(url, {
      responseType: 'blob',
      // axios already sends Authorization: Bearer <token> from the global default
      withCredentials: true,
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Release the object URL after the browser starts the download
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    toast.success('Download started!', { id: toastId });
  } catch (err) {
    console.error('PDF download error:', err);
    toast.error(
      err.response?.status === 403
        ? 'Access denied — please log in again.'
        : err.response?.status === 404
        ? 'File not found. Please contact support.'
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
    const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const isAbsolute = relativeUrl.startsWith('http');
    const url = isAbsolute ? relativeUrl : `${backendBase}${relativeUrl}`;

    const response = await axios.get(url, {
      responseType: 'blob',
      withCredentials: true,
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    // Revoke after a generous delay so the new tab can load it
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    toast.success('Opened in new tab!', { id: toastId });
  } catch (err) {
    console.error('PDF view error:', err);
    toast.error('Could not open document. Please try downloading instead.', { id: toastId });
  }
};

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
        // Use /my for own certs — simpler and doesn't expose the userId in URL
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FiAward className="text-primary-600 shrink-0" />
          My Certificates &amp; Receipts
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and download your official course certificates and payment receipts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { key: 'certificates', label: 'Certificates', Icon: FiAward },
          { key: 'receipts', label: 'Receipts', Icon: FiFileText },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative flex items-center gap-2 pb-3 px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === key
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={15} />
            {label}
            {activeTab === key && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[320px]">
        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800">
            <FiAlertCircle className="text-red-400" size={36} />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              <FiRefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Data */}
        {!loading && !error && (
          <AnimatePresence mode="wait">
            {activeTab === 'certificates' ? (
              <motion.div
                key="certs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {certificates.length === 0 ? (
                  <EmptyState
                    Icon={FiAward}
                    title="No certificates yet"
                    description="Complete all lessons in an enrolled course to earn your official certificate."
                    action={<Link to="/dashboard/courses" className="text-sm font-semibold text-primary-600 hover:underline">Go to My Courses →</Link>}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {certificates.map((cert) => (
                      <CertificateCard key={cert._id} cert={cert} />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="receipts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {receipts.length === 0 ? (
                  <EmptyState
                    Icon={FiFileText}
                    title="No receipts found"
                    description="Your payment receipts appear here after a successful purchase."
                    action={
                      <Link
                        to="/courses"
                        className="inline-block bg-primary-600 text-white text-sm px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                      >
                        Explore Courses
                      </Link>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {receipts.map((receipt) => (
                      <ReceiptCard key={receipt._id} receipt={receipt} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// ─── Certificate Card ─────────────────────────────────────────────────────────
const CertificateCard = ({ cert }) => {
  const thumbnail =
    cert.course?.thumbnail || cert.liveCourse?.thumbnail || null;
  const downloadUrl = cert.downloadUrl || `/api/certificates/${cert.certificateId}/download`;
  const viewUrl = cert.viewUrl || `/api/certificates/${cert.certificateId}/view`;

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-900 overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={cert.courseName}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40">
            <FiAward className="text-primary-400" size={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        {/* Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md text-white shadow-sm ${cert.type === 'COHORT' ? 'bg-purple-600' : 'bg-primary-600'}`}>
            {cert.type === 'COHORT' ? 'Cohort' : 'Course'}
          </span>
        </div>
        {/* Cert ID */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="text-[10px] font-mono font-bold bg-black/40 backdrop-blur text-white px-2 py-0.5 rounded-md">
            {cert.certificateId}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-grow p-4 gap-1">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2">{cert.courseName}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Issued {new Date(cert.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => downloadPdf(downloadUrl, `${cert.certificateId}.pdf`)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
        >
          <FiDownload size={13} /> Download PDF
        </button>
        <button
          onClick={() => viewPdf(viewUrl)}
          title="View in browser"
          className="p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <FiEye size={15} />
        </button>
        <Link
          to={`/certificate/${cert.certificateId}`}
          title="Public verification link"
          className="p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <FiExternalLink size={15} />
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
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      {/* Status + Date */}
      <div className="flex items-center justify-between mb-4">
        <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-full">
          <FiCheckCircle size={12} /> SUCCESS
        </span>
        <span className="text-xs text-gray-400">
          {new Date(receipt.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      </div>

      {/* Course name */}
      <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2 mb-3">
        {receipt.courseName || receipt.course?.title || receipt.liveCourse?.title || 'Course'}
      </h3>

      {/* Details */}
      <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-700 pt-3 mb-4">
        <Row label="Amount" value={`₹${Number(receipt.amount).toLocaleString('en-IN')}`} bold />
        <Row
          label="Receipt No"
          value={receipt.receiptId}
          mono
        />
        {receipt.paymentId && receipt.paymentId !== 'N/A' && (
          <Row label="Payment ID" value={receipt.paymentId} mono small />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => downloadPdf(downloadUrl, `${receipt.receiptId}.pdf`)}
          className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 text-gray-800 dark:text-gray-200 text-xs font-semibold py-2.5 rounded-xl transition-colors"
        >
          <FiDownload size={13} /> Download
        </button>
        <button
          onClick={() => viewPdf(viewUrl)}
          title="View in browser"
          className="p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <FiEye size={15} />
        </button>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const Row = ({ label, value, bold, mono, small }) => (
  <div className="flex items-start justify-between gap-2 text-xs">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span
      className={[
        'text-right break-all',
        bold ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300',
        mono ? 'font-mono' : '',
        small ? 'text-[10px]' : '',
      ].join(' ')}
    >
      {value}
    </span>
  </div>
);

const EmptyState = ({ Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-10 md:p-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
      <Icon className="text-gray-400" size={28} />
    </div>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">{description}</p>
    {action}
  </div>
);

export default MyCertificates;

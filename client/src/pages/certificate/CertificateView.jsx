import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiDownload, FiCheckCircle, FiXCircle, FiAward,
  FiCalendar, FiHash, FiExternalLink, FiShare2,
} from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';

const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const CertificateView = () => {
  const { id } = useParams();
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pdfMode, setPdfMode] = useState(true);

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const res = await axios.get(`/api/certificates/${id}`);
        setCertData(res.data.data);
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchCert();
  }, [id]);

  const handleDownload = async () => {
    const rawUrl = certData?.downloadUrl || `/api/certificates/${id}/download`;
    const toastId = toast.loading('Preparing download…');
    try {
      const url = rawUrl.startsWith('http') ? rawUrl : `${BACKEND_BASE}${rawUrl}`;
      const response = await axios.get(url, { responseType: 'blob', withCredentials: true });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      toast.success('Download started!', { id: toastId });
    } catch (err) {
      toast.error(
        err.response?.status === 404 ? 'Certificate PDF not found.' : 'Download failed. Please try again.',
        { id: toastId }
      );
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${certData?.studentName}'s Certificate`,
          text: `Verified certificate for ${certData?.courseName}`,
          url: shareUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Loading certificate…</p>
        </div>
      </div>
    );
  }

  if (notFound || !certData) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center">
          <FiXCircle className="text-red-400" size={36} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h1>
          <p className="text-gray-400 text-sm max-w-sm">
            This certificate ID does not exist or may have been revoked.
          </p>
        </div>
        <Link
          to="/"
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const pdfViewUrl = certData.viewUrl
    ? (certData.viewUrl.startsWith('http') ? certData.viewUrl : `${BACKEND_BASE}${certData.viewUrl}`)
    : `${BACKEND_BASE}/api/certificates/${id}/view`;

  const issueDateStr = new Date(certData.issueDate).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Verification banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-emerald-950/60 border border-emerald-700/40 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
              <FiCheckCircle className="text-emerald-400" size={20} />
            </div>
            <div>
              <p className="text-emerald-400 font-bold text-sm">Verified Certificate</p>
              <p className="text-emerald-600 text-xs font-mono mt-0.5">{certData.certificateId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-bold transition-colors"
            >
              <FiShare2 size={13} /> Share
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <FiDownload size={13} /> Download PDF
            </button>
          </div>
        </motion.div>

        {/* ── Mode toggle ── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPdfMode(false)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${!pdfMode ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Certificate Preview
          </button>
          <button
            onClick={() => setPdfMode(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${pdfMode ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            View PDF
          </button>
        </div>

        {/* ── PDF embed ── */}
        {pdfMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full rounded-2xl overflow-hidden border border-gray-800 shadow-2xl"
            style={{ height: '75vh' }}
          >
            <iframe
              src={pdfViewUrl}
              title="Certificate PDF"
              width="100%"
              height="100%"
              style={{ border: 'none', background: '#1a1a1a' }}
            />
          </motion.div>
        )}

        {/* ── HTML styled certificate ── */}
        {!pdfMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
          >
            <div
              className="relative p-10 md:p-16 flex flex-col"
              style={{ minHeight: 520 }}
            >
              {/* Background watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <span className="text-[12rem] font-black text-gray-900 opacity-[0.03] select-none">FWTION</span>
              </div>

              {/* Header row */}
              <div className="flex items-start justify-between mb-10 relative z-10">
                <div className="text-3xl font-black text-gray-900">
                  FWT <span className="text-amber-500">iZON</span>
                </div>
                <div className="text-right text-xs text-gray-400 font-mono">
                  <p className="text-gray-500 font-sans font-medium mb-0.5">Certificate ID</p>
                  {certData.certificateId}
                </div>
              </div>

              {/* Body */}
              <div className="text-center flex-grow flex flex-col justify-center relative z-10 py-6">
                <p className="text-gray-400 uppercase tracking-[0.25em] text-xs font-bold mb-6">
                  Certificate of {certData.certificateType || 'Completion'}
                </p>
                <p className="text-gray-500 text-base mb-3">This is proudly presented to</p>
                <h1
                  className="text-4xl md:text-5xl text-gray-900 pb-3 mb-4 inline-block mx-auto border-b-2 border-gray-200 px-8"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {certData.studentName}
                </h1>
                <p className="text-gray-500 text-sm mb-2">for successfully completing</p>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 max-w-xl mx-auto leading-snug">
                  {certData.courseName}
                </h2>
              </div>

              {/* Footer row */}
              <div className="flex items-end justify-between mt-10 relative z-10">
                <div className="text-center">
                  <p className="font-bold text-gray-800 text-sm">{issueDateStr}</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Date of Issue</p>
                </div>

                {/* Seal */}
                <div className="w-24 h-24 relative shrink-0">
                  <div className="absolute inset-0 bg-amber-500 rounded-full flex items-center justify-center shadow-lg rotate-12">
                    <div className="w-20 h-20 border-2 border-white/50 rounded-full flex flex-col items-center justify-center text-white text-center">
                      <div className="text-xl mb-0.5">★</div>
                      <span className="text-[9px] uppercase font-bold tracking-widest leading-tight">
                        Verified<br />FWT<br />iZON
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="font-bold text-gray-800 text-sm border-b border-gray-300 pb-1 mb-1 min-w-[120px]">
                    Ajay James
                  </p>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Director</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Details card ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: FiHash,        label: 'Certificate ID',  value: certData.certificateId },
            { icon: FiAward,       label: 'Type',            value: certData.certificateType || 'Completion Certificate' },
            { icon: FiCalendar,    label: 'Issued On',       value: new Date(certData.issueDate).toLocaleDateString('en-IN') },
            { icon: FiExternalLink,label: 'Program Type',    value: certData.type === 'COHORT' ? 'Live Cohort' : 'Recorded Course' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} className="text-gray-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
              </div>
              <p className="text-xs font-semibold text-gray-200 truncate">{value}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600 pb-6">
          This certificate is digitally verified by FWT iZON Academy. Share the URL of this page to let others verify authenticity.
        </p>
      </div>
    </div>
  );
};

export default CertificateView;

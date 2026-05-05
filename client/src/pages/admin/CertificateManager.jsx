import { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminTable } from '../../components/admin/AdminTable';
import { FiTrash2, FiPlus, FiDownload, FiCheckCircle, FiXCircle, FiRefreshCw, FiRotateCw, FiAward, FiFileText, FiUser, FiLayers, FiExternalLink, FiEye } from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Authenticated PDF download — streams the PDF via axios (sends Bearer token)
 * and triggers a browser download from a blob URL.
 */
const downloadPdfAuth = async (relativeUrl, filename) => {
  const toastId = toast.loading('Preparing download…');
  try {
    const url = relativeUrl.startsWith('http') ? relativeUrl : `${BACKEND_URL.replace(/\/+$/, '')}${relativeUrl}`;
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
      err.response?.status === 404
        ? 'PDF not found. The file may not have been generated yet.'
        : 'Download failed. Please try again.',
      { id: toastId }
    );
  }
};

/**
 * Authenticated PDF view — opens the PDF inline in a new tab via blob URL.
 */
const viewPdfAuth = async (relativeUrl) => {
  const toastId = toast.loading('Opening document…');
  try {
    const url = relativeUrl.startsWith('http') ? relativeUrl : `${BACKEND_URL.replace(/\/+$/, '')}${relativeUrl}`;
    const response = await axios.get(url, { responseType: 'blob', withCredentials: true });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    toast.success('Opened in new tab!', { id: toastId });
  } catch (err) {
    console.error('PDF view error:', err);
    toast.error('Could not open document. Try downloading instead.', { id: toastId });
  }
};

const CertificateManager = () => {
  const [activeTab, setActiveTab] = useState('certificates');
  const [certificates, setCertificates] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom Generation Flow State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatorType, setGeneratorType] = useState('COURSE'); // 'COURSE' or 'COHORT'

  // Lists
  const [courses, setCourses] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Selections
  const [selectedId, setSelectedId] = useState('');
  const [selectedCertType, setSelectedCertType] = useState('Completion Certificate');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'certificates') {
        const certRes = await axios.get('/api/admin/certificates');
        setCertificates(certRes.data.data || []);
      } else {
        const res = await axios.get('/api/admin/receipts');
        setReceipts(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openGenerateModal = async () => {
    setIsModalOpen(true);
    try {
      const [coursesRes, cohortsRes, templatesRes] = await Promise.all([
        axios.get('/api/courses'),
        axios.get('/api/admin/cohorts'),
        axios.get('/api/cert-templates')
      ]);
      setCourses(coursesRes.data.data || []);
      setCohorts(cohortsRes.data.data || []);
      setTemplates((templatesRes.data.data || []).filter(template => template.isActive));
    } catch (err) {
      toast.error('Failed to load certificate issue options');
    }
  };

  useEffect(() => {
    // Reset selection when toggling types
    setSelectedId('');
    setEnrolledStudents([]);
    setSelectedCertType('Completion Certificate');
    setSelectedTemplateId('');
  }, [generatorType]);

  const handleSelection = async (id) => {
    setSelectedId(id);
    setEnrolledStudents([]);
    if (!id) return;

    try {
      setLoadingStudents(true);
      const url = generatorType === 'COURSE'
        ? `/api/admin/courses/${id}/enrolled-students`
        : `/api/admin/cohorts/${id}/students`;

      const res = await axios.get(url);
      setEnrolledStudents(res.data.data || []);

      // Smooth scroll to students section on small screens
      if (window.innerWidth < 768) {
        setTimeout(() => {
          const el = document.getElementById('students-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (err) {
      toast.error(`Failed to fetch students for this ${generatorType.toLowerCase()}`);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleGenerateClick = async (userId) => {
    try {
      setGeneratingFor(userId);
      const url = generatorType === 'COURSE'
        ? '/api/admin/generate-certificate'
        : '/api/admin/generate-cohort-certificate';

      const payload = generatorType === 'COURSE'
        ? { userId, courseId: selectedId, certificateType: selectedCertType }
        : { userId, cohortId: selectedId, certificateType: selectedCertType };

      if (selectedTemplateId) {
        payload.templateId = selectedTemplateId;
      }

      await axios.post(url, payload);
      toast.success('Certificate generated successfully!');

      // Refresh context
      handleSelection(selectedId);

      // Update background list silently
      const certRes = await axios.get('/api/admin/certificates');
      setCertificates(certRes.data.data || []);

    } catch (err) {
      toast.error(err.response?.data?.message || 'Certificate generation failed');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleRegenerate = async (id) => {
    if (!window.confirm('Regenerate this certificate? The previous PDF will be replaced.')) return;
    try {
      toast.loading('Regenerating...', { id: 'regen' });
      await axios.post(`/api/admin/certificates/regenerate/${id}`, {});
      toast.success('Certificate regenerated', { id: 'regen' });
      fetchData();
    } catch (err) {
      toast.error('Failed to regenerate certificate', { id: 'regen' });
    }
  };

  const handleDelete = async (id, param) => {
    if (!window.confirm('Delete this record permanently?')) return;
    try {
      if (param === 'cert') {
        await axios.delete(`/api/admin/certificates/${id}`);
        toast.success('Certificate deleted');
      }
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const certColumns = [
    { header: 'Certificate ID', accessorKey: 'certificateId', cell: (row) => <span className="font-mono text-xs text-gray-500">{row.certificateId}</span> },
    {
      header: 'Type', accessorKey: 'type', cell: (row) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${row.type === 'COHORT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {row.type || 'COURSE'}
        </span>
      )
    },
    {
      header: 'Cert Type', accessorKey: 'certificateType', cell: (row) => (
        <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          {row.certificateType || 'Completion Certificate'}
        </span>
      )
    },
    {
      header: 'Student', accessorKey: 'studentName', cell: (row) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-white">{row.studentName}</div>
          <div className="text-[10px] text-gray-500">{row.studentEmail}</div>
        </div>
      )
    },
    { header: 'Program', accessorKey: 'courseName', cell: (row) => <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{row.courseName}</span> },
    { header: 'Issue Date', accessorKey: 'issueDate', cell: (row) => <span className="text-xs text-gray-500">{new Date(row.issueDate).toLocaleDateString()}</span> },
    {
      header: 'Action', accessorKey: 'actions', cell: (row) => {
        const viewUrl = row.viewUrl || `/api/certificates/${row.certificateId}/view`;
        const downloadUrl = row.downloadUrl || `/api/certificates/${row.certificateId}/download`;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => viewPdfAuth(viewUrl)}
              title="View PDF"
              className="inline-flex items-center justify-center p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-sky-600"
            >
              <FiEye size={14} />
            </button>
            <button
              onClick={() => downloadPdfAuth(downloadUrl, `${row.certificateId}.pdf`)}
              title="Download PDF"
              className="inline-flex items-center justify-center p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-emerald-600"
            >
              <FiDownload size={14} />
            </button>
            <Button variant="outline" size="sm" title="Regenerate PDF" onClick={() => handleRegenerate(row._id)}><FiRefreshCw size={14} /></Button>
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(row._id, 'cert')}><FiTrash2 size={14} /></Button>
          </div>
        );
      }
    },
  ];

  const receiptColumns = [
    { header: 'Receipt No', accessorKey: 'receiptId', cell: (row) => <span className="font-mono text-xs text-gray-500">{row.receiptId}</span> },
    {
      header: 'Student', accessorKey: 'userName', cell: (row) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-white">{row.userName}</div>
          <div className="text-[10px] text-gray-500">{row.userEmail}</div>
        </div>
      )
    },
    { header: 'Amount', accessorKey: 'amount', cell: (row) => <span className="font-bold text-gray-900 dark:text-white">₹{row.amount}</span> },
    {
      header: 'Status', accessorKey: 'status', cell: (row) => (
        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 flex w-max items-center">
          <FiCheckCircle className="mr-1" /> {row.status}
        </span>
      )
    },
    { header: 'Date', accessorKey: 'createdAt', cell: (row) => <span className="text-xs text-gray-500">{new Date(row.createdAt).toLocaleDateString()}</span> },
    {
      header: 'Download', accessorKey: 'actions', cell: (row) => {
        const downloadUrl = row.downloadUrl || `/api/receipts/${row.receiptId}/download`;
        const viewUrl = row.viewUrl || `/api/receipts/${row.receiptId}/view`;
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => downloadPdfAuth(downloadUrl, `${row.receiptId}.pdf`)}
              title="Download PDF"
              className="inline-flex items-center justify-center gap-1.5 p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-emerald-600"
            >
              <FiDownload size={14} /> Download
            </button>
            <button
              onClick={() => viewPdfAuth(viewUrl)}
              title="View PDF"
              className="inline-flex items-center justify-center p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-sky-600"
            >
              <FiEye size={14} />
            </button>
          </div>
        );
      }
    },
  ];

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('certificates')}
          className={`pb-4 px-6 text-sm font-bold transition-colors relative ${activeTab === 'certificates' ? 'text-primary-600' : 'text-gray-500'}`}
        >
          <span className="flex items-center"><FiAward className="mr-2" /> Certificates</span>
          {activeTab === 'certificates' && <motion.div layoutId="admTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />}
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`pb-4 px-6 text-sm font-bold transition-colors relative ${activeTab === 'receipts' ? 'text-primary-600' : 'text-gray-500'}`}
        >
          <span className="flex items-center"><FiFileText className="mr-2" /> Receipts</span>
          {activeTab === 'receipts' && <motion.div layoutId="admTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'certificates' ? (
          <motion.div key="certs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdminTable
              title="Certificate Management"
              description="Generate, manage, and revoke student certificates across standard courses and live cohorts."
              searchPlaceholder="Search by student name or certificate ID..."
              columns={certColumns}
              data={certificates}
              loading={loading}
              renderActions={() => (
                <Button className="font-bold flex items-center bg-primary-600 hover:bg-primary-700 text-white" onClick={openGenerateModal}>
                  <FiPlus className="mr-2" /> Issue Certificate Workflow
                </Button>
              )}
            />
          </motion.div>
        ) : (
          <motion.div key="receipts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AdminTable
              title="Payment Receipts"
              description="View all system-generated payment receipts."
              searchPlaceholder="Search by student name or receipt ID..."
              columns={receiptColumns}
              data={receipts}
              loading={loading}
              renderActions={() => null}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW CERTIFICATE GENERATOR MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-gray-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden md:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl"
            >

              <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                    <FiAward size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold">Issue Certificates</h2>
                    <p className="hidden md:block text-xs text-gray-500 mt-0.5">Manage and issue credentials to enrolled students.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <FiXCircle size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
                <div className="p-4 md:p-8 space-y-6 md:space-y-8">

                  {/* GENERATOR TYPE SELECTOR */}
                  <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md mx-auto">
                    <button
                      onClick={() => setGeneratorType('COURSE')}
                      className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all ${generatorType === 'COURSE' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      Recorded Courses
                    </button>
                    <button
                      onClick={() => setGeneratorType('COHORT')}
                      className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all ${generatorType === 'COHORT' ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      Live Cohorts
                    </button>
                  </div>

                  {/* STEP 1: COURSE SELECTION */}
                  <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-[10px] font-bold">1</div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-200">Select {generatorType === 'COURSE' ? 'Course' : 'Live Cohort'}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select
                        value={selectedId}
                        onChange={e => handleSelection(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                      >
                        <option value="">-- Choose {generatorType === 'COURSE' ? 'Course' : 'Live Cohort'} --</option>
                        {(generatorType === 'COURSE' ? courses : cohorts).map(c => (
                          <option key={c._id} value={c._id}>{c.title}</option>
                        ))}
                      </select>
                      <select
                        value={selectedCertType}
                        onChange={e => setSelectedCertType(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                      >
                        <option value="Completion Certificate">Completion Certificate</option>
                        <option value="Participation Certificate">Participation Certificate</option>
                        <option value="Excellence Certificate">Excellence Certificate</option>
                      </select>
                      <select
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all outline-none md:col-span-2"
                      >
                        <option value="">Use active default template</option>
                        {templates.map(template => (
                          <option key={template._id} value={template._id}>
                            {template.templateName}{template.isDefault ? ' (Default)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center mt-4 px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-900/20">
                      <FiLayers className="text-blue-500 mr-2 shrink-0" size={14} />
                      <p className="text-[10px] md:text-xs text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                        {selectedTemplateId
                          ? "The selected active template will be used for this issue run."
                          : generatorType === 'COHORT'
                            ? "Live Course Certificates can be issued to any student with an active enrollment."
                            : "Recorded Course Certificates are typically issued upon 100% module completion."}
                      </p>
                    </div>
                  </div>

                  {/* STEP 2: STUDENT LIST */}
                  <div id="students-section" className={`transition-all duration-500 ${selectedId ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    {selectedId && (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-50 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-[10px] font-bold">2</div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-200">Enrolled Students</h3>
                          </div>

                          <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                              type="text"
                              placeholder="Filter students..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full md:w-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="p-0">
                          {loadingStudents ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                              <FiRefreshCw className="animate-spin text-primary-500 mb-3" size={24} />
                              <p className="text-sm text-gray-500 font-medium">Fetching enrollment data...</p>
                            </div>
                          ) : enrolledStudents.length === 0 ? (
                            <div className="py-20 text-center">
                              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-800">
                                <FiUser className="text-gray-300" size={24} />
                              </div>
                              <p className="text-sm font-bold text-gray-600 dark:text-gray-400">No students found</p>
                              <p className="text-xs text-gray-400 mt-1">Make sure there are paid enrollments for this course.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm whitespace-nowrap hidden md:table">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                  <tr>
                                    <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Student Details</th>
                                    <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Status</th>
                                    <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-gray-400">Date Marker</th>
                                    <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-gray-400 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                  {enrolledStudents
                                    .filter(s => s.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || s.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map(student => {
                                      const canGenerate = generatorType === 'COHORT' || student.completionStatus === 'COMPLETED';
                                      const isGenerating = generatingFor === student.userId;

                                      return (
                                        <tr key={student.userId || student.userEmail} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                          <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase">
                                                {student.userName?.charAt(0) || 'U'}
                                              </div>
                                              <div>
                                                <div className="font-bold text-gray-900 dark:text-white leading-none mb-1">{student.userName}</div>
                                                <div className="text-[10px] text-gray-500">{student.userEmail}</div>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${student.completionStatus === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-100' : student.completionStatus === 'ELIGIBLE' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                              {student.completionStatus === 'COMPLETED' ? 'COMPLETED' : student.completionStatus === 'ELIGIBLE' ? 'ELIGIBLE' : 'IN PROGRESS'}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                                            {student.completedAt ? new Date(student.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                            {canGenerate ? (
                                              <Button
                                                size="sm"
                                                className={`font-bold h-8 px-4 rounded-lg shadow-sm transition-all active:scale-95 ${isGenerating ? 'bg-gray-100 text-gray-400' : generatorType === 'COHORT' ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-200'}`}
                                                onClick={() => handleGenerateClick(student.userId)}
                                                disabled={isGenerating}
                                              >
                                                {isGenerating ? <FiRefreshCw className="animate-spin mr-1.5" /> : null}
                                                {isGenerating ? 'Working...' : 'Issue Certificate'}
                                              </Button>
                                            ) : (
                                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Ineligible</span>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                </tbody>
                              </table>

                              {/* MOBILE VIEW CARDS */}
                              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                                {enrolledStudents
                                  .filter(s => s.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || s.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()))
                                  .map(student => {
                                    const canGenerate = generatorType === 'COHORT' || student.completionStatus === 'COMPLETED';
                                    const isGenerating = generatingFor === student.userId;

                                    return (
                                      <div key={student.userId || student.userEmail} className="p-4 space-y-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center text-xs font-bold uppercase">
                                            {student.userName?.charAt(0) || 'U'}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-bold text-gray-900 dark:text-white truncate">{student.userName}</div>
                                            <div className="text-[10px] text-gray-500 truncate">{student.userEmail}</div>
                                          </div>
                                          <div className="shrink-0">
                                            <span className={`px-2 py-1 rounded text-[9px] font-extrabold uppercase tracking-widest border ${student.completionStatus === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-100' : student.completionStatus === 'ELIGIBLE' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                              {student.completionStatus === 'COMPLETED' ? 'DONE' : student.completionStatus === 'ELIGIBLE' ? 'OK' : 'WAIT'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 pt-1">
                                          <div className="text-[10px] text-gray-400 font-medium">
                                            Marker: {student.completedAt ? new Date(student.completedAt).toLocaleDateString() : 'N/A'}
                                          </div>
                                          {canGenerate ? (
                                            <Button
                                              size="sm"
                                              className={`font-bold flex-1 h-9 rounded-xl transition-all ${isGenerating ? 'bg-gray-100 text-gray-400' : generatorType === 'COHORT' ? 'bg-purple-600 text-white' : 'bg-primary-600 text-white'}`}
                                              onClick={() => handleGenerateClick(student.userId)}
                                              disabled={isGenerating}
                                            >
                                              {isGenerating ? 'Working...' : 'Issue Certificate'}
                                            </Button>
                                          ) : (
                                            <Button disabled variant="outline" size="sm" className="flex-1 h-9 rounded-xl text-[10px] font-bold opacity-50">Ineligible</Button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col md:flex-row gap-3 md:justify-between items-center sticky bottom-0">
                <p className="text-[10px] text-gray-400 font-medium text-center md:text-left">
                  Certificates are automatically issued to students. Ensure data accuracy before clicking.
                </p>
                <Button onClick={() => setIsModalOpen(false)} variant="outline" className="w-full md:w-auto font-bold h-11 px-8 rounded-xl border-gray-200">
                  Dismiss Manager
                </Button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CertificateManager;

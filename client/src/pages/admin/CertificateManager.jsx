import { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminTable } from '../../components/admin/AdminTable';
import { FiTrash2, FiPlus, FiDownload, FiCheckCircle, FiXCircle, FiRefreshCw, FiAward, FiFileText, FiUser, FiLayers } from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  // Selections
  const [selectedId, setSelectedId] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null);

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
      const [coursesRes, cohortsRes] = await Promise.all([
        axios.get('/api/courses'),
        axios.get('/api/admin/cohorts')
      ]);
      setCourses(coursesRes.data.data || []);
      setCohorts(cohortsRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load courses and cohorts');
    }
  };

  useEffect(() => {
    // Reset selection when toggling types
    setSelectedId('');
    setEnrolledStudents([]);
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
        ? { userId, courseId: selectedId }
        : { userId, cohortId: selectedId };

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
    { header: 'Type', accessorKey: 'type', cell: (row) => (
      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${row.type === 'COHORT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
        {row.type || 'COURSE'}
      </span>
    )},
    { header: 'Student', accessorKey: 'studentName', cell: (row) => (
      <div>
        <div className="font-bold text-gray-900 dark:text-white">{row.studentName}</div>
        <div className="text-[10px] text-gray-500">{row.studentEmail}</div>
      </div>
    )},
    { header: 'Program', accessorKey: 'courseName', cell: (row) => <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{row.courseName}</span> },
    { header: 'Issue Date', accessorKey: 'issueDate', cell: (row) => <span className="text-xs text-gray-500">{new Date(row.issueDate).toLocaleDateString()}</span> },
    { header: 'Action', accessorKey: 'actions', cell: (row) => (
      <div className="flex space-x-2">
        {row.fileUrl && <a href={row.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-emerald-600"><FiDownload size={14} /></a>}
        <Button variant="outline" size="sm" title="Regenerate PDF" onClick={() => handleRegenerate(row._id)}><FiRefreshCw size={14} /></Button>
        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(row._id, 'cert')}><FiTrash2 size={14} /></Button>
      </div>
    )}
  ];

  const receiptColumns = [
    { header: 'Receipt No', accessorKey: 'receiptId', cell: (row) => <span className="font-mono text-xs text-gray-500">{row.receiptId}</span> },
    { header: 'Student', accessorKey: 'userName', cell: (row) => (
      <div>
        <div className="font-bold text-gray-900 dark:text-white">{row.userName}</div>
        <div className="text-[10px] text-gray-500">{row.userEmail}</div>
      </div>
    )},
    { header: 'Amount', accessorKey: 'amount', cell: (row) => <span className="font-bold text-gray-900 dark:text-white">₹{row.amount}</span> },
    { header: 'Status', accessorKey: 'status', cell: (row) => (
      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 flex w-max items-center">
        <FiCheckCircle className="mr-1" /> {row.status}
      </span>
    )},
    { header: 'Date', accessorKey: 'createdAt', cell: (row) => <span className="text-xs text-gray-500">{new Date(row.createdAt).toLocaleDateString()}</span> },
    { header: 'Download', accessorKey: 'actions', cell: (row) => (
      <div className="flex space-x-2">
        {row.fileUrl && <a href={row.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-emerald-600"><FiDownload size={14} /> Download</a>}
      </div>
    )}
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm shadow-2xl">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800">
            
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Certificate Generator</h2>
                <p className="text-xs text-gray-500 mt-1">Select logic chain to view students and override completion issuances.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><FiXCircle size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/50">
              
              {/* TOGGLE TAB */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8 bg-white dark:bg-gray-800 rounded-xl p-2 shadow-sm">
                <button
                  onClick={() => setGeneratorType('COURSE')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${generatorType === 'COURSE' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span className="flex items-center justify-center"><FiLayers className="mr-2" /> Course Certificates</span>
                </button>
                <div className="w-2" />
                <button
                  onClick={() => setGeneratorType('COHORT')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${generatorType === 'COHORT' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span className="flex items-center justify-center"><FiUser className="mr-2" /> Cohort Certificates</span>
                </button>
              </div>

              {/* STEP 1: SELECT */}
              <div className="mb-8 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Step 1: Select {generatorType === 'COURSE' ? 'Recorded Course' : 'Live Cohort'}</label>
                <select 
                  value={selectedId} 
                  onChange={e => handleSelection(e.target.value)} 
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">-- Choose {generatorType === 'COURSE' ? 'Course' : 'Cohort'} --</option>
                  {(generatorType === 'COURSE' ? courses : cohorts).map(c => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-2">
                  {generatorType === 'COHORT' 
                    ? "Cohort Certificates do NOT require students to finish 100% of modules. Any active payment enrollment can be instantly generated." 
                    : "Course Certificates REQUIRE students to be at 100% completion in normal scenarios to see the generate button."}
                </p>
              </div>

              {/* STEP 2: ENROLLED STUDENTS TABLE */}
              {selectedId && (
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Step 2: Paid Authenticated Students</label>
                  
                  {loadingStudents ? (
                    <div className="py-12 text-center text-gray-500">Loading student records...</div>
                  ) : enrolledStudents.length === 0 ? (
                    <div className="py-12 text-center bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                      <FiUser className="mx-auto text-gray-300 mb-2" size={32} />
                      <p className="text-sm font-medium text-gray-600">No successful enrollments found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-6 py-3 font-bold text-xs uppercase text-gray-500">Student</th>
                            <th className="px-6 py-3 font-bold text-xs uppercase text-gray-500">Completion Status</th>
                            <th className="px-6 py-3 font-bold text-xs uppercase text-gray-500">Date Marker</th>
                            <th className="px-6 py-3 font-bold text-xs uppercase text-gray-500 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {enrolledStudents.map(student => {
                            // Generator logic constraints
                            const canGenerate = generatorType === 'COHORT' || student.completionStatus === 'COMPLETED';
                            
                            return (
                              <tr key={student.userId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-gray-900 dark:text-white">{student.userName}</div>
                                  <div className="text-xs text-gray-500">{student.userEmail}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${student.completionStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' : student.completionStatus === 'ELIGIBLE' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {student.completionStatus === 'COMPLETED' ? <><FiCheckCircle className="inline mr-1" /> COMPLETED</> : student.completionStatus === 'ELIGIBLE' ? 'COHORT ELIGIBLE' : 'IN PROGRESS'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                  {student.completedAt ? new Date(student.completedAt).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {canGenerate ? (
                                    <Button 
                                      size="sm" 
                                      className={`font-bold text-white ${generatorType === 'COHORT' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                      onClick={() => handleGenerateClick(student.userId)}
                                      disabled={generatingFor === student.userId}
                                    >
                                      {generatingFor === student.userId ? 'Generating...' : 'Issue Certificate'}
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-400 font-medium italic">Ineligible</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end">
              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="font-bold">Close Manager</Button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateManager;

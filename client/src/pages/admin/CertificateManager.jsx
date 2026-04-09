import { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminTable } from '../../components/admin/AdminTable';
import { FiEdit2, FiTrash2, FiPlus, FiDownload, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';

const CertificateManager = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [formData, setFormData] = useState({
    certificateId: '', studentName: '', studentEmail: '', courseName: '',
    status: 'Issued', fileUrl: ''
  });

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/certificates');
      setCertificates(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCert(null);
    setFormData({ certificateId: `CERT-${Date.now().toString().slice(-6)}`, studentName: '', studentEmail: '', courseName: '', status: 'Issued', fileUrl: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (cert) => {
    setEditingCert(cert._id);
    setFormData({
      certificateId: cert.certificateId,
      studentName: cert.studentName,
      studentEmail: cert.studentEmail,
      courseName: cert.courseName,
      status: cert.status,
      fileUrl: cert.fileUrl
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this certificate record permanently?')) return;
    try {
      await axios.delete(`/api/admin/certificates/${id}`);
      toast.success('Certificate deleted successfully');
      fetchCertificates();
    } catch (err) {
      toast.error('Failed to delete certificate');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCert) {
        await axios.put(`/api/admin/certificates/${editingCert}`, formData);
        toast.success('Certificate updated successfully');
      } else {
        await axios.post('/api/admin/certificates', { ...formData, user: "000000000000000000000000" }); // user is required in schema, ideally link to real user
        toast.success('Certificate created successfully');
      }
      setIsModalOpen(false);
      fetchCertificates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const columns = [
    { header: 'Certificate ID', accessorKey: 'certificateId', cell: (row) => <span className="font-mono text-xs text-gray-500">{row.certificateId}</span> },
    { header: 'Student', accessorKey: 'studentName', cell: (row) => (
      <div>
        <div className="font-bold text-gray-900 dark:text-white">{row.studentName}</div>
        <div className="text-[10px] text-gray-500">{row.studentEmail}</div>
      </div>
    )},
    { header: 'Course', accessorKey: 'courseName', cell: (row) => <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{row.courseName}</span> },
    { header: 'Status', accessorKey: 'status', cell: (row) => (
      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex w-max items-center ${row.status === 'Issued' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
        {row.status === 'Issued' ? <FiCheckCircle className="mr-1" /> : <FiXCircle className="mr-1" />}
        {row.status}
      </span>
    )},
    { header: 'Issue Date', accessorKey: 'issueDate', cell: (row) => <span className="text-xs text-gray-500">{new Date(row.issueDate).toLocaleDateString()}</span> },
    { header: 'Action', accessorKey: 'actions', cell: (row) => (
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" onClick={() => openEditModal(row)}><FiEdit2 size={12} /></Button>
        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(row._id)}><FiTrash2 size={12} /></Button>
        {row.fileUrl && <a href={row.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-primary-600 dark:text-primary-400"><FiDownload size={12} /></a>}
      </div>
    )}
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <AdminTable
        title="Certificate Management"
        description="Issue, revoke, and manage student course completion certificates."
        searchPlaceholder="Search by student name or certificate ID..."
        columns={columns}
        data={certificates}
        loading={loading}
        renderActions={() => (
          <Button className="font-bold flex items-center bg-primary-600 hover:bg-primary-700 text-white" onClick={openAddModal}>
            <FiPlus className="mr-2" /> Issue Certificate
          </Button>
        )}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">{editingCert ? 'Edit Certificate' : 'Issue Certificate'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Certificate ID</label>
                    <input type="text" required value={formData.certificateId} onChange={e => setFormData({...formData, certificateId: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm">
                      <option value="Issued">Issued</option>
                      <option value="Revoked">Revoked</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Student Name</label>
                  <input type="text" required value={formData.studentName} onChange={e => setFormData({...formData, studentName: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Student Email</label>
                  <input type="email" required value={formData.studentEmail} onChange={e => setFormData({...formData, studentEmail: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Course Name</label>
                  <input type="text" required value={formData.courseName} onChange={e => setFormData({...formData, courseName: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Certificate File URL (PDF/Image)</label>
                  <input type="url" required value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" />
                </div>

                <div className="pt-4 flex border-t border-gray-100 dark:border-gray-800 space-x-3 mt-6">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-700 text-white">{editingCert ? 'Update' : 'Issue'}</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateManager;

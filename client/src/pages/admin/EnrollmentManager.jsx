import { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminTable } from '../../components/admin/AdminTable';
import { FiDownload } from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';

const EnrollmentManager = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/enrollments');
      const formatted = res.data.data.map(en => ({
        id: en._id,
        student: en.fullName || en.user?.name || 'Unknown',
        email: en.email || en.user?.email || '-',
        phone: en.phone || '-',
        course: en.liveCourse?.title || en.course?.title || 'Unknown Course',
        status: en.status,
        date: en.createdAt
      }));
      setEnrollments(formatted);
    } catch (err) {
      toast.error('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Student Name', 'Email', 'Phone', 'Course', 'Status', 'Date'];
    const rows = enrollments.map(e => [
      `"${e.student}"`, `"${e.email}"`, `"${e.phone}"`, `"${e.course}"`, e.status, new Date(e.date).toLocaleDateString()
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `enrollments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { header: 'Student', accessorKey: 'student', cell: (row) => (
      <div>
        <div className="font-bold text-gray-900 dark:text-white">{row.student}</div>
        <div className="text-[10px] text-gray-500">{row.email} | {row.phone}</div>
      </div>
    )},
    { header: 'Course', accessorKey: 'course', cell: (row) => <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{row.course}</span> },
    { header: 'Status', accessorKey: 'status', cell: (row) => (
      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${row.status === 'active' || row.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
        {row.status === 'active' ? 'ENROLLED' : row.status}
      </span>
    )},
    { header: 'Enrollment Date', accessorKey: 'date', cell: (row) => <span className="text-xs text-gray-500">{new Date(row.date).toLocaleDateString()}</span> }
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <AdminTable
        title="Enrollment Monitoring"
        description="Monitor all student enrollments across active live cohorts and courses."
        searchPlaceholder="Search by student name or course..."
        columns={columns}
        data={enrollments}
        loading={loading}
        renderActions={() => (
          <Button variant="outline" className="font-bold" onClick={exportCSV} disabled={enrollments.length === 0}>
            <FiDownload className="mr-2" /> Export CSV
          </Button>
        )}
      />
    </div>
  );
};

export default EnrollmentManager;

import { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminTable } from '../../components/admin/AdminTable';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PaymentManager = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/enrollments');
      const formatted = res.data.data.map(en => ({
        id: en.paymentId || `pay_mock_${en._id.substring(0, 5)}`,
        student: en.fullName || en.user?.name || 'Unknown',
        email: en.email || en.user?.email || '-',
        course: en.liveCourse?.title || en.course?.title || 'Unknown Course',
        amount: en.amount || 0,
        status: en.status === 'active' ? 'success' : en.status,
        date: en.createdAt
      }));
      setPayments(formatted);
    }// eslint-disable-next-line no-unused-vars
     catch (err) {
      toast.error('Failed to load payments data');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: 'Transaction ID', accessorKey: 'id', cell: (row) => <span className="font-mono text-xs text-gray-500">{row.id}</span> },
    { header: 'Student', accessorKey: 'student', cell: (row) => (
      <div>
        <div className="font-bold text-gray-900 dark:text-white">{row.student}</div>
        <div className="text-[10px] text-gray-500">{row.email}</div>
      </div>
    )},
    { header: 'Product / Course', accessorKey: 'course', cell: (row) => <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-50 block">{row.course}</span> },
    { header: 'Amount', accessorKey: 'amount', cell: (row) => <span className="font-black text-gray-900 dark:text-white">₹{row.amount}</span> },
    { header: 'Date', accessorKey: 'date', cell: (row) => <span className="text-gray-500 text-xs">{new Date(row.date).toLocaleDateString()}</span> },
    { header: 'Status', accessorKey: 'status', cell: (row) => (
      <span className={`px-2 py-1 rounded text-xs font-bold flex w-max items-center ${row.status === 'success' || row.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
        {row.status === 'success' || row.status === 'completed' ? <FiCheckCircle className="mr-1" /> : <FiXCircle className="mr-1" />}
        {row.status.toUpperCase()}
      </span>
    )}
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <AdminTable
        title="Payment Operations & Revenue"
        description="Globally track Razorpay webhook transactions and payment verifications."
        searchPlaceholder="Trace by Transaction ID (pay_xx) or Student..."
        columns={columns}
        data={payments}
        loading={loading}
      />
    </div>
  );
};

export default PaymentManager;

import { useState, useEffect } from 'react';
import {
  FiPlus, FiTrash2, FiEdit2, FiDownload, FiFileText, FiFilter
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { formatINR } from './FinancialSummaryCards';
import { cn } from '../../../lib/utils';
import axios from 'axios';

const CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'venue', label: 'Venue & Facilities' },
  { value: 'software_tools', label: 'Software & Tools' },
  { value: 'certificates', label: 'Certificates & Printing' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'printing', label: 'General Printing' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const ExpenseManager = ({ courses = [] }) => {
  const [activeTab, setActiveTab] = useState('resource_person');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'resource_person' 
        ? '/api/admin/expenses/resource-person' 
        : '/api/admin/expenses/other';
      const res = await axios.get(endpoint);
      setExpenses(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [activeTab]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      const endpoint = activeTab === 'resource_person' 
        ? `/api/admin/expenses/resource-person/${id}` 
        : `/api/admin/expenses/other/${id}`;
      await axios.delete(endpoint);
      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete expense');
    }
  };

  const filteredExpenses = expenses.filter(e => {
    if (filterType === 'all') return true;
    return e.courseType === filterType;
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
      {/* Header & Tabs */}
      <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto">
          {['resource_person', 'other'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all',
                activeTab === tab
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {tab === 'resource_person' ? 'Resource Persons' : 'Other Expenses'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
           <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="all">All Types</option>
            <option value="live">Live Courses</option>
            <option value="self-paced">Self-Paced</option>
          </select>
          <button
            onClick={() => toast('Expense modal coming soon')} // Placeholder for Add Expense Modal logic
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-primary-500/20"
          >
            <FiPlus size={16} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3" />
            <p>Loading expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FiFilter size={32} className="mb-3 text-gray-300 dark:text-gray-700" />
            <p>No expenses found in this category.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">
                  {activeTab === 'resource_person' ? 'Person Name' : 'Title'}
                </th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
              {filteredExpenses.map((expense) => {
                const date = activeTab === 'resource_person' ? expense.paymentDate : expense.date;
                const courseName = expense.courseType === 'live' 
                  ? expense.liveCourse?.title 
                  : expense.course?.title;

                return (
                  <tr key={expense._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                      {new Date(date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                          {courseName || '—'}
                        </span>
                        <span className="text-[10px] uppercase text-gray-400">
                          {expense.courseType}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {activeTab === 'resource_person' ? expense.resourcePersonName : expense.title}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                      {formatINR(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {activeTab === 'resource_person' ? (
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            expense.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          )}>
                            {expense.status}
                          </span>
                          <span className="truncate max-w-[120px]">{expense.paymentMethod}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">
                            {expense.category.replace('_', ' ')}
                          </span>
                          {expense.receiptUrl && (
                            <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline flex items-center gap-1">
                              <FiFileText size={12}/> Receipt
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors">
                          <FiEdit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(expense._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <FiTrash2 size={14} />
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
  );
};

export default ExpenseManager;

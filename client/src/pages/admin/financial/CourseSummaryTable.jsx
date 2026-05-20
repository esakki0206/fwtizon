import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiChevronDown, FiChevronUp, FiSearch,
  FiArrowUp, FiArrowDown, FiFilter,
} from 'react-icons/fi';
import { cn } from '../../../lib/utils';
import { formatINR, formatPercent } from './FinancialSummaryCards';

// ─── Sort helper ──────────────────────────────────────────────────────────────
const SORT_FIELDS = [
  { key: 'courseName', label: 'Name' },
  { key: 'grossRevenue', label: 'Revenue' },
  { key: 'finalProfit', label: 'Profit' },
  { key: 'totalEnrollments', label: 'Enrollments' },
  { key: 'profitMarginPercent', label: 'Margin %' },
  { key: 'lastPaymentDate', label: 'Last Payment' },
];

// ─── Expanded row detail ──────────────────────────────────────────────────────
const CourseDetailPanel = ({ course }) => {
  const rows = [
    { label: 'Paid Enrollments', value: course.paidEnrollments ?? 0 },
    { label: 'Free Enrollments', value: course.freeEnrollments ?? 0 },
    { label: 'Admin Enrollments', value: course.adminEnrollments ?? 0 },
    { label: 'Auto Enrollments', value: course.autoEnrollments ?? 0 },
    { label: 'Course Price', value: formatINR(course.coursePrice) },
    { label: 'Gross Revenue', value: formatINR(course.grossRevenue) },
    { label: 'Total Discounts', value: formatINR(course.totalDiscounts) },
    { label: 'Total Refunded', value: formatINR(course.totalRefunded) },
    { label: 'Net Revenue', value: formatINR(course.netRevenue) },
    { label: 'RP Expenses', value: formatINR(course.resourcePersonExpense) },
    { label: 'Other Expenses', value: formatINR(course.otherExpenses) },
    { label: 'Total Expenses', value: formatINR(course.totalExpenses) },
    { label: 'Final Profit', value: formatINR(course.finalProfit), highlight: true },
    { label: 'Profit Margin', value: formatPercent(course.profitMarginPercent), highlight: true },
  ];

  return (
    <motion.tr
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <td colSpan={8} className="px-0 py-0">
        <div className="bg-gray-50 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800 px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {rows.map((row) => (
              <div key={row.label} className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {row.label}
                </p>
                <p
                  className={cn(
                    'text-sm font-semibold',
                    row.highlight
                      ? (parseFloat(String(row.value).replace(/[^0-9.-]/g, '')) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400')
                      : 'text-gray-900 dark:text-white'
                  )}
                >
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </td>
    </motion.tr>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const normalized = String(status).toLowerCase();
  const colorMap = {
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    ongoing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    hidden: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  };
  const color = colorMap[normalized] || colorMap.draft;
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', color)}>
      {status}
    </span>
  );
};

// ─── Profit indicator ─────────────────────────────────────────────────────────
const ProfitIndicator = ({ value }) => {
  if (value == null || isNaN(value)) return <span className="text-gray-400">—</span>;
  const isPositive = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-sm font-bold',
        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      )}
    >
      {isPositive ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
      {formatINR(Math.abs(value))}
    </span>
  );
};

/**
 * Course financial summary table with search, sort, filter, and expandable rows.
 * @param {{ courses: Array, loading: boolean }} props
 */
const CourseSummaryTable = ({ courses = [], loading }) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('grossRevenue');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all'); // all | self-paced | live

  // Filter & sort
  const processedCourses = useMemo(() => {
    let result = [...courses];

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((c) => c.courseType === typeFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        (c.courseName || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [courses, search, sortField, sortDir, typeFilter]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <FiArrowUp size={10} /> : <FiArrowDown size={10} />;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-5 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          Course Financial Summary ({processedCourses.length})
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {['all', 'self-paced', 'live'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all',
                  typeFilter === type
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                )}
              >
                {type === 'all' ? 'All' : type === 'self-paced' ? 'Self-Paced' : 'Live'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-0 max-w-[200px]">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <th className="px-4 py-3 w-8" />
              <th
                className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                onClick={() => toggleSort('courseName')}
              >
                <span className="flex items-center gap-1">
                  Course <SortIcon field="courseName" />
                </span>
              </th>
              <th className="px-4 py-3 hidden lg:table-cell">Type</th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                onClick={() => toggleSort('totalEnrollments')}
              >
                <span className="flex items-center gap-1">
                  Enroll. <SortIcon field="totalEnrollments" />
                </span>
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                onClick={() => toggleSort('grossRevenue')}
              >
                <span className="flex items-center gap-1">
                  Revenue <SortIcon field="grossRevenue" />
                </span>
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none hidden md:table-cell"
                onClick={() => toggleSort('totalExpenses')}
              >
                <span className="flex items-center gap-1">
                  Expenses <SortIcon field="totalExpenses" />
                </span>
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                onClick={() => toggleSort('finalProfit')}
              >
                <span className="flex items-center gap-1">
                  Profit <SortIcon field="finalProfit" />
                </span>
              </th>
              <th className="px-4 py-3 hidden xl:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
            <AnimatePresence>
              {processedCourses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <FiFilter className="mx-auto mb-2 text-gray-300 dark:text-gray-700\" size={28} />
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      {search ? 'No courses match your search.' : 'No course financial data available yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                processedCourses.map((course) => {
                  const isExpanded = expandedId === course.courseId;
                  return (
                    <motion.tbody key={course.courseId} layout>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : course.courseId)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <FiChevronDown size={14} className="text-gray-400" />
                          </motion.div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[220px]">
                            {course.courseName}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={cn(
                            'inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            course.courseType === 'live'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                          )}>
                            {course.courseType === 'live' ? 'Live' : 'Self-Paced'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {course.totalEnrollments ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatINR(course.grossRevenue)}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {formatINR(course.totalExpenses)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ProfitIndicator value={course.finalProfit} />
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <StatusBadge status={course.courseStatus} />
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && <CourseDetailPanel course={course} />}
                      </AnimatePresence>
                    </motion.tbody>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CourseSummaryTable;

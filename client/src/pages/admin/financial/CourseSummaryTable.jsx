import { useState, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiChevronDown, FiSearch, FiArrowUp, FiArrowDown, FiFilter,
} from 'react-icons/fi';
import { cn } from '../../../lib/utils';
import { formatINR } from './FinancialSummaryCards';

// ─── Expanded detail row ──────────────────────────────────────────────────────
const CourseDetailRow = ({ course, colSpan }) => {
  const fields = [
    { label: 'Paid Enroll.',   value: course.paidEnrollments  ?? 0 },
    { label: 'Free Enroll.',   value: course.freeEnrollments  ?? 0 },
    { label: 'Admin Enroll.',  value: course.adminEnrollments ?? 0 },
    { label: 'Course Price',   value: formatINR(course.coursePrice) },
    { label: 'Revenue',        value: formatINR(course.revenue) },
    { label: 'Expenses',       value: formatINR(course.expenses) },
    {
      label: 'Profit',
      value: formatINR(course.profit),
      isHighlight: true,
      isNegative: course.profit < 0,
    },
    {
      label: 'Last Payment',
      value: course.lastPaymentDate
        ? new Date(course.lastPaymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
    },
  ];

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          className="overflow-hidden bg-gray-50 dark:bg-gray-800/40 border-y border-gray-100 dark:border-gray-800 px-6 py-4"
        >
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 xl:grid-cols-8 gap-x-4 gap-y-3">
            {fields.map((f) => (
              <div key={f.label} className="space-y-0.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {f.label}
                </p>
                <p className={cn(
                  'text-xs font-semibold',
                  f.isHighlight
                    ? f.isNegative
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-900 dark:text-white'
                )}>
                  {f.value}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </td>
    </tr>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    ongoing:   'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
    completed: 'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',
    draft:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    hidden:    'bg-gray-100   text-gray-500   dark:bg-gray-800      dark:text-gray-500',
    cancelled: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  };
  const color = map[String(status).toLowerCase()] || map.draft;
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide', color)}>
      {status}
    </span>
  );
};

// ─── Profit cell ──────────────────────────────────────────────────────────────
const ProfitCell = ({ value }) => {
  if (value == null || isNaN(value)) return <span className="text-gray-400">—</span>;
  const isPos = value >= 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-sm font-bold',
      isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
    )}>
      {isPos ? <FiArrowUp size={11} /> : <FiArrowDown size={11} />}
      {formatINR(Math.abs(value))}
    </span>
  );
};

// ─── Sort header helper ───────────────────────────────────────────────────────
const SortTh = ({ field, label, sortField, sortDir, onSort, className }) => (
  <th
    className={cn('px-4 py-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors', className)}
    onClick={() => onSort(field)}
  >
    <span className="flex items-center gap-1">
      {label}
      {sortField === field && (sortDir === 'asc' ? <FiArrowUp size={10} /> : <FiArrowDown size={10} />)}
    </span>
  </th>
);

const PAGE_SIZE = 15;

const CourseSummaryTable = ({ courses = [], loading }) => {
  const [search,     setSearch]     = useState('');
  const [sortField,  setSortField]  = useState('revenue');
  const [sortDir,    setSortDir]    = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [page,       setPage]       = useState(1);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const processed = useMemo(() => {
    let res = [...courses];
    if (typeFilter !== 'all') res = res.filter((c) => c.courseType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((c) => (c.courseName || '').toLowerCase().includes(q));
    }
    res.sort((a, b) => {
      const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return res;
  }, [courses, search, sortField, sortDir, typeFilter]);

  const totalPages  = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated   = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="h-5 w-52 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const sortProps = { sortField, sortDir, onSort: toggleSort };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-5 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          Course Financial Summary
          <span className="ml-2 text-xs font-normal text-gray-500">({processed.length} courses)</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type pills */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {[['all', 'All'], ['self-paced', 'Self-Paced'], ['live', 'Live']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => { setTypeFilter(val); setPage(1); }}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all',
                  typeFilter === val
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                )}
              >
                {lbl}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative max-w-[200px]">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search courses…"
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <th className="px-4 py-3 w-8" />
              <SortTh field="courseName"        label="Course"     {...sortProps} />
              <th className="px-4 py-3 hidden lg:table-cell">Type</th>
              <SortTh field="totalEnrollments"  label="Enroll."    {...sortProps} />
              <SortTh field="revenue"           label="Revenue"    {...sortProps} />
              <SortTh field="expenses"          label="Expenses"   {...sortProps} className="hidden md:table-cell" />
              <SortTh field="profit"            label="Profit"     {...sortProps} />
              <th className="px-4 py-3 hidden xl:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-14 text-center">
                  <FiFilter className="mx-auto mb-2 text-gray-300 dark:text-gray-700" size={26} />
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {search ? 'No courses match your search.' : 'No course financial data available yet.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginated.map((course) => {
                const isExp = expandedId === course.courseId;
                return (
                  <Fragment key={course.courseId}>
                    <tr
                      onClick={() => setExpandedId(isExp ? null : course.courseId)}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <motion.div animate={{ rotate: isExp ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <FiChevronDown size={13} className="text-gray-400" />
                        </motion.div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                          {course.courseName}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                          course.courseType === 'live'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                        )}>
                          {course.courseType === 'live' ? 'Live' : 'Self-Paced'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 text-sm">
                        {course.totalEnrollments ?? 0}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white text-sm">
                        {formatINR(course.revenue)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600 dark:text-gray-400">
                        {formatINR(course.expenses)}
                      </td>
                      <td className="px-4 py-3">
                        <ProfitCell value={course.profit} />
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <StatusBadge status={course.courseStatus} />
                      </td>
                    </tr>
                    <AnimatePresence>
                      {isExp && <CourseDetailRow course={course} colSpan={8} />}
                    </AnimatePresence>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, processed.length)} of {processed.length}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ‹ Prev
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseSummaryTable;

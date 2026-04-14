import { useState } from 'react';
import { FiDownload, FiChevronDown } from 'react-icons/fi';
import { exportData } from '../../lib/services/adminAnalytics';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

/**
 * ExportButton — dropdown export button for CSV.
 *
 * Props:
 *  - from       : string — ISO date range start
 *  - to         : string — ISO date range end
 *  - className  : string
 */
const ExportButton = ({ from, to, className }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExport = async (type) => {
    setLoading(true);
    setOpen(false);
    try {
      await exportData({ type, from, to });
      toast.success(`${type} data exported successfully`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error(`Failed to export ${type} data`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-600/20 transition-colors disabled:opacity-50"
      >
        <FiDownload size={14} />
        {loading ? 'Exporting…' : 'Export CSV'}
        <FiChevronDown size={14} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl z-50 py-1.5">
            {[
              { type: 'users', label: 'Users Data' },
              { type: 'enrollments', label: 'Enrollments Data' },
              { type: 'revenue', label: 'Revenue Data' },
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => handleExport(item.type)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;

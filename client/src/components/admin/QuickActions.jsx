import { useNavigate } from 'react-router-dom';
import { FiUserPlus, FiShield, FiBarChart2, FiDownload, FiBookOpen, FiUsers } from 'react-icons/fi';
import { cn } from '../../lib/utils';

const ACTIONS = [
  { label: 'Add User',       icon: <FiUserPlus size={16} />,  path: '/admin/students',     color: 'text-emerald-600 dark:text-emerald-400',  bg: 'bg-emerald-50 dark:bg-emerald-900/20  hover:bg-emerald-100 dark:hover:bg-emerald-900/40' },
  { label: 'Manage Users',   icon: <FiUsers size={16} />,     path: '/admin/students',     color: 'text-blue-600 dark:text-blue-400',        bg: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40' },
  { label: 'View Reports',   icon: <FiBarChart2 size={16} />, path: '/admin/analytics',    color: 'text-indigo-600 dark:text-indigo-400',    bg: 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40' },
  { label: 'Export Data',    icon: <FiDownload size={16} />,  action: 'export',            color: 'text-amber-600 dark:text-amber-400',      bg: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40' },
  { label: 'Manage Courses', icon: <FiBookOpen size={16} />,  path: '/admin/courses',      color: 'text-purple-600 dark:text-purple-400',    bg: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40' },
];

/**
 * QuickActions — horizontal row of action buttons for common admin tasks.
 *
 * Props:
 *  - onExport   : () => void — handler for export action
 *  - className  : string
 */
const QuickActions = ({ onExport, className }) => {
  const navigate = useNavigate();

  const handleClick = (action) => {
    if (action.path) {
      navigate(action.path);
    } else if (action.action === 'export' && onExport) {
      onExport();
    }
  };

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4', className)}>
      <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
        Quick Actions
      </h3>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => handleClick(action)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
              action.bg, action.color
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;

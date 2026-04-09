import { cn } from '../../lib/utils';

const TONE_MAP = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  neutral: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

/**
 * AdminBadge — small pill used for status / role labels.
 */
export const AdminBadge = ({ tone = 'default', dot = false, className, children }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider whitespace-nowrap',
        TONE_MAP[tone] || TONE_MAP.default,
        className
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
};

export default AdminBadge;

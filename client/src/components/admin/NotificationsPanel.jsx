import { useState, useEffect, useCallback } from 'react';
import { FiBell, FiAlertTriangle, FiInfo, FiCheckCircle, FiX } from 'react-icons/fi';
import { getAdminNotifications, markNotificationRead } from '../../lib/services/adminAnalytics';
import { cn } from '../../lib/utils';

const TYPE_CONFIG = {
  warning:  { icon: <FiAlertTriangle size={14} />, color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-l-amber-400' },
  danger:   { icon: <FiAlertTriangle size={14} />, color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-l-red-400' },
  system:   { icon: <FiInfo size={14} />,          color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-l-blue-400' },
  success:  { icon: <FiCheckCircle size={14} />,   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-l-emerald-400' },
  info:     { icon: <FiInfo size={14} />,          color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',  border: 'border-l-indigo-400' },
};

/**
 * NotificationsPanel — admin notification sidebar widget.
 *
 * Props:
 *  - className : string
 */
const NotificationsPanel = ({ className }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await getAdminNotifications();
      setNotifications(result.data || []);
      setUnreadCount(result.unreadCount || 0);
    } catch (err) {
      console.error('Notifications error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 120000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleDismiss = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setUnreadCount(prev => Math.max(prev - 1, 0));
    } catch (err) {
      console.error('Mark notification read error:', err);
    }
  };

  if (loading) {
    return (
      <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5', className)}>
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-shimmer mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden', className)}>
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <FiBell size={16} className="text-gray-400" />
      </div>

      <div className="overflow-y-auto max-h-80 divide-y divide-gray-50 dark:divide-gray-800/60">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <FiCheckCircle size={24} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-xs text-gray-500 font-medium">All clear — no alerts</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
            return (
              <div
                key={notification._id}
                className={cn(
                  'flex items-start gap-3 px-5 py-3 border-l-2 transition-colors',
                  config.border,
                  !notification.isRead && 'bg-gray-50/50 dark:bg-gray-800/20'
                )}
              >
                <div className={cn('shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5', config.bg)}>
                  <span className={config.color}>{config.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                    {new Date(notification.createdAt).toLocaleString('en-IN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => handleDismiss(notification._id)}
                    className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Dismiss"
                  >
                    <FiX size={12} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;

import { useState, useEffect, useCallback, useRef } from 'react';
import { FiUserPlus, FiLogIn, FiBookOpen, FiStar, FiFileText, FiRefreshCw } from 'react-icons/fi';
import { getActivityFeed } from '../../lib/services/adminAnalytics';
import { cn } from '../../lib/utils';

const ACTIVITY_CONFIG = {
  registration: { icon: <FiUserPlus size={14} />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  login:        { icon: <FiLogIn size={14} />,    color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
  enrollment:   { icon: <FiBookOpen size={14} />,  color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  review:       { icon: <FiStar size={14} />,      color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  course_created: { icon: <FiFileText size={14} />, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
};

/**
 * Format a timestamp into a relative time string.
 */
const timeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

/**
 * ActivityFeed — real-time activity panel showing latest platform actions.
 * Auto-refreshes every 60 seconds.
 *
 * Props:
 *  - maxItems   : number — max items to display (default 15)
 *  - className  : string
 */
const ActivityFeed = ({ maxItems = 15, className }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchFeed = useCallback(async () => {
    try {
      const result = await getActivityFeed({ page: 1, limit: maxItems });
      setActivities(result.data || []);
      setError(null);
    } catch (err) {
      console.error('Activity feed error:', err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    fetchFeed();
    // Auto-refresh every 60 seconds
    intervalRef.current = setInterval(fetchFeed, 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchFeed]);

  if (loading) {
    return (
      <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5', className)}>
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-shimmer mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 animate-shimmer" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-800 rounded animate-shimmer" />
                <div className="h-2.5 w-1/3 bg-gray-100 dark:bg-gray-800 rounded animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden', className)}>
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Activity Feed</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Real-time platform activity</p>
        </div>
        <button
          onClick={fetchFeed}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <FiRefreshCw size={14} />
        </button>
      </div>

      <div className="overflow-y-auto max-h-96 divide-y divide-gray-50 dark:divide-gray-800/60">
        {error ? (
          <div className="p-5 text-center text-sm text-red-500">{error}</div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No recent activity</div>
        ) : (
          activities.map((activity) => {
            const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.registration;
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
              >
                <div className={cn('shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5', config.bg)}>
                  <span className={config.color}>{config.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                    {activity.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                    {timeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;

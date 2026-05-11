import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiTrendingUp, FiTrendingDown, FiUsers, FiClock,
  FiStar, FiBookOpen, FiPercent, FiDollarSign,
} from 'react-icons/fi';
import AnalyticsChart from '../../components/admin/AnalyticsChart';
import DateRangeFilter from '../../components/admin/DateRangeFilter';
import ExportButton from '../../components/admin/ExportButton';
import { getAdvancedAnalytics } from '../../lib/services/adminAnalytics';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

/**
 * Format INR currency.
 */
const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

/**
 * SmallMetricCard — compact metric card for the advanced metrics row.
 */
const SmallMetricCard = ({ icon, label, value, sub, color = 'text-indigo-600' }) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-2 mb-2">
      <span className={cn('p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800', color)}>{icon}</span>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-xl font-black text-gray-900 dark:text-white">{value}</p>
    {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDays, setActiveDays] = useState(365);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Compute actual from/to dates
  const dateRange = useMemo(() => {
    if (customFrom || customTo) {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    if (activeDays === null) return {};
    if (activeDays === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return { from: today, to: today };
    }
    const from = new Date();
    from.setDate(from.getDate() - activeDays);
    return { from: from.toISOString().slice(0, 10) };
  }, [activeDays, customFrom, customTo]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdvancedAnalytics(dateRange);
      setData(result);
    } catch (err) {
      console.error('Advanced analytics error:', err);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePreset = (days) => {
    setActiveDays(days);
    setCustomFrom('');
    setCustomTo('');
  };

  const handleCustom = (from, to) => {
    setCustomFrom(from);
    setCustomTo(to);
    setActiveDays(-1); // Deselect presets
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Advanced Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Deep platform insights and performance metrics
          </p>
        </div>
        <ExportButton from={dateRange.from} to={dateRange.to} />
      </div>

      {/* ── Date Range Filter ── */}
      <DateRangeFilter
        activeDays={activeDays}
        from={customFrom}
        to={customTo}
        onPreset={handlePreset}
        onCustom={handleCustom}
      />

      {/* ── Advanced Metrics Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SmallMetricCard
          icon={<FiPercent size={14} />}
          label="Retention Rate"
          value={`${data?.retentionRate ?? 0}%`}
          sub="active this month"
          color="text-emerald-600 dark:text-emerald-400"
        />
        <SmallMetricCard
          icon={<FiTrendingDown size={14} />}
          label="Churn Rate"
          value={`${data?.churnRate ?? 0}%`}
          sub="inactive users"
          color="text-red-500"
        />
        <SmallMetricCard
          icon={<FiDollarSign size={14} />}
          label="Avg Revenue/User"
          value={formatINR(data?.avgRevenuePerUser || 0)}
          sub="lifetime average"
          color="text-indigo-600 dark:text-indigo-400"
        />
        <SmallMetricCard
          icon={<FiClock size={14} />}
          label="Peak Hour"
          value={data?.peakHour || 'N/A'}
          sub="most logins"
          color="text-amber-600 dark:text-amber-400"
        />
        <SmallMetricCard
          icon={<FiStar size={14} />}
          label="Top User"
          value={data?.mostActiveUsers?.[0]?.name || 'N/A'}
          sub={data?.mostActiveUsers?.[0] ? `${data.mostActiveUsers[0].enrollmentCount} enrollments` : ''}
          color="text-purple-600 dark:text-purple-400"
        />
        <SmallMetricCard
          icon={<FiBookOpen size={14} />}
          label="Top Course"
          value={data?.mostPopularCourses?.[0]?.title?.slice(0, 16) || 'N/A'}
          sub={data?.mostPopularCourses?.[0] ? `${data.mostPopularCourses[0].enrollmentCount} students` : ''}
          color="text-cyan-600 dark:text-cyan-400"
        />
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* User Growth */}
        <AnalyticsChart
          title="User Growth"
          description="Monthly new registrations"
          type="line"
          data={data?.userGrowth || []}
          dataKey="users"
          xKey="label"
          color="#6366f1"
          loading={loading}
          valueLabel="New Users"
          gradientId="userGrowthGrad"
        />

        {/* Daily Active Users */}
        <AnalyticsChart
          title="Daily Active Users"
          description="Last 30 days login activity"
          type="area"
          data={data?.dailyActiveUsers || []}
          dataKey="users"
          xKey="label"
          color="#10b981"
          loading={loading}
          valueLabel="Active Users"
          gradientId="dauGrad"
        />

        {/* Revenue by Period */}
        <AnalyticsChart
          title="Revenue Trend"
          description="Monthly payment volume"
          type="area"
          data={data?.revenueByPeriod || []}
          dataKey="revenue"
          xKey="label"
          color="#f59e0b"
          loading={loading}
          valuePrefix="₹"
          valueLabel="Revenue"
          gradientId="revTrendGrad"
          badge={
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-md">
              {data?.revenueByPeriod?.length || 0} {data?.useDaily ? 'days' : 'months'}
            </span>
          }
        />

        {/* Course Enrollment Trends */}
        <AnalyticsChart
          title="Enrollment Trends"
          description="Monthly course enrollments"
          type="bar"
          data={data?.enrollmentTrends || []}
          dataKey="enrollments"
          xKey="label"
          color="#8b5cf6"
          loading={loading}
          valueLabel="Enrollments"
          gradientId="enrollTrendGrad"
        />

        {/* Login Frequency */}
        <AnalyticsChart
          title="Login Frequency"
          description="Distribution by hour of day"
          type="bar"
          data={data?.loginFrequency || []}
          dataKey="logins"
          xKey="hour"
          color="#06b6d4"
          loading={loading}
          valueLabel="Logins"
          height={220}
        />

        {/* Revenue per Transaction */}
        <AnalyticsChart
          title="Transactions per Period"
          description="Monthly payment transactions"
          type="line"
          data={data?.revenueByPeriod || []}
          dataKey="transactions"
          xKey="label"
          color="#ec4899"
          loading={loading}
          valueLabel="Transactions"
          height={220}
        />
      </div>

      {/* ── Leaderboard Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Most Active Users */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Most Active Users</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">By enrollment count</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 animate-shimmer" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded animate-shimmer" />
                    <div className="h-2.5 w-1/3 bg-gray-100 dark:bg-gray-800 rounded animate-shimmer" />
                  </div>
                </div>
              ))
            ) : data?.mostActiveUsers?.length > 0 ? (
              data.mostActiveUsers.map((user, idx) => (
                <div key={user._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="relative">
                    <img
                      src={user.avatar && !user.avatar.includes('default_avatar')
                        ? user.avatar
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff&size=64`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                    <span className={cn(
                      'absolute -top-1 -left-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white',
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-700/70'
                    )}>
                      {idx + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md">
                    {user.enrollmentCount}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-gray-400">No data yet</div>
            )}
          </div>
        </div>

        {/* Most Popular Courses */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Most Popular Courses</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">By enrollment count</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-10 h-7 rounded bg-gray-100 dark:bg-gray-800 animate-shimmer" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded animate-shimmer" />
                    <div className="h-2.5 w-1/3 bg-gray-100 dark:bg-gray-800 rounded animate-shimmer" />
                  </div>
                </div>
              ))
            ) : data?.mostPopularCourses?.length > 0 ? (
              data.mostPopularCourses.map((course, idx) => (
                <div key={course._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-black shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{course.title}</p>
                    <p className="text-[10px] text-gray-400">{formatINR(course.revenue)} revenue</p>
                  </div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md">
                    {course.enrollmentCount} students
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-gray-400">No data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;

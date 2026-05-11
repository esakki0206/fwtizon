import { useState, useEffect, useCallback } from 'react';
import {
  FiUsers, FiBookOpen, FiVideo, FiTrendingUp,
  FiCheckSquare, FiFileText, FiAward, FiActivity,
  FiUserPlus, FiZap, FiLink,
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import StatCard from '../../components/admin/StatCard';
import QuickActions from '../../components/admin/QuickActions';
import ActivityFeed from '../../components/admin/ActivityFeed';
import NotificationsPanel from '../../components/admin/NotificationsPanel';
import { getAnalytics } from '../../lib/services/adminAnalytics';
import { exportData } from '../../lib/services/adminAnalytics';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

/**
 * Format INR currency.
 */
const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async () => {
    try {
      await exportData({ type: 'users' });
      toast.success('Export downloaded successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export data');
    }
  };

  // ── Skeleton Loading State ──
  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="h-7 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-shimmer" />
          <div className="h-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-shimmer" />
        </div>
      </div>
    );
  }

  const revenueChartData = analytics?.monthlyRevenue?.map(item => ({
    name: item.month,
    revenue: Math.round(item.revenue || 0),
    enrollments: item.enrollments || 0,
  })) || [];

  const enrollmentChartData = analytics?.monthlyEnrollments?.map(item => ({
    name: item.month,
    students: item.students,
  })) || [];

  const categoryData = analytics?.categoryDistribution?.map(item => ({
    name: item._id || 'Other',
    value: item.count,
  })) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Platform Overview
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Real-time analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {analytics?.systemHealth && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {analytics.systemHealth.status === 'operational' ? 'All Systems Operational' : 'Issues Detected'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Metric Cards — Row 1 (Primary) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={analytics?.totalRevenue || 0}
          prefix="₹"
          icon={<FiTrendingUp size={20} />}
          trend={analytics?.trends?.revenue}
          gradient="indigo"
        />
        <StatCard
          title="Total Students"
          value={analytics?.totalStudents || 0}
          icon={<FiUsers size={20} />}
          trend={analytics?.trends?.students}
          gradient="emerald"
        />
        <StatCard
          title="Active Users"
          value={analytics?.activeUsers?.today || 0}
          icon={<FiActivity size={20} />}
          trend={null}
          trendLabel="active today"
          gradient="cyan"
        />
        <StatCard
          title="New Registrations"
          value={analytics?.newRegistrations?.today || 0}
          icon={<FiUserPlus size={20} />}
          trend={null}
          trendLabel="today"
          gradient="purple"
        />
      </div>

      {/* ── Metric Cards — Row 2 (Secondary) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Courses"
          value={analytics?.totalCourses || 0}
          icon={<FiBookOpen size={20} />}
          gradient="amber"
          compact
        />
        <StatCard
          title="Enrollments"
          value={analytics?.totalEnrollments || 0}
          icon={<FiCheckSquare size={20} />}
          trend={analytics?.trends?.enrollments}
          gradient="sky"
          compact
        />
        <StatCard
          title="Live Courses"
          value={analytics?.activeLiveCourses || 0}
          icon={<FiVideo size={20} />}
          gradient="rose"
          compact
        />
        <StatCard
          title="Completion Rate"
          value={analytics?.completionRate ?? 0}
          suffix="%"
          icon={<FiAward size={20} />}
          gradient="slate"
          compact
        />
      </div>

      {/* ── Quick Actions ── */}
      <QuickActions onExport={handleExport} />

      {/* ── Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Revenue Overview</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Monthly revenue in ₹ INR</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-md">
              {formatINR(analytics?.totalRevenue)}
            </span>
          </div>
          <div className="h-64 w-full" style={{ minWidth: 0 }}>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.4} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(val) => {
                    if (val >= 1000000) return `₹${(val / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
                    if (val >= 1000) return `₹${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`;
                    return `₹${val}`;
                  }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '10px', color: '#fff', fontSize: '12px', padding: '10px 14px' }}
                    formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                <div className="text-center">
                  <FiTrendingUp size={28} className="mx-auto mb-2 opacity-50" />
                  <p>No revenue data yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enrollment Bar Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Enrollments</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Monthly enrollment activity</p>
          </div>
          <div className="h-52 w-full">
            {enrollmentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentChartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: '#f3f4f6', opacity: 0.15 }}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '10px', color: '#fff', fontSize: '12px', padding: '10px 14px' }}
                  />
                  <Bar dataKey="students" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No enrollment data</div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <FiZap className="text-emerald-500" size={14} />
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {analytics?.totalEnrollments || 0} Active
            </span>
            <span className="text-[10px] text-gray-500">total enrollments</span>
          </div>
        </div>
      </div>

      {/* ── Activity Feed + Notifications ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ActivityFeed maxItems={15} />
        </div>
        <NotificationsPanel />
      </div>

      {/* ── Category Distribution ── */}
      {categoryData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5">Course Categories</h3>
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="w-full lg:w-1/2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    formatter={(val, name) => [val, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2.5 w-full">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{item.name}</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Additional Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Quiz Submissions</p>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {(analytics?.totalQuizSubmissions || 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assignments</p>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {analytics?.totalAssignments || 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{analytics?.totalAssignmentSubmissions || 0} submissions</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active This Week</p>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {analytics?.activeUsers?.week || 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">unique logins</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">New This Month</p>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {analytics?.newRegistrations?.month || 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">registrations</p>
        </div>
      </div>

      {/* ── Enrollment Type Split ── */}
      {analytics?.enrollmentSplit && (analytics.enrollmentSplit.auto > 0 || analytics.enrollmentSplit.paid > 0 || analytics.enrollmentSplit.free > 0 || analytics.enrollmentSplit.admin > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiLink className="text-indigo-500" size={16} />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Enrollment Type Split</h3>
            <span className="text-[10px] text-gray-400 ml-auto">Normal courses only</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/15 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {analytics.enrollmentSplit.auto || 0}
              </p>
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mt-1">Auto-Enrolled</p>
              <p className="text-[9px] text-emerald-500/70 mt-0.5">Via Live Course Link</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/15 rounded-xl border border-indigo-100 dark:border-indigo-800/40">
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {analytics.enrollmentSplit.paid || 0}
              </p>
              <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mt-1">Paid</p>
              <p className="text-[9px] text-indigo-500/70 mt-0.5">Razorpay Payment</p>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/15 rounded-xl border border-amber-100 dark:border-amber-800/40">
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {analytics.enrollmentSplit.free || 0}
              </p>
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mt-1">Free</p>
              <p className="text-[9px] text-amber-500/70 mt-0.5">100% Coupon</p>
            </div>
            <div className="text-center p-4 bg-violet-50 dark:bg-violet-900/15 rounded-xl border border-violet-100 dark:border-violet-800/40">
              <p className="text-2xl font-black text-violet-600 dark:text-violet-400">
                {analytics.enrollmentSplit.admin || 0}
              </p>
              <p className="text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mt-1">Admin</p>
              <p className="text-[9px] text-violet-500/70 mt-0.5">Direct Enrollment</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

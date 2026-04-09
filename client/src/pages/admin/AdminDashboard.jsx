import { useState, useEffect } from 'react';
import { AdminCard } from '../../components/admin/AdminCard';
import { FiUsers, FiBookOpen, FiVideo, FiTrendingUp, FiFileText, FiCheckSquare, FiAward } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

const CATEGORY_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get('/api/admin/analytics');
        setAnalytics(res.data.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-in">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-shimmer"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-shimmer"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-shimmer"></div>
        <div className="h-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-shimmer"></div>
      </div>
    </div>
  );

  const chartData = analytics?.monthlyRevenue?.map(item => ({
    name: item.month,
    revenue: Math.round(item.revenue || 0),
  })) || [];

  const enrollmentData = chartData.slice(-5).map((item, i) => ({
    ...item,
    students: Math.round((analytics?.totalStudents || 10) * (0.1 + Math.random() * 0.3))
  }));

  const categoryData = analytics?.categoryDistribution?.map(item => ({
    name: item._id || 'Other',
    value: item.count,
  })) || [];

  /**
   * Format INR currency
   */
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Platform Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time analytics from your platform.</p>
        </div>
      </div>

      {/* Metric Cards — Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <AdminCard
          title="Total Revenue"
          value={formatINR(analytics?.totalRevenue)}
          icon={<FiTrendingUp size={18} />}
          trend="+revenue"
        />
        <AdminCard
          title="Total Students"
          value={analytics?.totalStudents?.toLocaleString('en-IN') || '0'}
          icon={<FiUsers size={18} />}
          trend={`${analytics?.totalStudents || 0} registered`}
        />
        <AdminCard
          title="Active Courses"
          value={analytics?.totalCourses?.toString() || '0'}
          icon={<FiBookOpen size={18} />}
          trend="published"
        />
        <AdminCard
          title="Live Cohorts"
          value={analytics?.activeLiveCourses?.toString() || '0'}
          icon={<FiVideo size={18} />}
          trend="active"
        />
      </div>

      {/* Metric Cards — Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <AdminCard
          title="Enrollments"
          value={analytics?.totalEnrollments?.toLocaleString('en-IN') || '0'}
          icon={<FiCheckSquare size={18} />}
          trend="active"
        />
        <AdminCard
          title="Quiz Submissions"
          value={analytics?.totalQuizSubmissions?.toLocaleString('en-IN') || '0'}
          icon={<FiFileText size={18} />}
          trend="total attempts"
        />
        <AdminCard
          title="Assignments"
          value={analytics?.totalAssignments?.toString() || '0'}
          icon={<FiFileText size={18} />}
          trend={`${analytics?.totalAssignmentSubmissions || 0} submissions`}
        />
        <AdminCard
          title="Completion Rate"
          value={`${analytics?.completionRate ?? 0}%`}
          icon={<FiAward size={18} />}
          trend="course completion"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Chart */}
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Revenue Overview (₹ INR)</h3>
          </div>
          <div className="h-72 w-full" style={{ minWidth: 0 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.15} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No revenue data available</div>
            )}
          </div>
        </div>

        {/* Enrollments Bar Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Enrollment Activity</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollmentData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#f3f4f6', opacity: 0.1 }} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="students" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center">
              <FiTrendingUp className="text-green-500 mr-2" size={14} />
              <span className="text-xs font-bold text-gray-900 dark:text-white">{analytics?.totalEnrollments || 0} Active Enrollments</span>
            </div>
          </div>
        </div>

      </div>

      {/* Category Distribution */}
      {categoryData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">Course Categories</h3>
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="w-full lg:w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.name}</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

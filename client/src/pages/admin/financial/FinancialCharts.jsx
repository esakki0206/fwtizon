import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import { FiRefreshCw, FiTrendingUp, FiPieChart } from 'react-icons/fi';
import { cn } from '../../../lib/utils';

// ─── Colour palette ───────────────────────────────────────────────────────────
const COLORS = {
  revenue:  '#10b981',
  profit:   '#6366f1',
  expenses: '#f59e0b',
  refunds:  '#ef4444',
};

const PIE_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#a78bfa',
];

const CATEGORY_LABELS = {
  marketing:     'Marketing',
  venue:         'Venue',
  software_tools:'Software',
  certificates:  'Certificates',
  travel:        'Travel',
  food:          'Food',
  printing:      'Printing',
  miscellaneous: 'Misc',
};

// ─── Number formatter for axes ────────────────────────────────────────────────
const fmtAxis = (v) => {
  if (v >= 1_00_000)  return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1_000)     return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v}`;
};

const fmtTooltip = (v) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-800 dark:text-gray-200 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-gray-600 dark:text-gray-400 capitalize">{entry.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{fmtTooltip(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Section card wrapper ─────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, children, loading, className }) => (
  <div className={cn(
    'bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden',
    className
  )}>
    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="p-4">
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : children}
    </div>
  </div>
);

// ─── Revenue Trend Chart ──────────────────────────────────────────────────────
const RevenueTrendChart = () => {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [months,  setMonths]  = useState(12);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/financial/revenue-trend?months=${months}`);
      const raw = res.data.data || [];
      // Format month labels: '2024-11' → 'Nov'24'
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      setData(raw.map((d) => ({
        ...d,
        label: (() => {
          const [y, m] = d.month.split('-');
          return `${MONTHS[parseInt(m, 10) - 1]} '${y.slice(-2)}`;
        })(),
      })));
    } catch (_) { /* non-blocking */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [months]);

  return (
    <ChartCard
      title="Revenue & Profit Trend"
      subtitle="Monthly breakdown of revenue, expenses and profit"
      loading={loading}
    >
      <div className="flex items-center gap-2 mb-3">
        {[6, 12, 24].map((m) => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={cn(
              'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all border',
              months === m
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary-300'
            )}
          >
            {m}M
          </button>
        ))}
        <button onClick={load} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors">
          <FiRefreshCw size={13} />
        </button>
      </div>

      {data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-gray-400">
          No trend data available yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.revenue}  stopOpacity={0.18} />
                <stop offset="95%" stopColor={COLORS.revenue}  stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad-profit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.profit}   stopOpacity={0.18} />
                <stop offset="95%" stopColor={COLORS.profit}   stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="revenue"  name="Revenue"  stroke={COLORS.revenue}  fill="url(#grad-rev)"    strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke={COLORS.expenses} fill="none"              strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            <Area type="monotone" dataKey="profit"   name="Profit"   stroke={COLORS.profit}   fill="url(#grad-profit)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};

// ─── Expense Breakdown Pie Chart ──────────────────────────────────────────────
const ExpenseBreakdownChart = () => {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/financial/expense-breakdown');
      const raw = res.data.data || {};
      const segments = [];
      if (raw.resourcePersonTotal > 0) {
        segments.push({ name: 'Resource Persons', value: raw.resourcePersonTotal });
      }
      Object.entries(raw.categories || {}).forEach(([cat, amt]) => {
        if (amt > 0) segments.push({ name: CATEGORY_LABELS[cat] || cat, value: amt });
      });
      setData(segments);
    } catch (_) { /* non-blocking */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const total = data.reduce((s, d) => s + d.value, 0);
  const fmt   = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

  return (
    <ChartCard
      title="Expense Breakdown"
      subtitle="Distribution of costs by category"
      loading={loading}
    >
      {data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-gray-400">
          No expense data recorded yet.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5 min-w-0">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{d.name}</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{fmt(d.value)}</span>
                <span className="text-[10px] text-gray-400 w-10 text-right">
                  {total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : ''}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1.5 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex-1">Total</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">{fmt(total)}</span>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
};

// ─── Payment Distribution Bar Chart ──────────────────────────────────────────
const PaymentDistributionChart = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/admin/financial/payment-distribution');
        setData(res.data.data);
      } catch (_) { /* non-blocking */ }
      finally { setLoading(false); }
    })();
  }, []);

  const barData = data
    ? [
        { name: 'Paid',  count: data.paid,  fill: COLORS.revenue  },
        { name: 'Free',  count: data.free,  fill: '#06b6d4'       },
        { name: 'Admin', count: data.admin, fill: '#a78bfa'       },
        { name: 'Auto',  count: data.auto,  fill: '#fb923c'       },
      ].filter((d) => d.count > 0)
    : [];

  return (
    <ChartCard
      title="Enrollment Distribution"
      subtitle="Breakdown by enrollment type"
      loading={loading}
    >
      {barData.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-gray-400">No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => [v, 'Enrollments']} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {barData.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};

// ─── Exported composite ───────────────────────────────────────────────────────
const FinancialCharts = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div className="lg:col-span-2">
      <RevenueTrendChart />
    </div>
    <ExpenseBreakdownChart />
    <div className="lg:col-span-2">
      {/* Future: course comparison chart placeholder */}
    </div>
    <PaymentDistributionChart />
  </div>
);

export default FinancialCharts;

import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { cn } from '../../lib/utils';

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

/**
 * AnalyticsChart — reusable chart wrapper with loading and empty states.
 *
 * Props:
 *  - title        : string
 *  - description  : string
 *  - type         : 'area' | 'bar' | 'line' | 'pie'
 *  - data         : Array
 *  - dataKey      : string — primary data key
 *  - xKey         : string — x-axis data key
 *  - color        : string — chart color
 *  - loading      : boolean
 *  - height       : number (default 256)
 *  - valuePrefix  : string (e.g. '₹')
 *  - valueLabel   : string (e.g. 'Revenue')
 *  - className    : string
 *  - badge        : ReactNode
 *  - gradientId   : string — unique gradient ID
 *  - secondaryDataKey : string — for dual-axis charts
 *  - secondaryColor   : string
 */
const AnalyticsChart = ({
  title,
  description,
  type = 'area',
  data = [],
  dataKey = 'value',
  xKey = 'name',
  color = '#6366f1',
  loading = false,
  height = 256,
  valuePrefix = '',
  valueLabel,
  className,
  badge,
  gradientId,
  secondaryDataKey,
  secondaryColor = '#10b981',
}) => {
  const gId = gradientId || `gradient-${dataKey}-${type}`;

  if (loading) {
    return (
      <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5', className)}>
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-shimmer mb-2" />
        <div className="h-2.5 w-48 bg-gray-100 dark:bg-gray-800/60 rounded animate-shimmer mb-5" />
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 animate-shimmer" style={{ height }} />
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '12px',
    padding: '10px 14px',
  };

  const formatYAxis = (val) => {
    if (val >= 1000000) return `${valuePrefix}${(val / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (val >= 1000) return `${valuePrefix}${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return `${valuePrefix}${val}`;
  };

  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
          <div className="text-center">
            <p className="text-xs font-medium">No data available</p>
            <p className="text-[10px] text-gray-400 mt-1">Try adjusting the date range</p>
          </div>
        </div>
      );
    }

    const commonAxisProps = {
      axisLine: false,
      tickLine: false,
      tick: { fill: '#9ca3af', fontSize: 11 },
    };

    switch (type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.4} />
              <XAxis dataKey={xKey} {...commonAxisProps} dy={8} />
              <YAxis {...commonAxisProps} tickFormatter={formatYAxis} />
              <Tooltip contentStyle={tooltipStyle} formatter={(val, name) => [`${valuePrefix}${val.toLocaleString('en-IN')}`, valueLabel || name]} labelStyle={{ color: '#9ca3af', marginBottom: '4px' }} />
              <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fillOpacity={1} fill={`url(#${gId})`} />
              {secondaryDataKey && (
                <Area type="monotone" dataKey={secondaryDataKey} stroke={secondaryColor} strokeWidth={2} fillOpacity={0} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.3} />
              <XAxis dataKey={xKey} {...commonAxisProps} dy={8} />
              <YAxis {...commonAxisProps} tickFormatter={formatYAxis} />
              <Tooltip cursor={{ fill: '#f3f4f6', opacity: 0.15 }} contentStyle={tooltipStyle} formatter={(val, name) => [`${valuePrefix}${val.toLocaleString('en-IN')}`, valueLabel || name]} labelStyle={{ color: '#9ca3af' }} />
              <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
              {secondaryDataKey && (
                <Bar dataKey={secondaryDataKey} fill={secondaryColor} radius={[6, 6, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.4} />
              <XAxis dataKey={xKey} {...commonAxisProps} dy={8} />
              <YAxis {...commonAxisProps} tickFormatter={formatYAxis} />
              <Tooltip contentStyle={tooltipStyle} formatter={(val, name) => [`${valuePrefix}${val.toLocaleString('en-IN')}`, valueLabel || name]} labelStyle={{ color: '#9ca3af' }} />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }} />
              {secondaryDataKey && (
                <Line type="monotone" dataKey={secondaryDataKey} stroke={secondaryColor} strokeWidth={2} dot={{ fill: secondaryColor, r: 3 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey={dataKey}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 overflow-hidden', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
          {description && <p className="text-[10px] text-gray-500 mt-0.5">{description}</p>}
        </div>
        {badge}
      </div>
      {renderChart()}
    </div>
  );
};

export default AnalyticsChart;

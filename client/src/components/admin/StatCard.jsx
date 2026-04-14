import { useEffect, useRef, useState } from 'react';
import CountUpPkg from 'react-countup';
const CountUp = CountUpPkg.default ? CountUpPkg.default : CountUpPkg;
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { cn } from '../../lib/utils';

/**
 * Gradient config for each card variant.
 */
const GRADIENTS = {
  indigo: { bg: 'from-indigo-500 to-indigo-700', iconBg: 'bg-indigo-400/20', text: 'text-indigo-50' },
  emerald: { bg: 'from-emerald-500 to-emerald-700', iconBg: 'bg-emerald-400/20', text: 'text-emerald-50' },
  amber: { bg: 'from-amber-500 to-amber-700', iconBg: 'bg-amber-400/20', text: 'text-amber-50' },
  rose: { bg: 'from-rose-500 to-rose-700', iconBg: 'bg-rose-400/20', text: 'text-rose-50' },
  cyan: { bg: 'from-cyan-500 to-cyan-700', iconBg: 'bg-cyan-400/20', text: 'text-cyan-50' },
  purple: { bg: 'from-purple-500 to-purple-700', iconBg: 'bg-purple-400/20', text: 'text-purple-50' },
  slate: { bg: 'from-slate-600 to-slate-800', iconBg: 'bg-slate-400/20', text: 'text-slate-50' },
  sky: { bg: 'from-sky-500 to-sky-700', iconBg: 'bg-sky-400/20', text: 'text-sky-50' },
};

/**
 * StatCard — premium gradient metric card with animated counter and trend indicator.
 *
 * Props:
 *  - title       : string — metric label
 *  - value       : number | string — metric value (number for CountUp, string for display)
 *  - prefix      : string — prefix before value (e.g. '₹')
 *  - suffix      : string — suffix after value (e.g. '%')
 *  - icon        : ReactNode — icon element
 *  - trend       : number — percentage change (positive or negative)
 *  - trendLabel  : string — label for trend (e.g. 'vs last month')
 *  - gradient    : keyof GRADIENTS
 *  - compact     : boolean — use compact layout
 *  - loading     : boolean — show skeleton
 */
const StatCard = ({
  title,
  value,
  prefix = '',
  suffix = '',
  icon,
  trend,
  trendLabel = 'vs last month',
  gradient = 'indigo',
  compact = false,
  loading = false,
}) => {
  const g = GRADIENTS[gradient] || GRADIENTS.indigo;
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  // Intersection observer for entrance animation
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-shimmer" />
    );
  }

  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  const isCountable = !isNaN(numericValue) && isFinite(numericValue);
  const isPositive = typeof trend === 'number' && trend >= 0;

  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-xl bg-gradient-to-br shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 group',
        g.bg,
        compact ? 'p-4' : 'p-5'
      )}
    >
      {/* Background decorative circle */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5 group-hover:scale-125 transition-transform duration-700" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-semibold uppercase tracking-wider opacity-80', g.text)}>
            {title}
          </p>
          <div className={cn('font-black text-white mt-1.5', compact ? 'text-xl' : 'text-2xl md:text-3xl')}>
            {isCountable && isVisible ? (
              <CountUp
                start={0}
                end={numericValue}
                duration={1.8}
                separator=","
                prefix={prefix}
                suffix={suffix}
                decimals={suffix === '%' ? 1 : 0}
              />
            ) : (
              <span>{prefix}{value}{suffix}</span>
            )}
          </div>

          {typeof trend === 'number' && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold',
                isPositive
                  ? 'bg-white/20 text-green-100'
                  : 'bg-white/20 text-red-100'
              )}>
                {isPositive ? <FiTrendingUp size={10} /> : <FiTrendingDown size={10} />}
                {isPositive ? '+' : ''}{trend}%
              </span>
              <span className="text-[10px] text-white/60 font-medium">{trendLabel}</span>
            </div>
          )}
        </div>

        <div className={cn('shrink-0 rounded-lg p-2.5 backdrop-blur-sm', g.iconBg)}>
          <span className="text-white/90">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;

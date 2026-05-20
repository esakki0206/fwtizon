import { motion } from 'framer-motion';
import {
  FiTrendingUp, FiTrendingDown, FiDollarSign,
  FiMinusCircle, FiUsers,
} from 'react-icons/fi';
import { cn } from '../../../lib/utils';

export const formatINR = (value) => {
  if (value == null || isNaN(value)) return '₹0';
  const n = Number(value);
  if (Math.abs(n) >= 10_00_000)
    return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (Math.abs(n) >= 1000)
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `₹${n.toFixed(2)}`;
};

export const formatINRFull = (value) => {
  if (value == null || isNaN(value)) return '₹0';
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatPercent = (value) => {
  if (value == null || isNaN(value)) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

const CARDS = [
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    sublabel: 'All course earnings',
    icon: FiDollarSign,
    format: formatINR,
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'totalExpenses',
    label: 'Total Expenses',
    sublabel: 'RP + other costs',
    icon: FiMinusCircle,
    format: formatINR,
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'totalProfit',
    label: 'Total Profit',
    sublabel: 'Revenue − Expenses',
    icon: FiTrendingUp,
    format: formatINR,
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-600 dark:text-violet-400',
    dynamic: true,
  },
  {
    key: 'courseCount',
    label: 'Courses',
    sublabel: 'With financial data',
    icon: FiUsers,
    format: (v) => String(v ?? 0),
    gradient: 'from-slate-500 to-gray-600',
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    text: 'text-slate-600 dark:text-slate-400',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', bounce: 0.2, duration: 0.45 } },
};

const FinancialSummaryCards = ({ data, loading }) => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="show"
    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
  >
    {CARDS.map((card) => {
      const raw    = data?.[card.key] ?? 0;
      const disp   = loading ? '—' : card.format(raw);
      const isNeg  = card.dynamic && !loading && raw < 0;
      const isPos  = card.dynamic && !loading && raw > 0;

      const valueColor = isNeg
        ? 'text-red-600 dark:text-red-400'
        : isPos
        ? 'text-emerald-700 dark:text-emerald-300'
        : 'text-gray-900 dark:text-white';

      const Icon = isNeg ? FiTrendingDown : card.icon;

      return (
        <motion.div
          key={card.key}
          variants={itemVariants}
          className={cn(
            'relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800',
            'bg-white dark:bg-gray-900 p-3.5 lg:p-4',
            'hover:shadow-md transition-shadow duration-300'
          )}
        >
          <div className={cn('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r', card.gradient)} />

          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', card.bg)}>
            <Icon size={14} className={cn(isNeg ? 'text-red-500' : isPos ? 'text-emerald-500' : card.text)} />
          </div>

          <div className="space-y-0.5">
            <p className={cn(
              'text-base lg:text-lg font-bold tracking-tight truncate',
              loading ? 'animate-pulse text-gray-300 dark:text-gray-700 bg-gray-200 dark:bg-gray-700 rounded h-6 w-3/4' : valueColor
            )}>
              {!loading && disp}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-500 leading-tight">
              {card.label}
            </p>
            <p className="text-[9px] text-gray-400 dark:text-gray-600 truncate">{card.sublabel}</p>
          </div>
        </motion.div>
      );
    })}
  </motion.div>
);

export default FinancialSummaryCards;

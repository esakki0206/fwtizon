import { motion } from 'framer-motion';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiPieChart,
  FiPercent,
  FiMinusCircle,
} from 'react-icons/fi';
import { cn } from '../../../lib/utils';

/**
 * Formats a number as INR currency string.
 * @param {number} value
 * @returns {string}
 */
export const formatINR = (value) => {
  if (value == null || isNaN(value)) return '₹0';
  return `₹${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Formats a percentage value.
 * @param {number} value
 * @returns {string}
 */
export const formatPercent = (value) => {
  if (value == null || isNaN(value)) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

const CARD_CONFIG = [
  {
    key: 'totalGrossRevenue',
    label: 'Gross Revenue',
    icon: FiDollarSign,
    format: formatINR,
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'totalProfit',
    label: 'Net Profit',
    icon: FiTrendingUp,
    format: formatINR,
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    dynamicColor: true, // green if positive, red if negative
  },
  {
    key: 'totalExpenses',
    label: 'Total Expenses',
    icon: FiMinusCircle,
    format: formatINR,
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'avgProfitMargin',
    label: 'Avg. Profit Margin',
    icon: FiPercent,
    format: formatPercent,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50 dark:bg-violet-900/20',
    textColor: 'text-violet-600 dark:text-violet-400',
    dynamicColor: true,
  },
  {
    key: 'totalRefunds',
    label: 'Total Refunds',
    icon: FiPieChart,
    format: formatINR,
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50 dark:bg-rose-900/20',
    textColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    key: 'courseCount',
    label: 'Active Courses',
    icon: FiPieChart,
    format: (v) => String(v ?? 0),
    color: 'from-cyan-500 to-sky-600',
    bgLight: 'bg-cyan-50 dark:bg-cyan-900/20',
    textColor: 'text-cyan-600 dark:text-cyan-400',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', bounce: 0.2, duration: 0.5 } },
};

/**
 * Platform-level financial summary cards.
 * @param {{ data: object, loading: boolean }} props
 */
const FinancialSummaryCards = ({ data, loading }) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4"
    >
      {CARD_CONFIG.map((card) => {
        const rawValue = data?.[card.key] ?? 0;
        const displayValue = loading ? '—' : card.format(rawValue);

        let iconColor = card.textColor;
        let valueColor = 'text-gray-900 dark:text-white';
        if (card.dynamicColor && !loading) {
          if (rawValue > 0) {
            iconColor = 'text-emerald-500 dark:text-emerald-400';
            valueColor = 'text-emerald-700 dark:text-emerald-400';
          } else if (rawValue < 0) {
            iconColor = 'text-red-500 dark:text-red-400';
            valueColor = 'text-red-700 dark:text-red-400';
          }
        }

        const IconComponent = card.dynamicColor && rawValue < 0 ? FiTrendingDown : card.icon;

        return (
          <motion.div
            key={card.key}
            variants={itemVariants}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800',
              'bg-white dark:bg-gray-900 p-4 lg:p-5',
              'hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50',
              'transition-shadow duration-300'
            )}
          >
            {/* Gradient accent top line */}
            <div
              className={cn(
                'absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r',
                card.color
              )}
            />

            <div className="flex items-start justify-between mb-3">
              <div
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-xl',
                  card.bgLight
                )}
              >
                <IconComponent size={16} className={iconColor} />
              </div>
            </div>

            <div className="space-y-1">
              <p className={cn(
                'text-lg lg:text-xl font-bold tracking-tight truncate',
                loading ? 'animate-pulse text-gray-300 dark:text-gray-700' : valueColor
              )}>
                {displayValue}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {card.label}
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default FinancialSummaryCards;

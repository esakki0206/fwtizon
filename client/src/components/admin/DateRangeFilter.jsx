import { cn } from '../../lib/utils';

const PRESETS = [
  { label: 'Today',     days: 0 },
  { label: '7 Days',    days: 7 },
  { label: '30 Days',   days: 30 },
  { label: '6 Months',  days: 180 },
  { label: '1 Year',    days: 365 },
  { label: 'All Time',  days: null },
];

/**
 * DateRangeFilter — preset buttons + custom range inputs.
 *
 * Props:
 *  - activeDays  : number | null — currently active preset (null = all time)
 *  - from        : string — ISO date string for custom range start
 *  - to          : string — ISO date string for custom range end
 *  - onPreset    : (days: number | null) => void
 *  - onCustom    : (from: string, to: string) => void
 *  - className   : string
 */
const DateRangeFilter = ({ activeDays, from, to, onPreset, onCustom, className }) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3', className)}>
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onPreset(preset.days)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              activeDays === preset.days
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom range inputs */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider hidden sm:inline">Custom:</span>
        <input
          type="date"
          value={from || ''}
          onChange={(e) => onCustom(e.target.value, to)}
          className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        <span className="text-gray-400 text-xs">—</span>
        <input
          type="date"
          value={to || ''}
          onChange={(e) => onCustom(from, e.target.value)}
          className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>
    </div>
  );
};

export default DateRangeFilter;

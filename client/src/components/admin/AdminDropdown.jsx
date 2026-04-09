import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMoreVertical } from 'react-icons/fi';
import { cn } from '../../lib/utils';

/**
 * AdminDropdown — accessible action menu used inside data tables.
 *
 * Props:
 *  - items   : Array<{ label, icon, onClick, danger?, disabled? }>
 *  - align   : 'left' | 'right' (default 'right')
 *  - trigger : optional custom trigger element
 */
const AdminDropdown = ({ items = [], align = 'right', trigger }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const escHandler = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', escHandler);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', escHandler);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {trigger || <FiMoreVertical size={16} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            role="menu"
            className={cn(
              'absolute z-50 mt-1 w-52 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl shadow-gray-900/10 py-1.5',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {items.map((item, idx) => (
              <button
                key={idx}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  if (!item.disabled) item.onClick?.();
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-left',
                  item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
                  item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
                )}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDropdown;

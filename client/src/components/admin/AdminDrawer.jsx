import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { cn } from '../../lib/utils';

/**
 * AdminDrawer — side-sheet panel for detail views.
 *
 * Props:
 *  - open       : boolean
 *  - onClose    : () => void
 *  - title      : ReactNode
 *  - description: ReactNode
 *  - children   : ReactNode (body)
 *  - footer     : ReactNode (sticky footer)
 *  - side       : 'right' | 'left' (default 'right')
 *  - width      : tailwind width class (default 'max-w-2xl')
 */
const AdminDrawer = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  width = 'max-w-2xl',
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const fromX = side === 'right' ? '100%' : '-100%';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: fromX }}
            animate={{ x: 0 }}
            exit={{ x: fromX }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className={cn(
              'absolute top-0 bottom-0 w-full bg-white dark:bg-gray-900 shadow-2xl border-gray-200 dark:border-gray-800 flex flex-col',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              width
            )}
          >
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
              <div className="min-w-0">
                {title && (
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close drawer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {footer && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AdminDrawer;

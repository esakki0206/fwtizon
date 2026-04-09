// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import { cn } from '../../lib/utils';

/**
 * AdminModal — generic modal dialog for the admin panel.
 *
 * Props:
 *  - open       : boolean
 *  - onClose    : () => void
 *  - title      : ReactNode
 *  - description: ReactNode
 *  - children   : ReactNode (body)
 *  - footer     : ReactNode (action area)
 *  - size       : 'sm' | 'md' | 'lg' | 'xl'
 *  - hideClose  : boolean
 */
export const AdminModal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose = false,
}) => {
  const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className={cn(
              'relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]',
              sizeMap[size]
            )}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="min-w-0">
                  {title && (
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Close"
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>
            )}

            <div className="px-6 py-5 overflow-y-auto">{children}</div>

            {footer && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * AdminConfirmDialog — opinionated confirm modal for destructive actions.
 */
export const AdminConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
}) => {
  return (
    <AdminModal
      open={open}
      onClose={loading ? () => {} : onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          {destructive && <FiAlertTriangle className="text-red-500" />}
          {title}
        </span>
      }
      description={description}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-lg text-white transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
              destructive
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/20'
            )}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </AdminModal>
  );
};

export default AdminModal;

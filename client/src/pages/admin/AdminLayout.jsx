import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminHeader from '../../components/admin/AdminHeader';
import { cn } from '../../lib/utils';

const SIDEBAR_KEY = 'fwtion.admin.sidebarCollapsed';

const AdminLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_KEY) === '1';
  });
  const { pathname } = useLocation();

  // Close mobile drawer on navigation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Persist collapse state
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, isCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [isCollapsed]);

  const desktopWidth = isCollapsed ? 'lg:w-20' : 'lg:w-64';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans flex">
      {/* ── Mobile sidebar ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden shadow-2xl"
            >
              <AdminSidebar
                closeSidebar={() => setIsMobileOpen(false)}
                collapsed={false}
                className="w-full"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 sticky top-0 h-screen z-20 transition-[width] duration-300 ease-out',
          desktopWidth
        )}
      >
        <AdminSidebar
          closeSidebar={() => {}}
          collapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((v) => !v)}
          className="w-full h-full"
        />
      </aside>

      {/* ── Main content area ── */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminHeader
          openSidebar={() => setIsMobileOpen(true)}
          collapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((v) => !v)}
        />

        <div className="grow px-4 sm:px-5 lg:px-8 py-5 lg:py-7 overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

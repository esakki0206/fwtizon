import { Link, useLocation } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { FiChevronLeft } from 'react-icons/fi';
import { cn } from '../../lib/utils';
import { ADMIN_NAV_LINKS } from './adminNav';

const AdminSidebar = ({ className, closeSidebar, collapsed = false, onToggleCollapse }) => {
  const { pathname } = useLocation();

  const isActiveLink = (link) => {
    if (link.path === '/admin') return pathname === '/admin' || pathname === '/admin/dashboard';
    return pathname === link.path || pathname.startsWith(`${link.path}/`);
  };

  return (
    <aside
      className={cn(
        'bg-gray-950 border-r border-gray-800 text-gray-300 flex flex-col h-full overflow-y-auto',
        className
      )}
    >
      {/* Brand */}
      <div className="px-4 py-4 sticky top-0 bg-gray-950/95 backdrop-blur-md z-10 border-b border-gray-800/80 flex items-center justify-between">
        <Link
          to="/admin"
          className="flex items-center min-w-0"
          onClick={closeSidebar}
          aria-label="Fwtion Admin"
        >
          <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-primary-600 to-primary-400 shadow-lg shadow-primary-500/20 flex items-center justify-center text-white font-black text-sm shrink-0">
            F
          </div>
          {!collapsed && (
            <span className="ml-2.5 text-base font-black text-white tracking-tight truncate">
              Fwtion <span className="font-light text-gray-500 text-xs">Admin</span>
            </span>
          )}
        </Link>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FiChevronLeft
              size={14}
              className={cn('transition-transform', collapsed && 'rotate-180')}
            />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="grow py-3 px-2 space-y-0.5">
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">Navigation</p>
          </div>
        )}
        {ADMIN_NAV_LINKS.map((link) => {
          const isActive = isActiveLink(link);
          return (
            <Link
              key={link.name}
              to={link.path}
              onClick={closeSidebar}
              title={collapsed ? link.name : undefined}
              className={cn(
                'group relative flex items-center rounded-lg transition-all text-sm',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'text-white font-semibold bg-gray-800/70'
                  : 'hover:bg-gray-800/40 hover:text-white font-medium text-gray-400'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="adminSidebarActive"
                  className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary-500 rounded-r-full"
                />
              )}
              <span
                className={cn(
                  'shrink-0',
                  collapsed ? '' : 'mr-3',
                  isActive ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'
                )}
              >
                {link.icon}
              </span>
              {!collapsed && <span className="truncate">{link.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer status */}
      {!collapsed && (
        <div className="p-3 mt-auto border-t border-gray-800/50">
          <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">System</p>
            <div className="flex items-center text-xs font-medium text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar;

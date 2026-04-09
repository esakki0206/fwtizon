import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiBell, FiSearch, FiLogOut, FiSidebar } from 'react-icons/fi';

const AdminHeader = ({ openSidebar, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 transition-colors">
      <div className="flex items-center min-w-0 gap-2">
        {/* Mobile sidebar trigger */}
        <button
          type="button"
          onClick={openSidebar}
          className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <FiMenu size={20} />
        </button>

        {/* Desktop collapse trigger */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <FiSidebar size={18} />
          </button>
        )}

        {/* Search */}
        <div className="hidden md:flex items-center relative ml-2">
          <FiSearch className="absolute left-3 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search courses, students, payments…"
            className="w-72 pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <FiBell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full" />
        </button>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="flex items-center gap-2.5">
          <img
            src={
              user?.avatar && !user.avatar.includes('default_avatar')
                ? user.avatar
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=4f46e5&color=fff&size=64`
            }
            alt="Admin"
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
          />
          <div className="hidden sm:block min-w-0">
            <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
              {user?.name}
            </p>
            <p className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold">Admin</p>
          </div>

          <button
            type="button"
            onClick={logout}
            aria-label="Logout"
            title="Logout"
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <FiLogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;

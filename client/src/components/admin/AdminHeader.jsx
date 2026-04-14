import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiBell, FiSearch, FiLogOut, FiSidebar, FiX, FiUser, FiBookOpen } from 'react-icons/fi';
import { getAdminNotifications } from '../../lib/services/adminAnalytics';
import { cn } from '../../lib/utils';
import axios from 'axios';

const AdminHeader = ({ openSidebar, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch notification badge count
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const result = await getAdminNotifications();
        setUnreadCount(result.unreadCount || 0);
      } catch { /* silent */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 120000);
    return () => clearInterval(interval);
  }, []);

  // Close search on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const performSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    setSearching(true);
    try {
      const [usersRes, coursesRes] = await Promise.allSettled([
        axios.get(`/api/admin/students?search=${encodeURIComponent(query)}&limit=5`),
        axios.get(`/api/courses?search=${encodeURIComponent(query)}&limit=5`),
      ]);

      const results = [];

      if (usersRes.status === 'fulfilled' && usersRes.value?.data?.data) {
        usersRes.value.data.data.forEach(u => {
          results.push({ type: 'user', id: u._id, title: u.name, subtitle: u.email, icon: <FiUser size={14} /> });
        });
      }

      if (coursesRes.status === 'fulfilled' && coursesRes.value?.data?.data) {
        coursesRes.value.data.data.forEach(c => {
          results.push({ type: 'course', id: c._id, title: c.title, subtitle: c.category, icon: <FiBookOpen size={14} /> });
        });
      }

      setSearchResults(results);
      setSearchOpen(results.length > 0);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Debounce 300ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  };

  const handleResultClick = (result) => {
    setSearchOpen(false);
    setSearchQuery('');
    if (result.type === 'user') {
      navigate('/admin/students');
    } else if (result.type === 'course') {
      navigate('/admin/courses');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 transition-colors">
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

        {/* Global Search */}
        <div className="hidden md:block relative ml-2" ref={searchRef}>
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            placeholder="Search users, courses…"
            className="w-64 lg:w-72 pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchOpen(false); setSearchResults([]); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX size={14} />
            </button>
          )}

          {/* Search Results Dropdown */}
          {searchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
              {searching ? (
                <div className="p-4 text-center text-xs text-gray-400">Searching…</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">No results found</div>
              ) : (
                searchResults.map((result, idx) => (
                  <button
                    key={`${result.type}-${result.id}-${idx}`}
                    type="button"
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="shrink-0 p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
                      {result.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{result.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{result.subtitle}</p>
                    </div>
                    <span className="ml-auto text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                      {result.type}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => navigate('/admin/analytics')}
          className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <FiBell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full text-[8px] text-white font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="flex items-center gap-2.5">
          <img
            src={
              user?.avatar && !user.avatar.includes('default_avatar')
                ? user.avatar
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=6366f1&color=fff&size=64`
            }
            alt="Admin"
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
          />
          <div className="hidden sm:block min-w-0">
            <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
              {user?.name}
            </p>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Admin</p>
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

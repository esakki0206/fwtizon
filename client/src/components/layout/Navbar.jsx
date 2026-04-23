import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FiSun, FiMoon, FiMenu, FiX, FiSearch, FiUser, FiBookOpen, FiAward, FiSettings, FiLogOut, FiChevronDown, FiGrid, FiFileText } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationDropdown from './NotificationDropdown';
import fwtLogoBlack from '../../assets/FwT - Logo - Black Tagline.png';
import fwtLogoWhite from '../../assets/FwT - Logo - White Tagline.png';

const categories = ['Development', 'Business', 'IT & Software', 'Design', 'Marketing', 'Personal Development'];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const profileRef = useRef(null);
  const categoriesRef = useRef(null);
  const searchRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (categoriesRef.current && !categoriesRef.current.contains(e.target)) setCategoriesOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/courses?keyword=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
      setSearchOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed w-full z-50 transition-all duration-300 backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/80 dark:border-gray-800/80 shadow-sm shadow-gray-200/20 dark:shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <img src={fwtLogoBlack} alt="FWT Logo" className="h-8 md:h-10 w-auto block dark:hidden object-contain" />
              <img src={fwtLogoWhite} alt="FWT Logo" className="h-8 md:h-10 w-auto hidden dark:block object-contain" />
            </Link>
          </div>

          {/* Desktop Center — Search */}
          <div className="hidden lg:flex items-center flex-1 max-w-xl mx-18">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                placeholder="Search courses, topics, skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all placeholder:text-gray-400"
              />
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </form>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            <Link to="/courses" className="px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium transition-all">
              Courses
            </Link>

            {/* Categories Dropdown */}
            <div className="relative" ref={categoriesRef}>
              <button
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className="px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium transition-all flex items-center"
              >
                Categories <FiChevronDown className={`ml-1 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`} size={14} />
              </button>
              <AnimatePresence>
                {categoriesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-100 dark:border-gray-800 py-2 z-50"
                  >
                    {categories.map((cat) => (
                      <Link
                        key={cat}
                        to={`/courses?category=${encodeURIComponent(cat)}`}
                        onClick={() => setCategoriesOpen(false)}
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        <FiGrid className="mr-3 text-gray-400" size={14} />
                        {cat}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/live-courses" className="px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium transition-all">
              Live Cohorts
            </Link>

            {user && (
              <Link
                to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                className="px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium transition-all"
              >
                Dashboard
              </Link>
            )}

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>

            <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle theme">
              {isDarkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>

            {user ? (
              <div className="flex items-center space-x-1 ml-1">
                <NotificationDropdown />

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center space-x-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                  >
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=4f46e5&color=fff&size=64`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 shadow-sm object-cover"
                    />
                    <span className="hidden xl:block text-sm font-semibold text-gray-700 dark:text-gray-200 max-w-[100px] truncate">
                      {user.name?.split(' ')[0]}
                    </span>
                    <FiChevronDown className={`text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} size={14} />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-gray-900 rounded-xl shadow-xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-100 dark:border-gray-800 py-2 z-50"
                      >
                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>

                        <div className="py-1">
                          {user.role === 'admin' ? (
                            <>
                              <Link to="/admin/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <FiGrid className="mr-3 text-gray-400" size={16} /> Dashboard
                              </Link>
                              <Link to="/admin/courses" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <FiBookOpen className="mr-3 text-gray-400" size={16} /> Manage Courses
                              </Link>
                              <Link to="/admin/live-courses" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <svg className="w-4 h-4 mr-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg> Live Cohorts
                              </Link>
                              <Link to="/admin/payments" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <svg className="w-4 h-4 mr-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2" /><path d="M2 10h20M7 15h.01" /></svg> Payments
                              </Link>
                              <Link to="/admin/certificates" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <FiAward className="mr-3 text-gray-400" size={16} /> Certifications and Receipt
                              </Link>
                              <Link to="/admin/users" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <FiUser className="mr-3 text-gray-400" size={16} /> Users
                              </Link>
                            </>
                          ) : (
                            <>
                              <Link to="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <FiGrid className="mr-3 text-gray-400" size={16} /> Dashboard
                              </Link>
                              <Link to="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <FiBookOpen className="mr-3 text-gray-400" size={16} /> My Courses
                              </Link>
                              <Link to="/live-courses" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <svg className="w-4 h-4 mr-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg> Live Classes
                              </Link>
                              <Link to="/dashboard/assignments" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <FiFileText className="mr-3 text-gray-400" size={16} /> Assignments
                              </Link>
                              <Link to="/dashboard/certificates" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <FiAward className="mr-3 text-gray-400" size={16} /> Certifications and Receipts
                              </Link>
                              <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <FiUser className="mr-3 text-gray-400" size={16} /> Profile
                              </Link>
                            </>
                          )}
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <FiLogOut className="mr-3" size={16} /> Log Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 ml-2">
                <Link to="/login" className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 font-medium transition-colors">
                  Log In
                </Link>
                <Link to="/register" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-primary-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden flex items-center space-x-1">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Search">
              <FiSearch size={20} />
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Toggle theme">
              {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Menu">
              {isMobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
          >
            <form onSubmit={handleSearch} className="p-4">
              <div className="relative">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
                />
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 max-h-[70vh] overflow-y-auto"
          >
            <div className="px-4 pt-3 pb-6 space-y-1">
              <Link to="/courses" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                All Courses
              </Link>
              <Link to="/live-courses" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Live Cohorts
              </Link>
              {user && (
                <Link to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Dashboard
                </Link>
              )}

              {/* Mobile Categories */}
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Categories</p>
              </div>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  to={`/courses?category=${encodeURIComponent(cat)}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {cat}
                </Link>
              ))}

              <div className="border-t border-gray-100 dark:border-gray-800 my-3"></div>

              {user ? (
                <>
                  <div className="px-4 py-3 flex items-center space-x-3">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=4f46e5&color=fff&size=64`}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700 object-cover"
                    />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  {user.role === 'admin' ? (
                    <>
                      <Link to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Dashboard
                      </Link>
                      <Link to="/admin/courses" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Manage Courses
                      </Link>
                      <Link to="/admin/live-courses" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Live Cohorts
                      </Link>
                      <Link to="/admin/payments" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Payments
                      </Link>
                      <Link to="/admin/certificates" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Certifications and Receipt
                      </Link>
                      <Link to="/admin/users" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Users
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Dashboard
                      </Link>
                      <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        My Courses
                      </Link>
                      <Link to="/live-courses" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Live Classes
                      </Link>
                      <Link to="/dashboard/assignments" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Assignments
                      </Link>
                      <Link to="/dashboard/certificates" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Certifications and Receipts
                      </Link>
                      <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Profile
                      </Link>
                    </>
                  )}
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    Log Out
                  </button>
                </>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 px-4">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex justify-center py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold text-sm">
                    Log In
                  </Link>
                  <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex justify-center py-2.5 bg-primary-600 text-white rounded-xl font-semibold text-sm">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiCompass, FiBookOpen, FiUser, FiMenu, FiVideo, FiChevronUp } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { cn } from '../../lib/utils';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const MobileNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { toggleMobileMenu, closeMobileMenu, isMobileMenuOpen } = useUI();

  // Controls the courses sub-menu popup
  const [coursesMenuOpen, setCoursesMenuOpen] = useState(false);
  const coursesMenuRef = useRef(null);

  // Close courses popup when clicking outside
  useEffect(() => {
    if (!coursesMenuOpen) return;
    const handleOutsideClick = (e) => {
      if (coursesMenuRef.current && !coursesMenuRef.current.contains(e.target)) {
        setCoursesMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [coursesMenuOpen]);

  // Close courses popup whenever the route changes
  useEffect(() => {
    setCoursesMenuOpen(false);
  }, [pathname]);

  // Whether the Courses button should appear "active"
  const isCoursesActive =
    pathname === '/courses' ||
    pathname.startsWith('/courses/') ||
    pathname === '/live-courses' ||
    pathname.startsWith('/live-course/');

  const navItems = [
    { label: 'Home', path: '/', icon: <FiHome className="w-5 h-5" /> },
    // 'Courses' is handled separately below — it opens a popup
    { label: 'Learning', path: '/dashboard', icon: <FiBookOpen className="w-5 h-5" />, authRequired: true },
    { label: 'Profile', path: user ? '/profile' : '/login', icon: <FiUser className="w-5 h-5" /> },
  ];

  return (
    <div
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-[70] px-3 pointer-events-none transition-all duration-200",
        isMobileMenuOpen ? "translate-y-8 opacity-0" : "translate-y-0 opacity-100"
      )}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      aria-hidden={isMobileMenuOpen}
    >
      {/* ── Courses Sub-Menu Popup ── */}
      <AnimatePresence>
        {coursesMenuOpen && (
          <motion.div
            ref={coursesMenuRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden"
          >
            {/* Arrow pointing down */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-900 border-r border-b border-gray-200 dark:border-gray-700 rotate-45" />

            <div className="p-1.5 relative z-10 bg-white dark:bg-gray-900">
              <Link
                to="/courses"
                onClick={() => { closeMobileMenu(); setCoursesMenuOpen(false); }}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors",
                  pathname === '/courses' || pathname.startsWith('/courses/')
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <FiCompass className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div>Courses</div>
                  <div className="text-[10px] font-normal text-gray-400 dark:text-gray-500">Recorded self-paced</div>
                </div>
              </Link>

              <Link
                to="/live-courses"
                onClick={() => { closeMobileMenu(); setCoursesMenuOpen(false); }}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors",
                  pathname === '/live-courses' || pathname.startsWith('/live-course/')
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <FiVideo className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    Live Courses
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white bg-red-500 px-1.5 py-0.5 rounded-full leading-none">
                      Live
                    </span>
                  </div>
                  <div className="text-[10px] font-normal text-gray-400 dark:text-gray-500">Instructor-led cohorts</div>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Nav Bar ── */}
      <div className="pointer-events-auto bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl shadow-black/15 flex justify-around items-center h-[4.5rem] px-2">

        {/* Home */}
        {navItems.slice(0, 1).map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={closeMobileMenu}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 relative rounded-xl transition-all duration-200",
                isActive ? "text-primary-600 dark:text-primary-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              <div className={cn("p-2 rounded-xl transition-all", isActive ? "bg-primary-50 dark:bg-primary-900/40 shadow-sm" : "")}>
                {item.icon}
              </div>
              <span className="text-[11px] font-bold tracking-tight leading-none">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobileNavActive"
                  className="absolute bottom-1 w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}

        {/* ── Courses Button (opens popup) ── */}
        <button
          onClick={() => setCoursesMenuOpen((prev) => !prev)}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-1 relative rounded-xl transition-all duration-200",
            isCoursesActive || coursesMenuOpen
              ? "text-primary-600 dark:text-primary-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-all",
            isCoursesActive || coursesMenuOpen ? "bg-primary-50 dark:bg-primary-900/40 shadow-sm" : ""
          )}>
            {coursesMenuOpen
              ? <FiChevronUp className="w-5 h-5" />
              : <FiCompass className="w-5 h-5" />
            }
          </div>
          <span className="text-[11px] font-bold tracking-tight leading-none">Courses</span>
          {(isCoursesActive || coursesMenuOpen) && (
            <motion.div
              layoutId="mobileNavActive"
              className="absolute bottom-1 w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </button>

        {/* Learning + Profile */}
        {navItems.slice(1).map((item) => {
          if (item.authRequired && !user) return null;
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={closeMobileMenu}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 relative rounded-xl transition-all duration-200",
                isActive ? "text-primary-600 dark:text-primary-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              <div className={cn("p-2 rounded-xl transition-all", isActive ? "bg-primary-50 dark:bg-primary-900/40 shadow-sm" : "")}>
                {item.icon}
              </div>
              <span className="text-[11px] font-bold tracking-tight leading-none">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobileNavActive"
                  className="absolute bottom-1 w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}

        {/* Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-1 relative rounded-xl transition-all duration-200",
            isMobileMenuOpen ? "text-primary-600 dark:text-primary-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          )}
        >
          <div className={cn("p-2 rounded-xl transition-all", isMobileMenuOpen ? "bg-primary-50 dark:bg-primary-900/40 shadow-sm" : "")}>
            <FiMenu className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold tracking-tight leading-none">Menu</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNav;

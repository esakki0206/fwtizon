import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiCompass, FiBookOpen, FiUser, FiMenu } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { cn } from '../../lib/utils';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const MobileNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { toggleMobileMenu, closeMobileMenu, isMobileMenuOpen } = useUI();

  const navItems = [
    { label: 'Home', path: '/', icon: <FiHome className="w-5 h-5" /> },
    { label: 'Courses', path: '/courses', icon: <FiCompass className="w-5 h-5" /> },
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
      <div className="pointer-events-auto bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl shadow-black/15 flex justify-around items-center h-[4.5rem] px-2">
        {navItems.map((item) => {
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
              <div className={cn(
                "p-2 rounded-xl transition-all",
                isActive ? "bg-primary-50 dark:bg-primary-900/40 shadow-sm" : ""
              )}>
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
          <div className={cn(
            "p-2 rounded-xl transition-all",
            isMobileMenuOpen ? "bg-primary-50 dark:bg-primary-900/40 shadow-sm" : ""
          )}>
            <FiMenu className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold tracking-tight leading-none">Menu</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNav;

import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiCompass, FiBookOpen, FiUser, FiMenu } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const MobileNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { toggleMobileMenu, isMobileMenuOpen } = useUI();

  const navItems = [
    { label: 'Home', path: '/', icon: <FiHome className="w-5 h-5" /> },
    { label: 'Courses', path: '/courses', icon: <FiCompass className="w-5 h-5" /> },
    { label: 'Learning', path: '/dashboard', icon: <FiBookOpen className="w-5 h-5" />, authRequired: true },
    { label: 'Profile', path: user ? '/profile' : '/login', icon: <FiUser className="w-5 h-5" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-2xl shadow-2xl shadow-black/10 flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          if (item.authRequired && !user) return null;

          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 relative transition-all duration-300",
                isActive ? "text-primary-600 dark:text-primary-400 scale-110" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all",
                isActive ? "bg-primary-50 dark:bg-primary-900/30" : ""
              )}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobileNavActive"
                  className="absolute -bottom-1 w-1 h-1 bg-primary-600 dark:bg-primary-400 rounded-full"
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
            "flex flex-col items-center justify-center w-full h-full space-y-1 relative transition-all duration-300",
            isMobileMenuOpen ? "text-primary-600 dark:text-primary-400 scale-110" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-xl transition-all",
            isMobileMenuOpen ? "bg-primary-50 dark:bg-primary-900/30" : ""
          )}>
            <FiMenu className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight">Menu</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNav;

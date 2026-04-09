import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiCompass, FiBookOpen, FiUser, FiBell } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const MobileNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const navItems = [
    { label: 'Home', path: '/', icon: <FiHome className="w-5 h-5" /> },
    { label: 'Courses', path: '/courses', icon: <FiCompass className="w-5 h-5" /> },
    { label: 'My Learning', path: '/dashboard', icon: <FiBookOpen className="w-5 h-5" />, authRequired: true },
    { label: 'Profile', path: user ? '/profile' : '/login', icon: <FiUser className="w-5 h-5" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800/80 pb-safe">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          if (item.authRequired && !user) return null;

          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-0.5 relative transition-colors",
                isActive ? "text-primary-600 dark:text-primary-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              {item.icon}
              <span className="text-[10px] font-semibold">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobileNavActive"
                  className="absolute -top-[1px] w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-b-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;

import { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiInfo, FiCreditCard } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    // Close dropdown on outside click
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      const data = res.data.data;
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  const handleMarkAsRead = async (id, link) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (link) {
         window.location.href = link;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'payment': return <FiCreditCard className="text-green-500" />;
      case 'system': return <FiInfo className="text-primary-500" />;
      default: return <FiBell className="text-gray-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <FiBell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 lg:w-96 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl rounded-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 px-2 py-1 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="max-h-[28rem] overflow-y-auto no-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FiBell className="mx-auto mb-2 opacity-50" size={24} />
                  <p className="text-sm">You have no notifications yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {notifications.map((notif) => (
                    <div 
                      key={notif._id} 
                      className={`p-4 flex gap-4 transition-colors ${!notif.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                    >
                      <div className={`mt-0.5 p-2 rounded-full h-fit flex-shrink-0 ${!notif.isRead ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-grow pr-2">
                        <p className={`text-sm ${!notif.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {!notif.isRead && (
                          <button onClick={() => handleMarkAsRead(notif._id, notif.link)} className="text-primary-600 hover:text-primary-700 tooltip" title="Mark as read">
                            <FiCheck size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;

import {
  FiHome,
  FiBook,
  FiVideo,
  FiUsers,
  FiFileText,
  FiAward,
  FiDollarSign,
  FiBell,
  FiPieChart,
  FiSettings,
  FiMessageSquare,
  FiTag,
} from 'react-icons/fi';

/**
 * Centralized admin navigation config.
 * Lives in its own module so component files can stay
 * react-refresh friendly (only exporting components).
 */
export const ADMIN_NAV_LINKS = [
  { name: 'Dashboard', path: '/admin', icon: <FiHome size={16} /> },
  { name: 'Courses', path: '/admin/courses', icon: <FiBook size={16} /> },
  { name: 'Live Courses', path: '/admin/live-courses', icon: <FiVideo size={16} /> },
  { name: 'Students', path: '/admin/students', icon: <FiUsers size={16} /> },
  { name: 'Quizzes', path: '/admin/quizzes', icon: <FiFileText size={16} /> },
  { name: 'Assignments', path: '/admin/assignments', icon: <FiFileText size={16} /> },
  { name: 'Certifications and Receipt', path: '/admin/certificates', icon: <FiAward size={16} /> },
  { name: 'Payments', path: '/admin/payments', icon: <FiDollarSign size={16} /> },
  { name: 'Coupons', path: '/admin/coupons', icon: <FiTag size={16} /> },
  { name: 'Live Enrollments', path: '/admin/enrollments', icon: <FiUsers size={16} /> },
  { name: 'Announcements', path: '/admin/announcements', icon: <FiBell size={16} /> },
  { name: 'Feedback', path: '/admin/feedback', icon: <FiMessageSquare size={16} /> },
  { name: 'Analytics', path: '/admin/analytics', icon: <FiPieChart size={16} /> },
  { name: 'Settings', path: '/admin/settings', icon: <FiSettings size={16} /> },
];

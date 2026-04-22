import { Link } from 'react-router-dom';
import { FiLinkedin, FiInstagram } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="text-xl font-black bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent mb-4 block">
              Fwtizon
            </Link>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 leading-relaxed max-w-xs">
              Enterprise-grade learning platform with world-class courses, live cohorts, and professional certifications.
            </p>
            <div className="flex space-x-3 text-gray-400">
              <a href="#" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 transition-colors"><FiLinkedin size={18} /></a>
              <a href="#" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 transition-colors"><FiInstagram size={18} /></a>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4 uppercase tracking-wider">Platform</h3>
            <ul className="space-y-2.5">
              <li><Link to="/courses" className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Browse Courses</Link></li>
              <li><Link to="/live-courses" className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Live Cohorts</Link></li>
              <li><Link to="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">My Learning</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 dark:text-gray-500">
          <p>© {new Date().getFullYear()} Fwtizon LMS. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Built for enterprise learning</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

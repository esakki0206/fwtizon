import { Link } from 'react-router-dom';
import { FiLinkedin, FiInstagram } from 'react-icons/fi';
import fwtLogoBlack from '../../assets/FwT - Logo - Black Tagline.png';
import fwtLogoWhite from '../../assets/FwT - Logo - White Tagline.png';
import startupIndiaLogo from '../../assets/startup-india-logo.png';
import startupTnLogo from '../../assets/startup-tn-logo.png';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-8">
          <div className="col-span-1 md:col-span-5 lg:col-span-4">
            <Link to="/" className="mb-4 block">
              <img src={fwtLogoBlack} alt="FWT Logo" className="h-10 w-auto block dark:hidden object-contain" />
              <img src={fwtLogoWhite} alt="FWT Logo" className="h-10 w-auto hidden dark:block object-contain" />
            </Link>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 leading-relaxed max-w-sm">
              Enterprise-grade learning platform with world-class courses, live cohorts, and professional certifications.
            </p>
          </div>

          <div className="col-span-1 md:col-span-3 lg:col-span-3">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4 uppercase tracking-wider">Platform</h3>
            <ul className="space-y-2.5">
              <li><Link to="/courses" className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Browse Courses</Link></li>
              <li><Link to="/live-courses" className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Live Cohorts</Link></li>
              <li><Link to="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">My Learning</Link></li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-4 lg:col-span-5">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4 uppercase tracking-wider">Recognized By</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-white p-2 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm dark:shadow-none hover:shadow-md transition-shadow">
                <img src={startupIndiaLogo} alt="Startup India" className="h-10 sm:h-12 w-auto object-contain" />
              </div>
              <div className="bg-white p-2 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm dark:shadow-none hover:shadow-md transition-shadow">
                <img src={startupTnLogo} alt="Startup TN" className="h-10 sm:h-12 w-auto object-contain" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 dark:text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} FWT iZON. All Rights Reserved.</p>
          <p>A Strategic Business Unit of FrontierWox Tech Private Limited</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

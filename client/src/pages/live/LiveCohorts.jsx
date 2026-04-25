import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiVideo, FiCalendar, FiUsers, FiClock } from 'react-icons/fi';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatLiveCourseDate, getLiveCourseTimingText } from '../../lib/liveCourseTiming';

const LiveCohorts = () => {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveCourses = async () => {
      try {
        const res = await axios.get('/api/live-courses');
        setCohorts(res.data.data || []);
      } catch (err) {
        toast.error('Failed to load live courses');
      } finally {
        setLoading(false);
      }
    };
    fetchLiveCourses();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-10 md:mb-16 max-w-3xl mx-auto px-2">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold mb-5 md:mb-6 text-xs uppercase tracking-widest border border-red-200 dark:border-red-800/50">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2.5 animate-pulse"></span>
            LIVE COURSES
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 leading-tight tracking-tight">Interactive, peer-driven live masterclasses</h1>
          <p className="text-base md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed">Join small batches of ambitious peers and learn directly from industry experts in real-time.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[480px] bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 animate-shimmer shadow-sm"></div>
            ))}
          </div>
        ) : cohorts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {cohorts.map((cohort, i) => {
              const spotsLeft = Math.max(0, (cohort.maxStudents || 30) - (cohort.currentEnrollments || 0));
              const isFull = spotsLeft === 0;

              return (
                <motion.div
                  key={cohort._id || i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-black/20 flex flex-col group hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700">
                        {cohort.category || "Masterclass"}
                      </span>
                    </div>
                    {isFull ? (
                      <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold rounded-lg text-[10px] uppercase tracking-wider whitespace-nowrap border border-gray-200 dark:border-gray-700">
                        Sold Out
                      </span>
                    ) : spotsLeft <= 5 ? (
                      <span className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold rounded-lg text-[10px] uppercase tracking-wider whitespace-nowrap border border-red-200 dark:border-red-800/50">
                        {spotsLeft} spots left
                      </span>
                    ) : null}
                  </div>

                  {cohort.thumbnail && cohort.thumbnail !== 'no-photo-live.jpg' && (
                    <div className="w-full h-40 mb-5 relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <img src={cohort.thumbnail} alt={cohort.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
                    </div>
                  )}

                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2 leading-snug line-clamp-2">{cohort.title}</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium text-sm">
                    with{' '}
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {cohort.instructorName || cohort.instructor?.name || 'Expert Instructor'}
                    </span>
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-8 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex-grow">
                    <div className="flex flex-col p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm">
                      <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center"><FiCalendar className="mr-1.5" size={12} /> Starts</span>
                      <span className="font-bold text-gray-900 dark:text-white text-xs">{formatLiveCourseDate(cohort, 'en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex flex-col p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm">
                      <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center"><FiClock className="mr-1.5" size={12} /> Timing</span>
                      <span className="font-bold text-gray-900 dark:text-white text-xs leading-snug">{getLiveCourseTimingText(cohort) || 'To be announced'}</span>
                    </div>
                    <div className="flex flex-col p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm">
                      <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center"><FiUsers className="mr-1.5" size={12} /> Size</span>
                      <span className="font-bold text-gray-900 dark:text-white text-xs">Max {cohort.maxStudents || 30} pax</span>
                    </div>
                    <div className="flex flex-col p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm">
                      <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center"><FiClock className="mr-1.5" size={12} /> Duration</span>
                      <span className="font-bold text-gray-900 dark:text-white text-xs">{cohort.duration || '4 Weeks'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mt-auto gap-4">
                    <div className="flex flex-col items-center sm:items-start">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Enrollment</span>
                      <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">₹{cohort.price}</div>
                    </div>
                    <Link
                      to={`/live-course/${cohort._id}`}
                      className={`w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-xl shadow-primary-600/20 active:scale-[0.98] font-bold rounded-xl transition-all text-sm flex items-center justify-center`}
                    >
                      View Details
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800">
            <FiVideo className="mx-auto text-gray-300 dark:text-gray-600 mb-6" size={64} />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Live Courses Available</h3>
            <p className="text-gray-500 max-w-md mx-auto">We are currently planning our next batch of live masterclasses. Check back soon or subscribe to our newsletter for updates.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default LiveCohorts;

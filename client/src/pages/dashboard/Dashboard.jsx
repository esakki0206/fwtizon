import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { FiBookOpen, FiActivity, FiAward, FiCompass, FiPlayCircle, FiClock, FiVideo, FiBell, FiArrowRight, FiLock, FiMessageSquare, FiDownload, FiCheckCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import CourseCard from '../../components/common/CourseCard';
import { Button } from '../../components/ui/button';
import FeedbackFormModal from '../../components/common/FeedbackFormModal';

const Dashboard = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [liveCourses, setLiveCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackStatuses, setFeedbackStatuses] = useState({});
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [activeFeedbackForm, setActiveFeedbackForm] = useState(null);
  const [activeLiveCourseId, setActiveLiveCourseId] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [enrollRes, liveRes, notifRes] = await Promise.all([
          axios.get('/api/enroll/my-courses'),
          axios.get('/api/live-courses').catch(() => ({ data: { data: [] } })),
          axios.get('/api/notifications').catch(() => ({ data: { data: [] } })),
        ]);
        setEnrollments(enrollRes.data.data || []);
        setLiveCourses(liveRes.data.data || []);
        setNotifications(notifRes.data.data || []);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Fetch feedback statuses for all live enrollments
  const fetchFeedbackStatuses = useCallback(async (liveEnrolls) => {
    const statuses = {};
    await Promise.all(
      liveEnrolls.map(async (en) => {
        if (!en.liveCourse?._id) return;
        try {
          const res = await axios.get(`/api/feedback/status/${en.liveCourse._id}`);
          statuses[en.liveCourse._id] = res.data.data;
        } catch { /* silent */ }
      })
    );
    setFeedbackStatuses(statuses);
  }, []);

  useEffect(() => {
    const liveEnrolls = enrollments.filter(e => e.liveCourse);
    if (liveEnrolls.length > 0) fetchFeedbackStatuses(liveEnrolls);
  }, [enrollments, fetchFeedbackStatuses]);

  const openFeedbackModal = async (liveCourseId) => {
    try {
      const res = await axios.get(`/api/feedback/form/${liveCourseId}`);
      if (res.data.data?.isSubmitted) { toast('Already submitted!'); return; }
      if (!res.data.data?.isUnlocked) { toast('Form not available yet'); return; }
      setActiveFeedbackForm(res.data.data);
      setActiveLiveCourseId(liveCourseId);
      setFeedbackModalOpen(true);
    } catch (err) { toast.error(err.response?.data?.message || 'Could not load feedback form'); }
  };

  const handleFeedbackSuccess = () => {
    const liveEnrolls = enrollments.filter(e => e.liveCourse);
    fetchFeedbackStatuses(liveEnrolls);
  };

  if (loading) return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center dark:bg-gray-950">
      <div className="relative">
        <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-primary-600 dark:border-primary-400"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-7 w-7 bg-white dark:bg-gray-950 rounded-full"></div>
      </div>
    </div>
  );

  const completedCount = enrollments.filter(e => e.status === 'completed').length;
  const activeCount = enrollments.filter(e => e.status === 'active').length;
  const certificatesCount = enrollments.filter(e => e.certificateId).length;
  const totalProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((acc, e) => acc + (e.progress?.percentComplete || 0), 0) / enrollments.length)
    : 0;

  // Find the most recent active enrollment for "Continue Learning"
  const continueLearning = enrollments.find(e => e.status === 'active' && e.course);

  // Filter upcoming live courses (future dates)
  const upcomingLive = liveCourses.filter(lc => {
    const startDate = new Date(lc.startDate || lc.createdAt);
    return startDate >= new Date();
  }).slice(0, 3);

  const courseEnrollments = enrollments.filter(e => e.course);
  const liveEnrollments = enrollments.filter(e => e.liveCourse);

  // Recent notifications
  const recentNotifs = notifications.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Profile Hero */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary-100 dark:bg-primary-900/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left space-y-3 sm:space-y-0 sm:space-x-6">
              <div className="relative">
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=4f46e5&color=fff&size=96`}
                  alt={user?.name}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full border-3 border-white dark:border-gray-800 shadow-lg object-cover"
                />
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Welcome back, <span className="text-primary-600 dark:text-primary-400">{user?.name?.split(' ')[0]}</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Your learning journey continues. Keep pushing forward.</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden w-full lg:w-auto">
              <div className="flex-1 text-center px-5 py-3 border-r border-gray-200 dark:border-gray-700">
                <div className="flex justify-center mb-0.5"><FiActivity className="text-primary-500" size={16} /></div>
                <div className="text-xl font-black text-gray-900 dark:text-white">{activeCount}</div>
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Active</div>
              </div>
              <div className="flex-1 text-center px-5 py-3 border-r border-gray-200 dark:border-gray-700">
                <div className="flex justify-center mb-0.5"><FiBookOpen className="text-accent-500" size={16} /></div>
                <div className="text-xl font-black text-gray-900 dark:text-white">{completedCount}</div>
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Finished</div>
              </div>
              <Link to="/dashboard/certificates" className="flex-1 text-center px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer block">
                <div className="flex justify-center mb-0.5"><FiAward className="text-yellow-500" size={16} /></div>
                <div className="text-xl font-black text-gray-900 dark:text-white">{certificatesCount}</div>
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Certificates</div>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Continue Learning */}
        {continueLearning && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <FiPlayCircle className="mr-2 text-primary-500" size={20} /> Continue Learning
              </h2>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 md:p-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                <img
                  src={continueLearning.course.thumbnail && continueLearning.course.thumbnail !== 'no-photo.jpg' ? continueLearning.course.thumbnail : '/default-course.jpg'}
                  alt={continueLearning.course.title}
                  className="w-full md:w-40 h-24 md:h-24 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-grow w-full">
                  <p className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">{continueLearning.course.category || 'Course'}</p>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">{continueLearning.course.title}</h3>
                  <div className="flex items-center space-x-4 mb-3">
                    <span className="text-xs text-gray-500 font-medium">{continueLearning.progress?.percentComplete || 0}% complete</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden mb-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${continueLearning.progress?.percentComplete || 0}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-primary-500 rounded-full"
                    />
                  </div>
                </div>
                <Button asChild size="lg" className="rounded-xl font-bold shadow-md shadow-primary-500/20 shrink-0 w-full md:w-auto">
                  <Link to={`/learn/${continueLearning.course.slug || continueLearning.course._id}`}>
                    Resume <FiArrowRight className="ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Two Column — Upcoming Live + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Upcoming Live Classes */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <FiVideo className="mr-2 text-accent-500" size={20} /> Upcoming Live Classes
              </h2>
              <Link to="/live-courses" className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline">View All</Link>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              {upcomingLive.length > 0 ? (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {upcomingLive.map((lc) => (
                    <div key={lc._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-accent-50 dark:bg-accent-900/20 flex items-center justify-center text-accent-600 flex-shrink-0">
                          <FiVideo size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{lc.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center">
                            <FiClock className="mr-1" size={11} />
                            {new Date(lc.startDate || lc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <FiVideo className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={28} />
                  <p className="text-sm text-gray-500">No upcoming live classes scheduled</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <FiBell className="mr-2 text-yellow-500" size={20} /> Recent Activity
              </h2>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              {recentNotifs.length > 0 ? (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {recentNotifs.map((notif) => (
                    <div key={notif._id} className={`p-4 transition-colors ${notif.isRead ? '' : 'bg-primary-50/50 dark:bg-primary-900/10'}`}>
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.isRead ? 'bg-gray-300 dark:bg-gray-600' : 'bg-primary-500'}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{notif.title || notif.message}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <FiBell className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={28} />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Enrolled Courses Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <FiBookOpen className="mr-2 text-primary-500" size={20} /> My Courses
            </h2>
            <Link to="/courses" className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center">
              Browse More <FiCompass className="ml-1" size={12} />
            </Link>
          </div>

          {courseEnrollments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {courseEnrollments.map((en, index) => (
                <CourseCard key={en._id} enrollment={en} index={index} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
                <FiCompass size={28} className="text-primary-300 dark:text-primary-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your Journey Begins Here</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                Discover world-class courses and start building the skills that top companies demand.
              </p>
              <Button asChild size="lg" className="rounded-xl px-8 shadow-md shadow-primary-500/20 font-bold">
                <Link to="/courses">Explore Courses</Link>
              </Button>
            </motion.div>
          )}
        </div>

        {/* Live Masterclasses Section */}
        {liveEnrollments.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <FiVideo className="mr-2 text-accent-500" size={20} /> My Live Masterclasses
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {liveEnrollments.map((en) => {
                const fbStatus = feedbackStatuses[en.liveCourse?._id];
                return (
                <div key={en._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-600 bg-accent-50 dark:bg-accent-900/20 px-2.5 py-1 rounded-md">Live Cohort</span>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-3 leading-snug line-clamp-2">{en.liveCourse?.title}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 mb-4">Starts: {new Date(en.liveCourse?.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  
                  <div className="flex flex-col space-y-3">
                    {en.liveCourse?.zoomLink && (
                      <a href={en.liveCourse.zoomLink} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center py-2.5 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                        <FiVideo className="mr-2" /> Join Zoom Session
                      </a>
                    )}
                    {en.liveCourse?.whatsappGroup && (
                      <a href={en.liveCourse.whatsappGroup} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center py-2.5 px-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-bold rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800">
                        <FiCompass className="mr-2" /> WhatsApp Community
                      </a>
                    )}

                    {/* Feedback / Certificate Section */}
                    {fbStatus?.formAvailable && (
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        {fbStatus.isSubmitted ? (
                          <div className="space-y-2">
                            <div className="flex items-center text-xs text-green-600 dark:text-green-400 font-bold">
                              <FiCheckCircle className="mr-1.5" size={14}/> Feedback submitted
                            </div>
                            {fbStatus.certificate && (
                              <a href={fbStatus.certificate.downloadUrl}
                                className="w-full flex items-center justify-center py-2.5 px-4 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-colors">
                                <FiDownload className="mr-2" /> Download Certificate
                              </a>
                            )}
                          </div>
                        ) : fbStatus.isUnlocked ? (
                          <button onClick={() => openFeedbackModal(en.liveCourse._id)}
                            className="w-full flex items-center justify-center py-2.5 px-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-bold rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors border border-amber-200 dark:border-amber-800">
                            <FiMessageSquare className="mr-2" /> Give Feedback & Get Certificate
                          </button>
                        ) : (
                          <div className="flex items-center text-xs text-gray-400 font-medium py-2">
                            <FiLock className="mr-1.5" size={12}/> Feedback available after course completion
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        <FeedbackFormModal
          isOpen={feedbackModalOpen}
          onClose={() => { setFeedbackModalOpen(false); setActiveFeedbackForm(null); }}
          formData={activeFeedbackForm}
          liveCourseId={activeLiveCourseId}
          onSuccess={handleFeedbackSuccess}
        />

      </div>
    </div>
  );
};

export default Dashboard;

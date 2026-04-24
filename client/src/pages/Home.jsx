import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiUsers, FiAward, FiVideo, FiBookOpen, FiCalendar, FiClock } from 'react-icons/fi';
import CourseCard from '../components/common/CourseCard';
import axios from 'axios';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [liveCourses, setLiveCourses] = useState([]);
  const [stats, setStats] = useState({ totalCourses: 0, totalStudents: 0, totalCertificates: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, statsRes, liveRes] = await Promise.all([
          axios.get('/api/courses?limit=3'),
          axios.get('/api/stats').catch(() => ({ data: { data: { totalCourses: 0, totalStudents: 0, totalCertificates: 0 } } })),
          axios.get('/api/live-courses?limit=3').catch(() => ({ data: { data: [] } }))
        ]);
        setCourses(coursesRes.data.data?.slice(0, 3) || []);
        setStats(statsRes.data.data || {});
        setLiveCourses(liveRes.data.data?.slice(0, 3) || []);
      } catch (err) {
        console.error('Failed to fetch home data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 md:py-28 bg-gray-50 dark:bg-gray-950 overflow-hidden min-h-[85vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-40 -right-40 w-125 h-125 rounded-full bg-primary-400/15 blur-[120px] animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-125500px] rounded-full bg-accent-400/15 blur-[120px] animate-float" style={{ animationDelay: '3s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold text-xs mb-6 border border-primary-200 dark:border-primary-800">
                <span className="flex h-2 w-2 rounded-full bg-primary-600 mr-2 animate-pulse"></span>
                Enterprise Learning Platform
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight mb-6">
                Master Your Craft. <br />
                <span className="bg-linear-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                  Advance Your Career.
                </span>
              </h1>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg leading-relaxed">
                World-class courses, interactive assessments, and professional certifications from industry experts. Build the skills that modern enterprises demand.
              </p>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <Link to="/courses" className="px-7 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-center shadow-lg shadow-primary-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center text-sm">
                  Explore Courses <FiArrowRight className="ml-2" />
                </Link>
                <Link to="/register" className="px-7 py-3.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 rounded-xl font-bold text-center transition-all hover:shadow-md flex items-center justify-center text-sm">
                  Start Learning
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <div className="flex items-center"><FiCheckCircle className="mr-1.5 text-primary-500" size={14} /> Auto-graded Quizzes</div>
                <div className="flex items-center"><FiCheckCircle className="mr-1.5 text-primary-500" size={14} /> Career Certificates</div>
                <div className="flex items-center"><FiCheckCircle className="mr-1.5 text-primary-500" size={14} /> Lifetime Access</div>
              </div>
            </motion.div>

            {/* Hero Right — Stats Cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative w-full max-w-xl xl:max-w-2xl mx-auto">
                <div className="absolute inset-0 bg-linear-to-tr from-primary-600/20 to-accent-400/20 rounded-full blur-3xl animate-pulse"></div>
                <img
                  src="/FWTiZON_hero.png"
                  alt="Students collaborating and learning"
                  className="rounded-3xl shadow-2xl object-cover w-full h-auto border-4 border-white dark:border-gray-800 relative z-10"
                />

                {/* Floating Stat — Students */}
                <motion.div
                  animate={{ y: [-8, 8, -8] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -left-8 top-20 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-20 flex items-center space-x-3"
                >
                  <div className="h-11 w-11 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-accent-600">
                    <FiUsers size={22} />
                  </div>
                  <div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">{stats.totalStudents || 0}+</div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Students</div>
                  </div>
                </motion.div>

                {/* Floating Stat — Certificates */}
                <motion.div
                  animate={{ y: [8, -8, 8] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -right-6 bottom-0 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-20 flex items-center space-x-3"
                >
                  <div className="h-11 w-11 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                    <FiAward size={22} />
                  </div>
                  <div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">{stats.totalCertificates || 0}+</div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Certificates</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 bg-white dark:bg-gray-950 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">Featured Courses</h2>
              <p className="text-gray-600 dark:text-gray-400 text-base">Top-rated courses from industry experts to accelerate your career growth.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-4 md:mt-0"
            >
              <Link to="/courses" className="text-primary-600 dark:text-primary-400 font-semibold hover:text-primary-700 flex items-center text-sm transition-colors">
                View All Courses <FiArrowRight className="ml-1.5" />
              </Link>
            </motion.div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-95 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-shimmer"></div>
              ))}
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, i) => (
                <CourseCard key={course._id} course={course} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <FiBookOpen size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No courses available yet</h3>
              <p className="text-gray-500 text-sm">Check back soon for new learning opportunities.</p>
            </div>
          )}
        </div>
      </section>

      {/* Live Courses */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold mb-3 text-[10px] uppercase tracking-widest border border-red-200 dark:border-red-800/50">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                LIVE COURSES
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">Interactive Live Cohorts</h2>
              <p className="text-gray-600 dark:text-gray-400 text-base">Join small batches of ambitious peers and learn directly from industry experts in real-time.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-4 md:mt-0"
            >
              <Link to="/live-cohorts" className="text-red-600 dark:text-red-400 font-semibold hover:text-red-700 flex items-center text-sm transition-colors">
                View All Live Courses <FiArrowRight className="ml-1.5" />
              </Link>
            </motion.div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-95 bg-white dark:bg-gray-800 rounded-3xl animate-shimmer shadow-sm"></div>
              ))}
            </div>
          ) : liveCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveCourses.map((cohort, i) => {
                const spotsLeft = Math.max(0, (cohort.maxStudents || 30) - (cohort.currentEnrollments || 0));
                const isFull = spotsLeft === 0;

                return (
                  <motion.div
                    key={cohort._id || i}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-black/20 flex flex-col group hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700">
                          {cohort.category || "Masterclass"}
                        </span>
                      </div>
                      {isFull ? (
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold rounded-lg text-[10px] uppercase tracking-wider whitespace-nowrap border border-gray-200 dark:border-gray-700">
                          Sold Out
                        </span>
                      ) : spotsLeft <= 5 ? (
                        <span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold rounded-lg text-[10px] uppercase tracking-wider whitespace-nowrap border border-red-200 dark:border-red-800/50">
                          {spotsLeft} spots left
                        </span>
                      ) : null}
                    </div>

                    {cohort.thumbnail && cohort.thumbnail !== 'no-photo-live.jpg' && (
                      <div className="w-full h-36 mb-4 relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <img src={cohort.thumbnail} alt={cohort.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
                      </div>
                    )}

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 leading-snug line-clamp-2">{cohort.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium text-xs">with {cohort.instructor?.name || 'Expert Instructor'}</p>

                    <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex-grow">
                      <div className="flex flex-col p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm">
                        <span className="text-gray-500 dark:text-gray-400 text-[9px] font-bold uppercase tracking-wider mb-0.5 flex items-center"><FiCalendar className="mr-1" size={10} /> Starts</span>
                        <span className="font-bold text-gray-900 dark:text-white text-[11px]">{new Date(cohort.startDate || cohort.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex flex-col p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm">
                        <span className="text-gray-500 dark:text-gray-400 text-[9px] font-bold uppercase tracking-wider mb-0.5 flex items-center"><FiClock className="mr-1" size={10} /> Duration</span>
                        <span className="font-bold text-gray-900 dark:text-white text-[11px]">{cohort.duration || '4 Weeks'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mt-auto gap-3">
                      <div className="flex flex-col items-center sm:items-start">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Enrollment</span>
                        <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">₹{cohort.price}</div>
                      </div>
                      <Link
                        to={`/live-course/${cohort._id}`}
                        className={`w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-600/20 active:scale-[0.98] font-bold rounded-xl transition-all text-xs flex items-center justify-center`}
                      >
                        View Details
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <FiVideo size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Live Courses Available</h3>
              <p className="text-gray-500 text-sm">Check back soon for new live learning opportunities.</p>
            </div>
          )}
        </div>
      </section>

      {/* Why Fwtion Section */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">Why learn with Fwtizon?</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-base">Everything you need to upskill effectively in an enterprise-grade learning environment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{
              icon: <FiVideo className="text-primary-600" size={28} />,
              title: "World Class Content",
              desc: "HD videos, comprehensive notes, and expertly crafted curriculum designed by senior industry engineers."
            }, {
              icon: <FiCheckCircle className="text-accent-500" size={28} />,
              title: "Interactive Assessments",
              desc: "Test your knowledge after every module with auto-graded quizzes to reinforce learning."
            }, {
              icon: <FiAward className="text-yellow-500" size={28} />,
              title: "Verified Certificates",
              desc: "Earn verifiable certificates upon completing assessments to showcase your professional skills."
            }].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-gray-900 p-7 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-700 transition-all text-center group"
              >
                <div className="w-14 h-14 mx-auto bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary-600 to-primary-800 dark:from-primary-900 dark:to-gray-950"></div>
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-black text-white mb-5">Ready to transform your career?</h2>
              <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">Join our enterprise learning platform and unlock your potential with our library of professional courses.</p>
              <Link to="/register" className="inline-block px-8 py-4 bg-white text-primary-600 hover:bg-gray-50 rounded-xl font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl">
                Create Free Account
              </Link>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;

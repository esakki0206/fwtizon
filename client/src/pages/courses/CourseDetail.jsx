import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlay, FiBookOpen, FiClock, FiStar, FiCheck, FiLock, FiVideo, FiAward, FiChevronDown, FiChevronUp, FiUsers } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import CourseReviews from './CourseReviews';

const CourseDetail = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await axios.get(`/api/courses/${id}`);
        setCourse(res.data.data);
        // Auto-expand first module
        if (res.data.data?.modules?.[0]) {
          setExpandedModules({ 0: true });
        }
      } catch (err) {
        toast.error('Failed to load course details');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  const toggleModule = (index) => {
    setExpandedModules(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gray-950 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <div className="h-6 w-24 bg-gray-800 rounded-full animate-shimmer"></div>
            <div className="h-12 w-3/4 bg-gray-800 rounded-xl animate-shimmer"></div>
            <div className="h-6 w-full bg-gray-800 rounded-lg animate-shimmer"></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!course) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <FiBookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Course not found</h2>
        <p className="text-gray-500 text-sm mb-4">The course you're looking for doesn't exist or has been removed.</p>
        <Button asChild><Link to="/courses">Browse Courses</Link></Button>
      </div>
    </div>
  );

  const totalLessons = course.modules?.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0) || 0;
  const totalDuration = course.modules?.reduce((acc, mod) =>
    acc + (mod.lessons?.reduce((a, l) => a + (l.duration || 600), 0) || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16 font-sans">
      {/* Hero Section */}
      <div className="bg-gray-950 text-white py-14 md:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-900/25 rounded-full blur-[100px] -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-accent-900/15 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex items-center space-x-2 text-xs text-primary-400 font-bold uppercase tracking-widest mb-5">
              <span className="px-3 py-1 bg-primary-900/40 rounded-full border border-primary-800">{course.category || 'General'}</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl md:text-5xl font-black mb-5 leading-tight tracking-tight">
              {course.title}
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-base md:text-lg text-gray-400 mb-8 max-w-2xl leading-relaxed">
              {course.description}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-4 text-sm text-gray-300 font-medium">
              <span className="flex items-center text-yellow-500 font-bold bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20 text-xs">
                <FiStar className="mr-1 fill-current" size={13} /> {course.ratings?.toFixed(1) || 'N/A'}
              </span>
              <span className="flex items-center text-xs"><FiUsers className="mr-1.5" size={13} />{course.numReviews || 0} reviews</span>
              <span className="flex items-center text-xs"><FiBookOpen className="mr-1.5" size={13} />{totalLessons} lessons</span>
              <span className="flex items-center text-xs"><FiClock className="mr-1.5" size={13} />{Math.round(totalDuration / 3600)}h {Math.round((totalDuration % 3600) / 60)}m</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-8 flex items-center space-x-3">
              <img src={course.instructor?.avatar || 'https://ui-avatars.com/api/?name=Admin&background=4f46e5&color=fff'} className="w-11 h-11 rounded-full border-2 border-white/10 shadow-lg object-cover" alt="instructor" />
              <div>
                <p className="font-bold text-white text-sm">{course.instructor?.name || 'Fwtion Academy'}</p>
                <p className="text-xs text-gray-500">Lead Instructor</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 lg:-mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 mt-10 lg:mt-24">

            {/* What You'll Learn */}
            {course.learningOutcomes && course.learningOutcomes.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">What You'll Learn</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.learningOutcomes.map((outcome, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <FiCheck className="text-accent-500 mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Curriculum */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Course Curriculum</h2>
                <span className="text-gray-500 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-xs">
                  {course.modules?.length || 0} Modules • {totalLessons} Lessons
                </span>
              </div>

              <div className="space-y-3">
                {course.modules?.length > 0 ? (
                  course.modules.map((mod, index) => (
                    <div key={mod._id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden transition-all">
                      <button
                        onClick={() => toggleModule(index)}
                        className="w-full bg-gray-50 dark:bg-gray-800/50 p-4 font-semibold text-gray-900 dark:text-white flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <span className="text-sm">Part {index + 1}: {mod.title}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold">{mod.lessons?.length || 0} Lessons</span>
                          {expandedModules[index] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                        </div>
                      </button>

                      {expandedModules[index] && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="divide-y divide-gray-50 dark:divide-gray-800/50">
                          {mod.lessons?.map((lesson) => (
                            <div key={lesson._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors gap-2">
                              <div className="flex items-center text-gray-700 dark:text-gray-300">
                                {lesson.type === 'video' ? <FiVideo className="mr-3 text-primary-500/60" size={16} /> : <FiBookOpen className="mr-3 text-accent-500/60" size={16} />}
                                <span className={`text-sm ${lesson.isPreview ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium'}`}>{lesson.title}</span>
                              </div>
                              <div className="flex items-center space-x-3 text-xs ml-7 sm:ml-0">
                                {lesson.isPreview ? (
                                  <span className="text-green-600 dark:text-green-400 font-bold text-[10px] bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full uppercase tracking-wider border border-green-200 dark:border-green-800">Preview</span>
                                ) : (
                                  <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-full"><FiLock className="text-gray-400" size={11} /></div>
                                )}
                                <span className="text-gray-500 font-mono text-[11px]">{Math.floor((lesson.duration || 600) / 60)} min</span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                    <FiClock className="mx-auto text-3xl text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Curriculum is being drafted by the instructor...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Instructor Info */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">About the Instructor</h2>
              <div className="flex items-start space-x-4">
                <img
                  src={course.instructor?.avatar || 'https://ui-avatars.com/api/?name=Admin&background=4f46e5&color=fff&size=96'}
                  alt={course.instructor?.name}
                  className="w-16 h-16 rounded-full border-2 border-gray-100 dark:border-gray-800 object-cover flex-shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{course.instructor?.name || 'Fwtion Academy'}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 mb-2">Lead Enterprise Instructor</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {course.instructor?.bio || 'Experienced professional with deep industry expertise, delivering high-quality content to help learners master critical skills.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Student Reviews</h2>
              <CourseReviews courseId={course._id} />
            </div>
          </div>

          {/* Checkout Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-white dark:bg-gray-900 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden z-30">
              <div className="aspect-video relative bg-gray-900">
                <img
                  src={course.thumbnail && course.thumbnail !== 'no-photo.jpg' ? course.thumbnail : '/default-course.jpg'}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <div className="w-16 h-16 bg-white/25 backdrop-blur-lg rounded-full flex items-center justify-center shadow-xl">
                    <FiPlay className="text-white fill-current ml-1.5" size={28} />
                  </div>
                </div>
              </div>

              <div className="p-6">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  ₹{course.price}
                </span>
                <div className="text-xs font-bold text-green-500 uppercase tracking-widest mb-6">One-time payment</div>

                <Button
                  onClick={() => alert('Payment flow initiated via RazorPay')}
                  size="lg"
                  className="w-full h-12 rounded-xl font-bold text-sm shadow-lg shadow-primary-600/25 transition-all active:scale-[0.98] mb-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
                >
                  Enroll Now
                </Button>

                <p className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                  <FiCheck className="inline mr-1 text-green-500" size={12} /> 30-Day Money-Back Guarantee
                </p>

                <div className="space-y-3.5 text-sm text-gray-600 dark:text-gray-400">
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider mb-1">This course includes:</h4>
                  <div className="flex items-center text-xs"><FiVideo className="mr-3 text-primary-500/70" size={15} /> {totalLessons} detailed lessons</div>
                  <div className="flex items-center text-xs"><FiBookOpen className="mr-3 text-accent-500/70" size={15} /> Interactive quizzes & assessments</div>
                  <div className="flex items-center text-xs"><FiAward className="mr-3 text-yellow-500/70" size={15} /> Certificate of completion</div>
                  <div className="flex items-center text-xs"><FiClock className="mr-3 text-gray-500/70" size={15} /> Full lifetime access</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CourseDetail;

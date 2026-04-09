import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence } from 'framer-motion';
import { FiVideo, FiCalendar, FiUsers, FiClock, FiCheckCircle, FiChevronDown, FiBookOpen, FiStar, FiFileText } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const LiveCourseDetail = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ fullName: user?.name || '', email: user?.email || '', phone: '', message: '' });

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/live-courses/${courseId}`);
        setCourse(res.data?.data || null);
      } catch (err) {
        if (err.response?.status === 404) {
          setCourse(null);
        } else {
          toast.error(err.response?.data?.message || 'Failed to load course details');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center space-x-3">
      <div className="w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      <p className="text-gray-500 font-medium">Loading course details...</p>
    </div>
  );

  if (!course) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <FiVideo size={64} className="text-gray-300 dark:text-gray-700 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Live Cohort Not Found</h2>
      <p className="text-gray-500 mb-6">The course you are looking for does not exist or has been removed.</p>
      <Link to="/live-courses" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">
        Browse Available Cohorts
      </Link>
    </div>
  );

  const isFull = course.currentEnrollments >= course.maxStudents;
  const isEnrolledLocally = user?.enrollments?.includes(course._id) || false;

  const handleEnrollButton = () => {
    if (!user) {
      toast.error('Please log in to apply for this course.');
      navigate('/login');
      return;
    }
    setFormData(prev => ({ ...prev, fullName: user.name || '', email: user.email || '' }));
    setIsModalOpen(true);
  };

  const processPayment = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone) {
      return toast.error("Please fill all required fields");
    }
    setIsModalOpen(false);

    const toastId = toast.loading('Initializing secure checkout...');

    try {
      const { data: orderData } = await axios.post('/api/enroll/create-order', { liveCourseId: course._id });

      const isMockOrder = orderData.data.id?.startsWith('order_mock_');
      if (isMockOrder) {
        await axios.post('/api/enroll/verify-payment', {
          razorpay_order_id: orderData.data.id,
          razorpay_payment_id: `mock_pay_${Date.now()}`,
          razorpay_signature: 'mock_signature',
          liveCourseId: course._id,
          ...formData
        });
        toast.success('Enrolled successfully! Redirecting...', { id: toastId });
        navigate('/dashboard');
        return;
      }

      toast.dismiss(toastId);
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.data.amount,
        currency: 'INR',
        name: 'Fwtion Academy',
        description: `Enrollment in ${course.title}`,
        image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        order_id: orderData.data.id,
        handler: async function (response) {
          const verifyingToast = toast.loading('Verifying payment...');
          try {
            await axios.post('/api/enroll/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              liveCourseId: course._id,
              ...formData
            });
            toast.success('Enrolled successfully! Redirecting...', { id: verifyingToast });
            navigate('/dashboard');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed', { id: verifyingToast });
          }
        },
        prefill: {
          name: formData.fullName || user.name || '',
          email: formData.email || user.email || '',
          contact: formData.phone || '',
        },
        theme: { color: '#4f46e5' }
      };

      const rp = new window.Razorpay(options);
      rp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate checkout', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative items-start">
          
          {/* LEFT SECTION - MAIN CONTENT */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* Header / Intro */}
            <div className="space-y-3 md:space-y-4">
              <span className="inline-flex items-center px-2.5 py-0.5 md:px-3 md:py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-xs font-bold uppercase tracking-widest border border-primary-200 dark:border-primary-800/30">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mr-1.5 md:mr-2 animate-pulse" />
                Live Cohort
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                {course.title}
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl">
                {course.description}
              </p>

              {/* Instructor Mini Profile */}
              <div className="flex items-center mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-800/80">
                <img 
                  src={course.instructor?.avatar || `https://ui-avatars.com/api/?name=${course.instructor?.name || 'Instructor'}&background=4f46e5&color=fff`} 
                  alt={course.instructor?.name || 'Instructor'} 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white dark:border-gray-800 shadow-md object-cover"
                />
                <div className="ml-3 md:ml-4 flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Instructor</span>
                  <span className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                    {course.instructor?.name || 'Expert Instructor'}
                  </span>
                </div>
              </div>
            </div>

            {/* Thumbnail Box */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl bg-gray-900 aspect-video w-full relative group">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center text-gray-600">
                  <FiVideo size={64} className="mb-4 opacity-50" />
                  <span className="font-semibold tracking-wide uppercase text-sm">NO PREVIEW AVAILABLE</span>
                </div>
              )}
            </div>

            {/* Content Sections Wrapper */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              
              {/* Learning Objectives */}
              {course.learningObjectives && course.learningObjectives.length > 0 && (
                <div className="p-4 md:p-6 lg:p-8 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center">
                    <FiCheckCircle className="mr-2 md:mr-3 text-primary-500 shrink-0" size={20} /> What you will learn
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {course.learningObjectives.map((obj, idx) => (
                      <div key={idx} className="flex items-start">
                        <FiCheckCircle className="text-green-500 mt-0.5 mr-2 md:mr-3 shrink-0" size={16} />
                        <span className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed">{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Curriculum */}
              {course.curriculum && course.curriculum.length > 0 && (
                <div className="p-4 md:p-6 lg:p-8 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center">
                    <FiBookOpen className="mr-2 md:mr-3 text-primary-500 shrink-0" size={20} /> Curriculum
                  </h2>
                  <div className="space-y-3 md:space-y-4">
                    {course.curriculum.map((mod, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5 border border-gray-100 dark:border-gray-800">
                        <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-white mb-1.5 md:mb-2 flex items-center">
                          <span className="text-xs font-black text-primary-600 dark:text-primary-400 mr-2 md:mr-3">MOD {idx + 1}</span>
                          {mod.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm ml-8 md:ml-12">
                          {mod.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule */}
              {course.schedule && course.schedule.length > 0 && (
                <div className="p-4 md:p-6 lg:p-8 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center">
                    <FiCalendar className="mr-2 md:mr-3 text-primary-500 shrink-0" size={20} /> Group Schedule
                  </h2>
                  <div className="overflow-hidden rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-800">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 text-xs md:text-sm">
                          <th className="py-2 md:py-3 px-2 md:px-4 font-bold border-b border-gray-200 dark:border-gray-700">Day</th>
                          <th className="py-2 md:py-3 px-2 md:px-4 font-bold border-b border-gray-200 dark:border-gray-700">Time</th>
                          <th className="py-2 md:py-3 px-2 md:px-4 font-bold border-b border-gray-200 dark:border-gray-700">Topic</th>
                        </tr>
                      </thead>
                      <tbody>
                        {course.schedule.map((slot, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                            <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-semibold text-gray-900 dark:text-white">{slot.day}</td>
                            <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm text-gray-600 dark:text-gray-400 flex items-center"><FiClock className="mr-1 md:mr-2 opacity-60" size={14} />{slot.time}</td>
                            <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm text-gray-600 dark:text-gray-400">{slot.topic}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Requirements & FAQs */}
              <div className="p-4 md:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {course.requirements && course.requirements.length > 0 && (
                  <div>
                    <h3 className="text-lg md:text-lg font-bold text-gray-900 dark:text-white mb-3 md:mb-4">Requirements</h3>
                    <ul className="space-y-2 md:space-y-3">
                      {course.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          <FiStar className="mt-0.5 mr-2 md:mr-3 text-primary-500 shrink-0" size={14} />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {course.faqs && course.faqs.length > 0 && (
                  <div>
                    <h3 className="text-lg md:text-lg font-bold text-gray-900 dark:text-white mb-3 md:mb-4">FAQ</h3>
                    <div className="space-y-2 md:space-y-3">
                      {course.faqs.map((faq, idx) => (
                        <div key={idx} className="border border-gray-200 dark:border-gray-800 rounded-lg md:rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/20">
                          <button 
                            onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                            className="w-full text-left px-3 md:px-4 py-2.5 md:py-3 flex justify-between items-center text-xs md:text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800/40 transition"
                          >
                            {faq.question}
                            <FiChevronDown className={`transform transition-transform shrink-0 ml-2`} size={16} style={{transform: activeFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)'}} />
                          </button>
                          <AnimatePresence>
                            {activeFaq === idx && (
                              <motion.div 
                                initial={{ height: 0 }} 
                                animate={{ height: 'auto' }} 
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                                  {faq.answer}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SECTION - STICKY CARD */}
          <div className="xl:col-span-1">
            <div className="sticky top-20 md:top-28 bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col order-first xl:order-last">
              
              {/* Card Header pricing */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 md:p-6 border-b border-gray-100 dark:border-gray-800">
                <span className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2">Registration Fee</span>
                <div className="flex items-baseline mb-1.5 md:mb-2">
                  <span className="text-3xl sm:text-4xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">₹{course.price}</span>
                </div>
                <div className="text-xs md:text-sm font-medium text-green-600 dark:text-green-400 flex items-center">
                  <FiClock className="mr-1" size={14} /> Enrolling now
                </div>
              </div>

              {/* Card Body Metrics */}
              <div className="p-4 md:p-6 space-y-3 md:space-y-5">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block mb-0.5 md:mb-1">Start Date</span>
                    <span className="text-sm md:text-base font-bold text-gray-900 dark:text-white flex items-center">
                      {new Date(course.startDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-0.5 md:mb-1">Duration</span>
                    <span className="text-sm md:text-base font-bold text-gray-900 dark:text-white flex items-center">
                       {course.duration || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-0.5 md:mb-1">Total Seats</span>
                    <span className="text-sm md:text-base font-bold text-gray-900 dark:text-white flex items-center">
                       {course.maxStudents}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-0.5 md:mb-1">Availability</span>
                    <span className={`text-sm md:text-base font-bold flex items-center ${isFull ? 'text-red-500' : 'text-primary-600 dark:text-primary-400'}`}>
                       {course.maxStudents - course.currentEnrollments} left
                    </span>
                  </div>
                </div>

                <hr className="border-gray-100 dark:border-gray-800" />

                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-start text-xs md:text-sm">
                    <FiVideo className="mt-0.5 mr-2 md:mr-3 text-gray-400 shrink-0" size={14} />
                    <span className="text-gray-700 dark:text-gray-300">Live Interactive Zoom Sessions</span>
                  </div>
                  <div className="flex items-start text-xs md:text-sm">
                    <FiUsers className="mt-0.5 mr-2 md:mr-3 text-gray-400 shrink-0" size={14} />
                    <span className="text-gray-700 dark:text-gray-300">Exclusive Cohort Community</span>
                  </div>
                  <div className="flex items-start text-xs md:text-sm">
                    <FiFileText className="mt-0.5 mr-2 md:mr-3 text-gray-400 shrink-0" size={14} />
                    <span className="text-gray-700 dark:text-gray-300">Hands-on Assignments & Projects</span>
                  </div>
                </div>

                <div className="pt-2 md:pt-3">
                  {isEnrolledLocally ? (
                    <button 
                      onClick={() => navigate('/dashboard')}
                      className="w-full py-3 md:py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-sm md:text-base rounded-lg md:rounded-xl transition-all shadow-md shadow-green-500/20 active:scale-[0.98] flex items-center justify-center"
                    >
                      <FiCheckCircle className="mr-2" size={16} /> Resume Outline
                    </button>
                  ) : isFull ? (
                    <button disabled className="w-full py-3 md:py-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-sm md:text-base rounded-lg md:rounded-xl cursor-not-allowed flex items-center justify-center">
                      Cohort Full
                    </button>
                  ) : (
                    <button 
                      onClick={handleEnrollButton}
                      className="w-full py-3 md:py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm md:text-base rounded-lg md:rounded-xl transition-all shadow-xl shadow-primary-600/30 active:scale-[0.98] flex items-center justify-center"
                    >
                      Apply Now
                    </button>
                  )}
                  <p className="text-center text-xs text-gray-500 mt-2 md:mt-3 flex items-center justify-center gap-1">
                    <svg className="w-3 h-3 opacity-70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                    Secure Checkout
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Enrollment Modal */}
      <AnimatePresence>
        {isModalOpen && course && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800"
            >
              <div className="p-4 sm:p-5 md:p-6 lg:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">Enrollment Application</h2>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-4 md:mb-6">Complete checkout for <strong>{course.title}</strong>.</p>
                
                <form onSubmit={processPayment} className="space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm focus:ring-2 focus:ring-primary-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm focus:ring-2 focus:ring-primary-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number <span className="text-red-500">*</span></label>
                    <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm focus:ring-2 focus:ring-primary-500 transition-colors" />
                  </div>
                  
                  <div className="pt-4 md:pt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 md:py-3.5 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs md:text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 md:py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs md:text-sm rounded-lg md:rounded-xl transition shadow-xl shadow-primary-600/20 active:scale-[0.98]">
                      Pay ₹{course.price}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveCourseDetail;

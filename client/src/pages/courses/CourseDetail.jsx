import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiPlay, FiBookOpen, FiClock, FiStar, FiCheck, FiLock,
  FiVideo, FiAward, FiChevronDown, FiChevronUp, FiUsers, FiLink,
} from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import CourseReviews from './CourseReviews';
import { useAuth } from '../../context/AuthContext';

// ── Load Razorpay SDK from CDN (idempotent) ──────────────────────────────────
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [eligibleForFree, setEligibleForFree] = useState(false);
  const [autoEnrolling, setAutoEnrolling] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await axios.get(`/api/courses/${id}`);
        setCourse(res.data.data);
        if (res.data.data?.modules?.[0]) setExpandedModules({ 0: true });
      } catch {
        toast.error('Failed to load course details');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  // Check if user is already enrolled (lightweight single-course check)
  useEffect(() => {
    if (!user || !course) return;
    const checkEnrollment = async () => {
      try {
        setEnrollmentLoading(true);
        const res = await axios.get(`/api/enroll/status?courseId=${course._id}`);
        setIsEnrolled(res.data?.enrolled === true);
      } catch {
        // Non-fatal
      } finally {
        setEnrollmentLoading(false);
      }
    };
    checkEnrollment();
  }, [user, course]);

  // Check if user is eligible for free auto-enrollment via linked live course
  useEffect(() => {
    if (!user || !course || isEnrolled) return;
    const checkFreeEligibility = async () => {
      try {
        const res = await axios.post('/api/enroll/check-eligibility', { courseId: course._id });
        setEligibleForFree(res.data?.eligibleForFree === true);
      } catch {
        // Non-fatal — user simply won't see the free option
      }
    };
    checkFreeEligibility();
  }, [user, course, isEnrolled]);

  const toggleModule = (index) =>
    setExpandedModules((prev) => ({ ...prev, [index]: !prev[index] }));

  // ── Coupon Logic ───────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setCouponLoading(true);
    try {
      const res = await axios.post('/api/coupons/validate', {
        code: couponCodeInput.trim(),
        courseId: course._id,
      });
      setAppliedCoupon(res.data.data);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
  };

  // ── Auto-Enroll (Free via Live Course) ───────────────────────────────────
  const handleAutoEnroll = async () => {
    if (!user) {
      toast.error('Please log in to enroll');
      navigate('/login');
      return;
    }
    try {
      setAutoEnrolling(true);
      await axios.post('/api/enroll/auto-enroll', { courseId: course._id });
      toast.success('🎉 Enrolled for free via your live course!');
      setIsEnrolled(true);
      setTimeout(() => navigate(`/learn/${course.slug || course._id}`), 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Auto-enrollment failed');
    } finally {
      setAutoEnrolling(false);
    }
  };

  // ── Razorpay checkout flow ────────────────────────────────────────────────
  const handleEnroll = async () => {
    if (!user) {
      toast.error('Please log in to enroll');
      navigate('/login');
      return;
    }
    if (isEnrolled) {
      navigate(`/learn/${course.slug || course._id}`);
      return;
    }

    try {
      setEnrolling(true);

      // ── Admin Bypass Logic ──
      const adminEmail = import.meta.env.VITE_ADMIN_BYPASS_EMAIL;
      if (adminEmail && user.email === adminEmail) {
        const verifyRes = await axios.post('/api/enroll/verify-payment', {
          courseId: course._id,
          email: user.email,
          fullName: user.name || '',
        });

        if (verifyRes.data.bypass) {
          toast.success('Enrolled successfully (Admin Access)');
          setIsEnrolled(true);
          setEnrolling(false);
          setTimeout(() => navigate(`/learn/${course.slug || course._id}`), 1200);
          return;
        }
      }

      // 1. Load Razorpay SDK
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) {
        toast.error('Payment gateway failed to load. Check your internet connection.');
        setEnrolling(false);
        return;
      }

      // 2. Create order on backend — amount comes from DB, not frontend
      const orderRes = await axios.post('/api/enroll/create-order', {
        courseId: course._id,
        couponCode: appliedCoupon?.code,
      });
      if (!orderRes.data.success) {
        toast.error(orderRes.data.message || 'Failed to initiate payment');
        setEnrolling(false);
        return;
      }

      const { id: orderId, amount, key_id: keyId, is_free } = orderRes.data.data;

      // 3. Handle Free Course / 100% Coupon Mock Order
      if (is_free || orderId.startsWith('order_mock_')) {
        try {
          const verifyRes = await axios.post('/api/enroll/verify-payment', {
            razorpay_order_id: orderId,
            razorpay_payment_id: `mock_pay_${Date.now()}`,
            razorpay_signature: 'mock_signature',
            courseId: course._id,
            fullName: user.name || '',
            email: user.email || '',
            couponCode: appliedCoupon?.code,
          });

          if (verifyRes.data.success) {
            toast.success('🎉 Enrolled successfully!');
            setIsEnrolled(true);
            setEnrolling(false);
            setTimeout(() => navigate(`/learn/${course.slug || course._id}`), 1200);
          } else {
            toast.error('Payment verification failed.');
            setEnrolling(false);
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Verification failed');
          setEnrolling(false);
        }
        return;
      }

      // 4. Open Razorpay checkout modal
      const options = {
        key: keyId,
        amount,                             // in paise — as returned by backend
        currency: 'INR',
        name: 'Fwtion Academy',
        description: course.title,
        image: course.thumbnail && course.thumbnail !== 'no-photo.jpg' ? course.thumbnail : undefined,
        order_id: orderId,
        prefill: {
          name: user.name || '',
          email: user.email || '',
        },
        theme: { color: '#4f46e5' },
        // ── Success handler ──
        handler: async (response) => {
          try {
            const verifyRes = await axios.post('/api/enroll/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId: course._id,
              fullName: user.name || '',
              email: user.email || '',
              couponCode: appliedCoupon?.code,
            });

            if (verifyRes.data.success) {
              toast.success('🎉 Enrolled successfully!');
              setIsEnrolled(true);
              setEnrolling(false);
              // Navigate to the learning page
              setTimeout(() => navigate(`/learn/${course.slug || course._id}`), 1200);
            } else {
              toast.error('Payment verification failed. Contact support.');
              setEnrolling(false);
            }
          } catch (err) {
            console.error('Verify payment error:', err);
            toast.error(err.response?.data?.message || 'Payment verification failed. Contact support.');
            setEnrolling(false);
          }
        },
        // ── Dismiss / failure handler ──
        modal: {
          ondismiss: () => {
            toast('Payment cancelled', { icon: 'ℹ️' });
            setEnrolling(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        console.error('Razorpay payment failed:', resp.error);
        toast.error(`Payment failed: ${resp.error.description || 'Unknown error'}`);
        setEnrolling(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Enroll error:', err);
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
      setEnrolling(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gray-950 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <div className="h-6 w-24 bg-gray-800 rounded-full animate-shimmer" />
            <div className="h-12 w-3/4 bg-gray-800 rounded-xl animate-shimmer" />
            <div className="h-6 w-full bg-gray-800 rounded-lg animate-shimmer" />
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
        <p className="text-gray-500 text-sm mb-4">This course doesn't exist or has been removed.</p>
        <Button asChild><Link to="/courses">Browse Courses</Link></Button>
      </div>
    </div>
  );

  // ── Derived values ──────────────────────────────────────────────────────
  const totalLessons = course.modules?.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0) || 0;
  const totalDuration = course.modules?.reduce(
    (acc, mod) => acc + (mod.lessons?.reduce((a, l) => a + (l.duration || 600), 0) || 0), 0
  ) || 0;

  // instructorName/Photo with display overrides from admin
  const instructorName = course.displayInstructorName || course.instructor?.name || 'Fwtion Academy';
  const instructorPhoto = course.displayInstructorPhoto || course.instructor?.avatar || '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16 font-sans">

      {/* ── Hero Section ── */}
      <div className="bg-gray-950 text-white py-14 md:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-900/25 rounded-full blur-[100px] -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-accent-900/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 text-xs text-primary-400 font-bold uppercase tracking-widest mb-5"
            >
              <span className="px-3 py-1 bg-primary-900/40 rounded-full border border-primary-800">
                {course.category || 'General'}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-black mb-5 leading-tight tracking-tight"
            >
              {course.title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-base md:text-lg text-gray-400 mb-8 max-w-2xl leading-relaxed"
            >
              {course.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-4 text-sm text-gray-300 font-medium"
            >
              <span className="flex items-center text-yellow-500 font-bold bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20 text-xs">
                <FiStar className="mr-1 fill-current" size={13} /> {course.ratings?.toFixed(1) || 'N/A'}
              </span>
              <span className="flex items-center text-xs"><FiUsers className="mr-1.5" size={13} />{course.numReviews || 0} reviews</span>
              <span className="flex items-center text-xs"><FiBookOpen className="mr-1.5" size={13} />{totalLessons} lessons</span>
              <span className="flex items-center text-xs">
                <FiClock className="mr-1.5" size={13} />
                {Math.floor(totalDuration / 3600)}h {Math.round((totalDuration % 3600) / 60)}m
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-8 flex items-center space-x-3"
            >
              <img
                src={
                  instructorPhoto ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=4f46e5&color=fff`
                }
                className="w-11 h-11 rounded-full border-2 border-white/10 shadow-lg object-cover"
                alt={instructorName}
                onError={e => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=4f46e5&color=fff`;
                }}
              />
              <div>
                <p className="font-bold text-white text-sm">{instructorName}</p>
                <p className="text-xs text-gray-500">Lead Instructor</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 lg:-mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

          {/* ── Main Content ── */}
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
                {course.modules?.length > 0 ? course.modules.map((mod, index) => (
                  <div key={mod._id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleModule(index)}
                      className="w-full bg-gray-50 dark:bg-gray-800/50 p-4 font-semibold text-gray-900 dark:text-white flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <span className="text-sm">Part {index + 1}: {mod.title}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold">
                          {mod.lessons?.length || 0} Lessons
                        </span>
                        {expandedModules[index] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </div>
                    </button>
                    {expandedModules[index] && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="divide-y divide-gray-50 dark:divide-gray-800/50">
                        {mod.lessons?.map((lesson) => (
                          <div key={lesson._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors gap-2">
                            <div className="flex items-center text-gray-700 dark:text-gray-300">
                              {lesson.type === 'video'
                                ? <FiVideo className="mr-3 text-primary-500/60" size={16} />
                                : <FiBookOpen className="mr-3 text-accent-500/60" size={16} />}
                              <span className={`text-sm ${lesson.isPreview ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium'}`}>
                                {lesson.title}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-xs ml-7 sm:ml-0">
                              {lesson.isPreview ? (
                                <span className="text-green-600 dark:text-green-400 font-bold text-[10px] bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full uppercase tracking-wider border border-green-200 dark:border-green-800">
                                  Preview
                                </span>
                              ) : (
                                <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
                                  <FiLock className="text-gray-400" size={11} />
                                </div>
                              )}
                              <span className="text-gray-500 font-mono text-[11px]">
                                {Math.floor((lesson.duration || 600) / 60)} min
                              </span>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                    <FiClock className="mx-auto text-3xl text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Curriculum is being drafted…</p>
                  </div>
                )}
              </div>
            </div>

            {/* About Instructor */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">About the Instructor</h2>
              <div className="flex items-start space-x-4">
                <img
                  src={
                    instructorPhoto ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=4f46e5&color=fff&size=96`
                  }
                  alt={instructorName}
                  className="w-16 h-16 rounded-full border-2 border-gray-100 dark:border-gray-800 object-cover flex-shrink-0"
                  onError={e => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=4f46e5&color=fff&size=96`;
                  }}
                />
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{instructorName}</h3>
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

          {/* ── Checkout Sidebar ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-white dark:bg-gray-900 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden z-30">
              <div className="aspect-video relative bg-gray-900">
                <img
                  src={
                    course.thumbnail && course.thumbnail !== 'no-photo.jpg'
                      ? course.thumbnail
                      : '/default-course.jpg'
                  }
                  alt={course.title}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = '/default-course.jpg'; }}
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <div className="w-16 h-16 bg-white/25 backdrop-blur-lg rounded-full flex items-center justify-center shadow-xl">
                    <FiPlay className="text-white fill-current ml-1.5" size={28} />
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Price */}
                {appliedCoupon ? (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        ₹{appliedCoupon.finalPrice}
                      </span>
                      <span className="text-xl text-gray-400 line-through">₹{course.price}</span>
                    </div>
                    <div className="text-xs font-bold text-green-500 uppercase tracking-widest mt-1">
                      {appliedCoupon.discountPercentage}% OFF APPLIED
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      ₹{course.price}
                    </span>
                    <div className="text-xs font-bold text-green-500 uppercase tracking-widest mt-1">
                      One-time payment
                    </div>
                  </div>
                )}

                {/* Coupon Input — only show when NOT eligible for free */}
                {!isEnrolled && !eligibleForFree && (
                  <div className="mb-6">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                        <div className="flex items-center text-green-700 dark:text-green-400 text-sm font-semibold">
                          <FiCheck className="mr-2" />
                          {appliedCoupon.code} applied!
                        </div>
                        <button
                          onClick={removeCoupon}
                          className="text-gray-500 hover:text-red-500 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Coupon code"
                          value={couponCodeInput}
                          onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                          className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <Button
                          onClick={handleApplyCoupon}
                          disabled={!couponCodeInput.trim() || couponLoading}
                          className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                        >
                          {couponLoading ? '...' : 'Apply'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {enrollmentLoading ? (
                  <Button
                    disabled
                    size="lg"
                    className="w-full h-12 rounded-xl font-bold text-sm mb-4 bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-wait"
                  >
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin mr-2" />
                    Checking status…
                  </Button>
                ) : isEnrolled ? (
                  <Button
                    disabled
                    size="lg"
                    className="w-full h-12 rounded-xl font-bold text-sm mb-4 bg-green-500 text-white opacity-100 cursor-default"
                  >
                    <FiCheck className="mr-2" size={16} /> Enrolled
                  </Button>
                ) : eligibleForFree ? (
                  <>
                    <div className="mb-3 flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <FiLink size={13} className="flex-shrink-0" />
                      <span>You have free access via your live course enrollment!</span>
                    </div>
                    <Button
                      onClick={handleAutoEnroll}
                      disabled={autoEnrolling}
                      size="lg"
                      className="w-full h-12 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98] mb-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {autoEnrolling ? 'Enrolling…' : 'Enroll Free — Live Course Benefit'}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    size="lg"
                    className="w-full h-12 rounded-xl font-bold text-sm shadow-lg shadow-primary-600/25 transition-all active:scale-[0.98] mb-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {enrolling ? 'Processing…' : `Enroll Now — ₹${appliedCoupon ? appliedCoupon.finalPrice : course.price}`}
                  </Button>
                )}

                <div className="space-y-3.5 text-sm text-gray-600 dark:text-gray-400">
                  <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider mb-1">
                    This course includes:
                  </h4>
                  <div className="flex items-center text-xs">
                    <FiVideo className="mr-3 text-primary-500/70" size={15} /> {totalLessons} detailed lessons
                  </div>
                  <div className="flex items-center text-xs">
                    <FiBookOpen className="mr-3 text-accent-500/70" size={15} /> Interactive quizzes &amp; assessments
                  </div>
                  <div className="flex items-center text-xs">
                    <FiAward className="mr-3 text-yellow-500/70" size={15} /> Certificate of completion
                  </div>
                  <div className="flex items-center text-xs">
                    <FiClock className="mr-3 text-gray-500/70" size={15} /> Full lifetime access
                  </div>
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

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUserPlus,
  FiMail,
  FiBook,
  FiVideo,
  FiSearch,
  FiCheck,
  FiAlertCircle,
  FiLoader,
  FiChevronDown,
} from 'react-icons/fi';

/**
 * AdminEnrollMember — Admin page for directly enrolling users by email
 * into courses (normal or live) without payment gateway.
 */
const AdminEnrollMember = () => {
  // ── Form state ──
  const [email, setEmail] = useState('');
  const [courseType, setCourseType] = useState('course'); // 'course' | 'live'
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  // ── Data state ──
  const [allCourses, setAllCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [recentEnrollments, setRecentEnrollments] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // ── Course search state ──
  const [courseSearch, setCourseSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── Fetch all courses on mount ──
  const fetchCourses = useCallback(async () => {
    try {
      setLoadingCourses(true);
      const res = await axios.get('/api/admin/all-courses');
      setAllCourses(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  // ── Fetch recent admin enrollments ──
  const fetchRecentEnrollments = useCallback(async () => {
    try {
      setLoadingRecent(true);
      const res = await axios.get('/api/admin/enrollments');
      const adminEnrollments = (res.data.data || [])
        .filter(en => en.enrollmentType === 'admin')
        .slice(0, 15);
      setRecentEnrollments(adminEnrollments);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchRecentEnrollments();
  }, [fetchCourses, fetchRecentEnrollments]);

  // ── Filtered courses by type and search ──
  const filteredCourses = allCourses
    .filter(c => c.courseType === courseType)
    .filter(c => c.title.toLowerCase().includes(courseSearch.toLowerCase()));

  // ── Get selected course details ──
  const selectedCourse = allCourses.find(c => c._id === selectedCourseId);

  // ── Email validation ──
  const isValidEmail = (value) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value);

  // ── Handle enrollment ──
  const handleEnroll = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter a user email');
      return;
    }
    if (!isValidEmail(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }

    try {
      setEnrolling(true);

      const payload = { email: email.trim() };
      if (courseType === 'course') {
        payload.courseId = selectedCourseId;
      } else {
        payload.liveCourseId = selectedCourseId;
      }

      const res = await axios.post('/api/admin/enroll-member', payload);

      toast.success(res.data.message || 'Member enrolled successfully!');

      // Reset form
      setEmail('');
      setSelectedCourseId('');
      setCourseSearch('');

      // Refresh recent enrollments
      fetchRecentEnrollments();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to enroll member';
      toast.error(msg);
    } finally {
      setEnrolling(false);
    }
  };

  // ── Reset selected course when switching course type ──
  const handleCourseTypeChange = (type) => {
    setCourseType(type);
    setSelectedCourseId('');
    setCourseSearch('');
    setDropdownOpen(false);
  };

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#course-dropdown-container')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <span className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-violet-500/20">
            <FiUserPlus size={22} />
          </span>
          Add Member
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Directly enroll a registered user into any course without payment gateway.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* ═══════════ Enrollment Form ═══════════ */}
        <div className="xl:col-span-3">
          <form onSubmit={handleEnroll}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              {/* Form header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Enrollment Details</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The user must already have a registered account on the platform.
                </p>
              </div>

              <div className="px-6 py-6 space-y-6">
                {/* ── Email Input ── */}
                <div>
                  <label htmlFor="member-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    User Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      id="member-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 outline-none transition-all"
                      autoComplete="email"
                      required
                    />
                    {email && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        {isValidEmail(email) ? (
                          <FiCheck className="text-green-500" size={16} />
                        ) : (
                          <FiAlertCircle className="text-amber-500" size={16} />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Course Type Toggle ── */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Course Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleCourseTypeChange('course')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        courseType === 'course'
                          ? 'bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-300 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <FiBook size={15} />
                      Normal Course
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCourseTypeChange('live')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        courseType === 'live'
                          ? 'bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-300 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <FiVideo size={15} />
                      Live Course
                    </button>
                  </div>
                </div>

                {/* ── Course Selector Dropdown ── */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Select {courseType === 'course' ? 'Course' : 'Live Course'} <span className="text-red-500">*</span>
                  </label>

                  {loadingCourses ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
                      <FiLoader className="animate-spin" size={16} />
                      Loading courses...
                    </div>
                  ) : (
                    <div id="course-dropdown-container" className="relative">
                      {/* Selected / trigger */}
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(prev => !prev)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-left transition-all focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 outline-none"
                      >
                        {selectedCourse ? (
                          <span className="text-gray-900 dark:text-white font-medium truncate">{selectedCourse.title}</span>
                        ) : (
                          <span className="text-gray-400">Choose a {courseType === 'course' ? 'course' : 'live course'}...</span>
                        )}
                        <FiChevronDown
                          size={16}
                          className={`shrink-0 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* Dropdown list */}
                      <AnimatePresence>
                        {dropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
                          >
                            {/* Search */}
                            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                              <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                  type="text"
                                  value={courseSearch}
                                  onChange={(e) => setCourseSearch(e.target.value)}
                                  placeholder="Search courses..."
                                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500/40 outline-none"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {/* List */}
                            <div className="max-h-56 overflow-y-auto overscroll-contain">
                              {filteredCourses.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-400">
                                  No {courseType === 'course' ? 'courses' : 'live courses'} found
                                </div>
                              ) : (
                                filteredCourses.map(c => (
                                  <button
                                    key={c._id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCourseId(c._id);
                                      setDropdownOpen(false);
                                      setCourseSearch('');
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                      selectedCourseId === c._id
                                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                                        : 'text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                      c.courseType === 'live'
                                        ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    }`}>
                                      {c.courseType === 'live' ? <FiVideo size={14} /> : <FiBook size={14} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium truncate">{c.title}</div>
                                      <div className="text-[10px] text-gray-400 mt-0.5">
                                        {c.category} • ₹{c.price?.toLocaleString('en-IN') || '0'}
                                      </div>
                                    </div>
                                    {selectedCourseId === c._id && (
                                      <FiCheck className="shrink-0 text-violet-500" size={16} />
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* ── Selected Course Preview ── */}
                {selectedCourse && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/15 dark:to-indigo-900/15 border border-violet-200/60 dark:border-violet-800/40"
                  >
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                      {selectedCourse.courseType === 'live' ? <FiVideo size={20} /> : <FiBook size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{selectedCourse.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {selectedCourse.courseType === 'live' ? 'Live Course' : 'Normal Course'} • Original Price: ₹{selectedCourse.price?.toLocaleString('en-IN') || '0'}
                      </p>
                    </div>
                    <span className="shrink-0 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                      Free (Admin)
                    </span>
                  </motion.div>
                )}
              </div>

              {/* ── Submit Button ── */}
              <div className="px-6 py-4 bg-gray-50/60 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="submit"
                  disabled={enrolling || !email.trim() || !selectedCourseId || !isValidEmail(email.trim())}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-violet-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {enrolling ? (
                    <>
                      <FiLoader className="animate-spin" size={16} />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <FiUserPlus size={16} />
                      Enroll Member
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ═══════════ Recent Admin Enrollments ═══════════ */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Admin Enrollments</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Members directly enrolled by admin
              </p>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {loadingRecent ? (
                <div className="px-6 py-12 text-center text-sm text-gray-400">
                  <FiLoader className="animate-spin mx-auto mb-2" size={20} />
                  Loading...
                </div>
              ) : recentEnrollments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FiUserPlus className="text-gray-400" size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No admin enrollments yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Enrollments made here will appear below</p>
                </div>
              ) : (
                recentEnrollments.map(en => (
                  <div key={en._id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Avatar */}
                    <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                      {(en.fullName || en.user?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {en.fullName || en.user?.name || 'Unknown'}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {en.email || en.user?.email || '-'} • {en.course?.title || en.liveCourse?.title || 'Unknown Course'}
                      </p>
                    </div>
                    {/* Date */}
                    <div className="shrink-0 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-[9px] font-bold uppercase tracking-wider">
                        Admin
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(en.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEnrollMember;

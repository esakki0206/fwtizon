import { useState, useEffect, useCallback, useRef } from 'react';
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
  FiX,
} from 'react-icons/fi';

/**
 * AdminEnrollMember — Admin page for directly enrolling users by email
 * into courses (normal or live) without payment gateway.
 */
const AdminEnrollMember = () => {
  const [email, setEmail] = useState('');
  const [courseType, setCourseType] = useState('course');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const [allCourses, setAllCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [recentEnrollments, setRecentEnrollments] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const [courseSearch, setCourseSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // ── Fetch all courses ──
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
      const adminOnly = (res.data.data || [])
        .filter(en => en.enrollmentType === 'admin')
        .slice(0, 20);
      setRecentEnrollments(adminOnly);
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

  // ── Focus search when dropdown opens ──
  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [dropdownOpen]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  const filteredCourses = allCourses
    .filter(c => c.courseType === courseType)
    .filter(c => c.title.toLowerCase().includes(courseSearch.toLowerCase()));

  const selectedCourse = allCourses.find(c => c._id === selectedCourseId);

  const isValidEmail = (v) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter a user email');
    if (!isValidEmail(email.trim())) return toast.error('Please enter a valid email address');
    if (!selectedCourseId) return toast.error('Please select a course');

    try {
      setEnrolling(true);
      const payload = { email: email.trim() };
      if (courseType === 'course') payload.courseId = selectedCourseId;
      else payload.liveCourseId = selectedCourseId;

      const res = await axios.post('/api/admin/enroll-member', payload);
      toast.success(res.data.message || 'Member enrolled successfully!');
      setEmail('');
      setSelectedCourseId('');
      setCourseSearch('');
      fetchRecentEnrollments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to enroll member');
    } finally {
      setEnrolling(false);
    }
  };

  const handleCourseTypeChange = (type) => {
    setCourseType(type);
    setSelectedCourseId('');
    setCourseSearch('');
    setDropdownOpen(false);
  };

  const selectCourse = (id) => {
    setSelectedCourseId(id);
    setDropdownOpen(false);
    setCourseSearch('');
  };

  const clearCourse = (e) => {
    e.stopPropagation();
    setSelectedCourseId('');
  };

  // ── Readiness checks ──
  const emailReady = email.trim() && isValidEmail(email.trim());
  const formReady = emailReady && selectedCourseId;

  return (
    <div className="animate-in fade-in duration-500 space-y-6 sm:space-y-8 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="shrink-0 p-2.5 w-fit bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-violet-500/25">
          <FiUserPlus size={20} />
        </span>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Add Member
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Directly enroll a registered user into any course — no payment required.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
        {/* ═══════ Form Card ═══════ */}
        <div className="lg:col-span-3">
          <form onSubmit={handleEnroll}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              {/* Form header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                  Enrollment Details
                </h2>
                <p className="mt-0.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                  The user must already have a registered account.
                </p>
              </div>

              <div className="px-4 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-6">
                {/* ── Email ── */}
                <div>
                  <label htmlFor="member-email" className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    User Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
                    <input
                      id="member-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full pl-9 sm:pl-10 pr-10 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 outline-none transition-all"
                      autoComplete="email"
                      required
                    />
                    {email && (
                      <span className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2">
                        {isValidEmail(email) ? (
                          <FiCheck className="text-green-500" size={15} />
                        ) : (
                          <FiAlertCircle className="text-amber-500" size={15} />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Course Type Toggle ── */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Course Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    {[
                      { key: 'course', label: 'Normal Course', Icon: FiBook },
                      { key: 'live', label: 'Live Course', Icon: FiVideo },
                    ].map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleCourseTypeChange(key)}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                          courseType === key
                            ? 'bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-300 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        <Icon size={14} />
                        <span className="truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Course Selector ── */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Select {courseType === 'course' ? 'Course' : 'Live Course'} <span className="text-red-500">*</span>
                  </label>

                  {loadingCourses ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
                      <FiLoader className="animate-spin" size={16} />
                      Loading courses...
                    </div>
                  ) : (
                    <div ref={dropdownRef} className="relative">
                      {/* Trigger */}
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(v => !v)}
                        className={`w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm text-left transition-all outline-none ${
                          dropdownOpen
                            ? 'border-violet-500 ring-2 ring-violet-500/30 bg-white dark:bg-gray-800'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {selectedCourse ? (
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                              selectedCourse.courseType === 'live'
                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            }`}>
                              {selectedCourse.courseType === 'live' ? <FiVideo size={12} /> : <FiBook size={12} />}
                            </span>
                            <span className="text-gray-900 dark:text-white font-medium truncate">
                              {selectedCourse.title}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            Choose a {courseType === 'course' ? 'course' : 'live course'}...
                          </span>
                        )}
                        <span className="shrink-0 flex items-center gap-1">
                          {selectedCourse && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={clearCourse}
                              onKeyDown={(e) => e.key === 'Enter' && clearCourse(e)}
                              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <FiX size={14} className="text-gray-400" />
                            </span>
                          )}
                          <FiChevronDown
                            size={16}
                            className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </button>

                      {/* Dropdown Panel */}
                      <AnimatePresence>
                        {dropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl shadow-gray-900/10 dark:shadow-black/30 flex flex-col"
                            style={{ maxHeight: 'min(320px, 50vh)' }}
                          >
                            {/* Search bar */}
                            <div className="shrink-0 p-2.5 border-b border-gray-100 dark:border-gray-800">
                              <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                <input
                                  ref={searchInputRef}
                                  type="text"
                                  value={courseSearch}
                                  onChange={(e) => setCourseSearch(e.target.value)}
                                  placeholder="Search courses..."
                                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 outline-none transition-all"
                                />
                              </div>
                            </div>

                            {/* Scrollable list */}
                            <div
                              ref={listRef}
                              className="flex-1 overflow-y-auto"
                              style={{
                                WebkitOverflowScrolling: 'touch',
                                overscrollBehavior: 'contain',
                              }}
                            >
                              {filteredCourses.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-gray-400">
                                  No {courseType === 'course' ? 'courses' : 'live courses'} found
                                </div>
                              ) : (
                                filteredCourses.map(c => {
                                  const isSelected = selectedCourseId === c._id;
                                  return (
                                    <button
                                      key={c._id}
                                      type="button"
                                      onClick={() => selectCourse(c._id)}
                                      className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left text-sm border-b border-gray-50 dark:border-gray-800/50 last:border-0 transition-colors ${
                                        isSelected
                                          ? 'bg-violet-50 dark:bg-violet-900/20'
                                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 active:bg-gray-100 dark:active:bg-gray-800'
                                      }`}
                                    >
                                      <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                        c.courseType === 'live'
                                          ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                      }`}>
                                        {c.courseType === 'live' ? <FiVideo size={14} /> : <FiBook size={14} />}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className={`font-medium truncate ${isSelected ? 'text-violet-700 dark:text-violet-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                          {c.title}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                                          {c.category}{c.price ? ` • ₹${c.price.toLocaleString('en-IN')}` : ''}
                                        </div>
                                      </div>
                                      {isSelected && <FiCheck className="shrink-0 text-violet-500" size={16} />}
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            {/* Count footer */}
                            {filteredCourses.length > 0 && (
                              <div className="shrink-0 px-3 py-1.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 text-center">
                                {filteredCourses.length} {courseType === 'course' ? 'course' : 'live course'}{filteredCourses.length !== 1 ? 's' : ''} available
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* ── Selected Preview ── */}
                <AnimatePresence>
                  {selectedCourse && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/15 dark:to-indigo-900/15 border border-violet-200/60 dark:border-violet-800/40"
                    >
                      <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                        {selectedCourse.courseType === 'live' ? <FiVideo size={18} /> : <FiBook size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{selectedCourse.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {selectedCourse.courseType === 'live' ? 'Live Course' : 'Normal Course'} • Price: ₹{selectedCourse.price?.toLocaleString('en-IN') || '0'}
                        </p>
                      </div>
                      <span className="shrink-0 w-fit px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                        Free (Admin)
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Submit ── */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50/60 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="submit"
                  disabled={enrolling || !formReady}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-violet-600/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
                >
                  {enrolling ? (
                    <><FiLoader className="animate-spin" size={16} /> Enrolling...</>
                  ) : (
                    <><FiUserPlus size={16} /> Enroll Member</>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ═══════ Recent Enrollments ═══════ */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Recent Admin Enrollments</h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                Members directly enrolled by admin
              </p>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[420px] sm:max-h-[480px] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Enrollments will appear here</p>
                </div>
              ) : (
                recentEnrollments.map(en => (
                  <div key={en._id} className="px-3 sm:px-5 py-3 flex items-center gap-2.5 sm:gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-[11px] font-bold">
                      {(en.fullName || en.user?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {en.fullName || en.user?.name || 'Unknown'}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {en.email || en.user?.email || '-'} • {en.course?.title || en.liveCourse?.title || 'Unknown'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right hidden xs:block sm:block">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-[9px] font-bold uppercase tracking-wider">
                        Admin
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(en.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
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

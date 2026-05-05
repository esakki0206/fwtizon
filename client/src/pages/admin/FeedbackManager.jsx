import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiToggleLeft, FiToggleRight, FiLock, FiUnlock, FiMessageSquare, FiXCircle, FiChevronDown, FiChevronUp, FiStar, FiCheckCircle, FiClock, FiUsers, FiSearch, FiAlertTriangle, FiBarChart2, FiTrendingUp, FiRotateCw, FiDownload } from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const QUESTION_TYPES = [
  { value: 'rating', label: 'Star Rating (1-5)' },
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select', label: 'Dropdown Select' },
];

const emptyQuestion = () => ({ text: '', type: 'rating', required: true, options: [] });

const getDownloadFilename = (contentDisposition, fallback) => {
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(contentDisposition || '');
  if (!match?.[1]) return fallback;
  return decodeURIComponent(match[1].replace(/^"|"$/g, ''));
};

const StatusBadge = ({ isUnlocked, isActive }) => {
  if (!isActive) return <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Disabled</span>;
  if (isUnlocked) return <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center w-max"><FiUnlock className="mr-1" size={10} />Unlocked</span>;
  return <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center w-max"><FiLock className="mr-1" size={10} />Locked</span>;
};

const SummaryCard = ({ label, value, icon, tone }) => (
  <div className={`${tone} rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 min-w-0`}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white mt-1 truncate">{value}</p>
      </div>
      <div className="text-2xl shrink-0">{icon}</div>
    </div>
  </div>
);

const RatingBreakdown = ({ distribution = [], total = 0 }) => (
  <div className="space-y-2">
    {distribution.map((item) => {
      const width = total > 0 ? Math.round((item.count / total) * 100) : 0;
      return (
        <div key={item.star} className="flex items-center gap-3 text-xs">
          <span className="w-8 shrink-0 font-bold text-gray-600 dark:text-gray-300">{item.star} star</span>
          <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} />
          </div>
          <span className="w-8 text-right font-semibold text-gray-500">{item.count}</span>
        </div>
      );
    })}
  </div>
);

const SentimentTracker = ({ counts = {}, loading }) => {
  const total = (counts.positive || 0) + (counts.neutral || 0) + (counts.negative || 0);
  const getPercent = (c) => total > 0 ? Math.round((c / total) * 100) : 0;

  if (loading) return <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-2">
      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${getPercent(counts.positive)}%` }} />
        <div className="h-full bg-gray-300 dark:bg-gray-600 transition-all duration-500" style={{ width: `${getPercent(counts.neutral)}%` }} />
        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${getPercent(counts.negative)}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
        <span className="text-green-600">Pos {getPercent(counts.positive)}%</span>
        <span>Neu {getPercent(counts.neutral)}%</span>
        <span className="text-red-600">Neg {getPercent(counts.negative)}%</span>
      </div>
    </div>
  );
};

const FeedbackSummaryPanel = ({
  summaryData,
  loading,
  filters,
  courseOptions,
  onFilterChange,
  onClearFilters,
  page,
  onPageChange,
}) => {
  const data = summaryData || {};
  const summary = data.summary || { averageRating: 0, totalReviews: 0, satisfactionPercent: 0 };
  const insights = data.insights || {};
  const recentFeedback = data.recentFeedback || [];
  const pagination = data.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <section className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Smart Feedback Summary</h2>
          <p className="text-sm text-gray-500 mt-0.5">Course review analytics and actionable student insights</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={onClearFilters}>Clear Filters</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <select
          value={filters.courseId}
          onChange={(e) => onFilterChange('courseId', e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All courses</option>
          {courseOptions.map((course) => (
            <option key={course._id} value={course._id}>
              {course.title} {course.isLiveCohort ? '(Live)' : ''}
            </option>
          ))}
        </select>
        <select
          value={filters.rating}
          onChange={(e) => onFilterChange('rating', e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((star) => <option key={star} value={star}>{star} stars</option>)}
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => onFilterChange('from', e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => onFilterChange('to', e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Search comments"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Average Rating" value={loading ? '...' : `${summary.averageRating || 0}/5`} icon={<FiStar className="text-amber-500" />} tone="bg-amber-50 dark:bg-amber-900/20" />
        <SummaryCard label="Total Reviews" value={loading ? '...' : summary.totalReviews || 0} icon={<FiMessageSquare className="text-blue-500" />} tone="bg-blue-50 dark:bg-blue-900/20" />
        <SummaryCard label="Satisfaction" value={loading ? '...' : `${summary.satisfactionPercent || 0}%`} icon={<FiTrendingUp className="text-green-500" />} tone="bg-green-50 dark:bg-green-900/20" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center"><FiBarChart2 className="mr-2 text-amber-500" />Rating Breakdown</h3>
          {loading ? <div className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" /> : <RatingBreakdown distribution={data.ratingDistribution || []} total={summary.totalReviews || 0} />}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center"><FiCheckCircle className="mr-2 text-green-500" />Top Strengths</h3>
          {loading ? (
            <div className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : insights.topStrengths?.length ? (
            <div className="flex flex-wrap gap-2">
              {insights.topStrengths.map((item) => (
                <span key={item.keyword} className="rounded-full bg-green-50 dark:bg-green-900/20 px-3 py-1.5 text-xs font-bold text-green-700 dark:text-green-300">
                  {item.keyword} <span className="font-black">{item.count}</span>
                </span>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No repeated highlights yet.</p>}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center"><FiAlertTriangle className="mr-2 text-red-500" />Top Issues</h3>
          {loading ? (
            <div className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : insights.topIssues?.length ? (
            <div className="space-y-2">
              {insights.topIssues.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm">
                  <span className="font-semibold text-red-700 dark:text-red-300 truncate mr-2">{item.label}</span>
                  <span className="text-xs font-black text-red-500 shrink-0">{item.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No frequent issues detected.</p>}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center"><FiTrendingUp className="mr-2 text-primary-500" />Top Performers</h3>
          {loading ? (
            <div className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : data.topPerformers?.length ? (
            <div className="space-y-3">
              {data.topPerformers.map((item) => (
                <div key={item.title} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-[10px] text-gray-500">{item.count} reviews</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-xs font-black text-amber-500">{item.averageRating}</span>
                    <FiStar className="text-amber-500 fill-amber-500" size={10} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No data available yet.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 xl:col-span-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Sentiment & Insights</h3>
          <SentimentTracker counts={insights.sentimentCounts} loading={loading} />
          <div className="mt-5 space-y-2">
            {(insights.insights || []).map((insight) => (
              <p key={insight} className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 border-l-4 border-primary-500">{insight}</p>
            ))}
            {!loading && !insights.insights?.length && <p className="text-xs text-gray-500 italic">No automated insights yet.</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 xl:col-span-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Common Keywords</h3>
          {loading ? (
            <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(insights.commonKeywords || []).map(item => (
                <span key={item.keyword} className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-600 dark:text-gray-400">
                  {item.keyword} <span className="opacity-50">({item.count})</span>
                </span>
              ))}
              {!insights.commonKeywords?.length && <p className="text-xs text-gray-500">Not enough data.</p>}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 xl:col-span-2 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Feedback</h3>
            <span className="text-xs text-gray-500">{pagination.total || 0} matching reviews</span>
          </div>
          {loading ? (
            <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : recentFeedback.length ? (
            <div className="space-y-3">
              {recentFeedback.map((review) => (
                <div key={review._id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{review.course?.title || 'Unknown Course'}</p>
                        {review.isSubmission && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">Form</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{review.user?.name || 'Anonymous Student'} · {new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex text-amber-400 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => <FiStar key={star} className={star <= Number(review.rating) ? 'fill-current' : 'text-gray-300'} />)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 break-words">{review.comment}</p>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
                <span className="text-center text-xs font-bold text-gray-500">Page {pagination.page || 1} of {pagination.totalPages || 1}</span>
                <Button variant="outline" disabled={page >= (pagination.totalPages || 1)} onClick={() => onPageChange(page + 1)}>Next</Button>
              </div>
            </div>
          ) : <p className="text-center py-10 text-sm text-gray-500">No reviews match the selected filters.</p>}
        </div>
      </div>
    </section>
  );
};

const FeedbackManager = () => {
  const [forms, setForms] = useState([]);
  const [liveCourses, setLiveCourses] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [certificateTemplates, setCertificateTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [summaryPage, setSummaryPage] = useState(1);
  const [feedbackFilters, setFeedbackFilters] = useState({ courseId: '', rating: '', from: '', to: '', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [responsesModal, setResponsesModal] = useState(null);
  const [responsesData, setResponsesData] = useState(null);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ selectedCourseId: '', title: '', instructions: '', unlockDate: '', submissionDeadline: '', certificateTemplateId: '', questions: [emptyQuestion()] });
  const debouncedSearch = useDebouncedValue(feedbackFilters.search, 350);

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/feedback-forms');
      setForms(res.data.data || []);
    } catch { toast.error('Failed to load feedback forms'); }
    finally { setLoading(false); }
  }, []);

  const fetchLiveCourses = async () => {
    try {
      const res = await axios.get('/api/admin/live-courses');
      setLiveCourses(res.data.data || []);
    } catch { /* silent */ }
  };

  const fetchCourseOptions = useCallback(async () => {
    try {
      const [coursesRes, liveRes] = await Promise.all([
        axios.get('/api/admin/courses?limit=100'),
        axios.get('/api/admin/live-courses')
      ]);
      const courses = (coursesRes.data.data || []).map(c => ({ ...c, isLiveCohort: false }));
      const live = (liveRes.data.data || []).map(c => ({ ...c, isLiveCohort: true }));

      // Merge and sort alphabetically
      const combined = [...courses, ...live].sort((a, b) => a.title.localeCompare(b.title));
      setCourseOptions(combined);
    } catch {
      setCourseOptions([]);
    }
  }, []);

  const fetchCertificateTemplates = useCallback(async () => {
    try {
      const res = await axios.get('/api/cert-templates');
      const activeTemplates = (res.data.data || []).filter(template => template.isActive);
      setCertificateTemplates(activeTemplates);
      return activeTemplates;
    } catch {
      setCertificateTemplates([]);
      return [];
    }
  }, []);

  const fetchFeedbackSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const params = new URLSearchParams();
      if (feedbackFilters.courseId) params.set('courseId', feedbackFilters.courseId);
      if (feedbackFilters.rating) params.set('rating', feedbackFilters.rating);
      if (feedbackFilters.from) params.set('from', feedbackFilters.from);
      if (feedbackFilters.to) params.set('to', feedbackFilters.to);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      params.set('page', String(summaryPage));
      params.set('limit', '8');

      const res = await axios.get(`/api/admin/feedback-summary?${params.toString()}`);
      setFeedbackSummary(res.data.data);
    } catch {
      toast.error('Failed to load feedback summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [feedbackFilters.courseId, feedbackFilters.rating, feedbackFilters.from, feedbackFilters.to, debouncedSearch, summaryPage]);

  useEffect(() => { fetchForms(); }, [fetchForms]);
  useEffect(() => { fetchCourseOptions(); }, [fetchCourseOptions]);
  useEffect(() => { fetchCertificateTemplates(); }, [fetchCertificateTemplates]);
  useEffect(() => { fetchFeedbackSummary(); }, [fetchFeedbackSummary]);

  const updateFeedbackFilter = (field, value) => {
    setFeedbackFilters((current) => ({ ...current, [field]: value }));
    setSummaryPage(1);
  };

  const clearFeedbackFilters = () => {
    setFeedbackFilters({ courseId: '', rating: '', from: '', to: '', search: '' });
    setSummaryPage(1);
  };

  const formatLocalDatetime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toUTCString = (localString) => {
    return localString ? new Date(localString).toISOString() : null;
  };

  const openCreateModal = async () => {
    const [, activeTemplates] = await Promise.all([fetchCourseOptions(), fetchCertificateTemplates()]);
    setEditingForm(null);
    setFormData({
      selectedCourseId: '',
      title: '',
      instructions: '',
      unlockDate: '',
      submissionDeadline: '',
      certificateTemplateId: activeTemplates.find(template => template.isDefault)?._id || activeTemplates[0]?._id || '',
      questions: [emptyQuestion()],
      availableCertificateTypes: ['Completion Certificate'],
    });
    setModalOpen(true);
  };

  const openEditModal = async (form) => {
    await Promise.all([fetchCourseOptions(), fetchCertificateTemplates()]);
    setEditingForm(form);
    setFormData({
      selectedCourseId: form.liveCourse?._id || form.course?._id || '',
      title: form.title,
      instructions: form.instructions || '',
      unlockDate: formatLocalDatetime(form.unlockDate),
      submissionDeadline: formatLocalDatetime(form.submissionDeadline),
      certificateTemplateId: form.certificateTemplate?._id || form.certificateTemplate || '',
      availableCertificateTypes: [form.availableCertificateTypes?.[0] || 'Completion Certificate'],
      questions: form.questions.map(q => ({ text: q.text, type: q.type, required: q.required, options: q.options || [] })),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return toast.error('Title is required');
    if (!formData.availableCertificateTypes || formData.availableCertificateTypes.length === 0) return toast.error('At least one certificate type must be selected');
    if (!formData.certificateTemplateId) return toast.error('Select a certificate template');
    if (!formData.questions.length || formData.questions.some(q => !q.text.trim())) return toast.error('All questions must have text');
    if (!editingForm && !formData.selectedCourseId) return toast.error('Select a course');

    try {
      if (editingForm) {
        await axios.put(`/api/admin/feedback-forms/${editingForm._id}`, {
          title: formData.title, instructions: formData.instructions, questions: formData.questions,
          unlockDate: toUTCString(formData.unlockDate), submissionDeadline: toUTCString(formData.submissionDeadline),
          availableCertificateTypes: formData.availableCertificateTypes,
          certificateTemplateId: formData.certificateTemplateId,
        });
        toast.success('Form updated');
      } else {
        const selectedCourse = courseOptions.find(c => c._id === formData.selectedCourseId);
        const payload = {
          title: formData.title, instructions: formData.instructions,
          questions: formData.questions, unlockDate: toUTCString(formData.unlockDate), submissionDeadline: toUTCString(formData.submissionDeadline),
          availableCertificateTypes: formData.availableCertificateTypes,
          certificateTemplateId: formData.certificateTemplateId,
        };
        if (selectedCourse?.isLiveCohort) payload.liveCourseId = selectedCourse._id;
        else payload.courseId = formData.selectedCourseId;

        await axios.post('/api/admin/feedback-forms', payload);
        toast.success('Form created');
      }
      setModalOpen(false);
      fetchForms();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this feedback form and all submissions?')) return;
    try { await axios.delete(`/api/admin/feedback-forms/${id}`); toast.success('Deleted'); fetchForms(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (id) => {
    try { await axios.patch(`/api/admin/feedback-forms/${id}/toggle`); fetchForms(); }
    catch { toast.error('Failed to toggle'); }
  };

  const viewResponses = async (form) => {
    setResponsesModal(form);
    setLoadingResponses(true);
    try {
      const res = await axios.get(`/api/admin/feedback-forms/${form._id}/responses`);
      setResponsesData(res.data.data);
    } catch { toast.error('Failed to load responses'); }
    finally { setLoadingResponses(false); }
  };

  const exportResponses = async (form) => {
    const toastId = toast.loading('Preparing Excel export...');
    try {
      const res = await axios.get(`/api/admin/feedback-forms/${form._id}/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = getDownloadFilename(
        res.headers?.['content-disposition'],
        `${form.title || 'feedback'}-responses.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      toast.success('Excel export downloaded', { id: toastId });
    } catch (err) {
      console.error('Feedback export error:', err);
      toast.error(err.response?.data?.message || 'Failed to export feedback', { id: toastId });
    }
  };

  const handleResetSubmission = async (formId, subId) => {
    if (!window.confirm('Reset this submission? The student can resubmit.')) return;
    try { await axios.delete(`/api/admin/feedback-forms/${formId}/submissions/${subId}/reset`); toast.success('Reset'); viewResponses(responsesModal); }
    catch { toast.error('Failed to reset'); }
  };

  // Question management helpers
  const updateQuestion = (idx, field, value) => {
    const q = [...formData.questions]; q[idx] = { ...q[idx], [field]: value }; setFormData(p => ({ ...p, questions: q }));
  };
  const addQuestion = () => setFormData(p => ({ ...p, questions: [...p.questions, emptyQuestion()] }));
  const removeQuestion = (idx) => { if (formData.questions.length <= 1) return; setFormData(p => ({ ...p, questions: p.questions.filter((_, i) => i !== idx) })); };
  const addOption = (idx) => { const q = [...formData.questions]; q[idx].options = [...(q[idx].options || []), '']; setFormData(p => ({ ...p, questions: q })); };
  const updateOption = (qIdx, oIdx, val) => { const q = [...formData.questions]; q[qIdx].options[oIdx] = val; setFormData(p => ({ ...p, questions: q })); };
  const removeOption = (qIdx, oIdx) => { const q = [...formData.questions]; q[qIdx].options = q[qIdx].options.filter((_, i) => i !== oIdx); setFormData(p => ({ ...p, questions: q })); };

  const totalSubmissions = forms.reduce((s, f) => s + (f.stats?.totalSubmissions || 0), 0);
  const totalPending = forms.reduce((s, f) => s + (f.stats?.totalPending || 0), 0);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <FeedbackSummaryPanel
        summaryData={feedbackSummary}
        loading={summaryLoading}
        filters={feedbackFilters}
        courseOptions={courseOptions}
        onFilterChange={updateFeedbackFilter}
        onClearFilters={clearFeedbackFilters}
        page={summaryPage}
        onPageChange={setSummaryPage}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Forms', value: forms.length, icon: <FiMessageSquare className="text-primary-500" />, bg: 'bg-primary-50 dark:bg-primary-900/20' },
          { label: 'Submissions', value: totalSubmissions, icon: <FiCheckCircle className="text-green-500" />, bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Pending', value: totalPending, icon: <FiClock className="text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-gray-100 dark:border-gray-800`}>
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{s.label}</p><p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{s.value}</p></div>
              <div className="text-2xl">{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Feedback Forms</h2><p className="text-sm text-gray-500 mt-0.5">Manage feedback forms for all courses</p></div>
        <Button className="font-bold flex items-center" onClick={openCreateModal}><FiPlus className="mr-2" /> Create Form</Button>
      </div>

      {/* Forms List */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : forms.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
          <FiMessageSquare className="mx-auto text-gray-300 dark:text-gray-700 mb-3" size={32} />
          <p className="text-gray-500 font-medium">No feedback forms created yet</p>
          <Button className="mt-4 font-bold" onClick={openCreateModal}><FiPlus className="mr-2" /> Create First Form</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {forms.map(form => (
            <motion.div key={form._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{form.title}</h3>
                    <StatusBadge isUnlocked={form.isUnlocked} isActive={form.isActive} />
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Course: <span className="font-semibold text-gray-700 dark:text-gray-300">{form.liveCourse?.title || form.course?.title || 'Unknown'}</span> <span className="ml-1 text-[10px] uppercase font-bold text-gray-400">({form.liveCourse ? 'Live' : 'Normal'})</span></p>
                  <p className="text-xs text-gray-500 mb-2">
                    Certificate Template:{' '}
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {form.certificateTemplate?.templateName || 'Not configured'}
                    </span>
                    {form.certificateTemplate && !form.certificateTemplate.isActive && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-amber-600">Inactive</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Certificate Type:{' '}
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {form.availableCertificateTypes?.[0] || 'Completion Certificate'}
                    </span>
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center"><FiUsers className="mr-1" size={12} />{form.stats?.totalEnrolled || 0} enrolled</span>
                    <span className="flex items-center"><FiCheckCircle className="mr-1" size={12} />{form.stats?.totalSubmissions || 0} submitted</span>
                    <span className="flex items-center"><FiClock className="mr-1" size={12} />{form.stats?.totalPending || 0} pending</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => viewResponses(form)} title="View responses"><FiEye size={14} /></Button>
                  <Button variant="outline" size="sm" onClick={() => exportResponses(form)} title="Export responses to Excel" disabled={(form.stats?.totalSubmissions || 0) === 0}><FiDownload size={14} /></Button>
                  <Button variant="outline" size="sm" onClick={() => openEditModal(form)} title="Edit"><FiEdit2 size={14} /></Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(form._id)} title={form.isActive ? 'Disable' : 'Enable'}>
                    {form.isActive ? <FiToggleRight size={14} className="text-green-500" /> : <FiToggleLeft size={14} className="text-gray-400" />}
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(form._id)} title="Delete"><FiTrash2 size={14} /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h2 className="text-lg font-bold">{editingForm ? 'Edit Feedback Form' : 'Create Feedback Form'}</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><FiXCircle size={22} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {!editingForm && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Select Course *</label>
                    <select value={formData.selectedCourseId} onChange={e => setFormData(p => ({ ...p, selectedCourseId: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                      <option value="">-- Select Course --</option>
                      {courseOptions.map(c => <option key={c._id} value={c._id}>{c.title} {c.isLiveCohort ? '(Live)' : '(Normal)'}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Form Title *</label>
                  <input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Course Feedback Survey" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Instructions</label>
                  <textarea value={formData.instructions} onChange={e => setFormData(p => ({ ...p, instructions: e.target.value }))} rows={2}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" placeholder="Optional instructions for students..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Unlock Date (optional)</label>
                    <input type="datetime-local" value={formData.unlockDate} onChange={e => setFormData(p => ({ ...p, unlockDate: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Submission Deadline (optional)</label>
                    <input type="datetime-local" value={formData.submissionDeadline} onChange={e => setFormData(p => ({ ...p, submissionDeadline: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Certificate Type *</label>
                  <select
                    value={formData.availableCertificateTypes?.[0] || 'Completion Certificate'}
                    onChange={e => setFormData(p => ({ ...p, availableCertificateTypes: [e.target.value] }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {['Completion Certificate', 'Participation Certificate', 'Excellence Certificate'].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Certificate Template *</label>
                  <select
                    value={formData.certificateTemplateId}
                    onChange={e => setFormData(p => ({ ...p, certificateTemplateId: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">-- Select Certificate Template --</option>
                    {certificateTemplates.map(template => (
                      <option key={template._id} value={template._id}>
                        {template.templateName}{template.isDefault ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                  {certificateTemplates.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">Create and activate a certificate template before enabling certificate delivery.</p>
                  )}
                </div>

                {/* Questions Builder */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Questions *</label>
                    <Button size="sm" variant="outline" onClick={addQuestion}><FiPlus className="mr-1" size={12} />Add Question</Button>
                  </div>
                  <div className="space-y-3">
                    {formData.questions.map((q, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-xs font-black text-gray-400 mt-2 shrink-0">Q{idx + 1}</span>
                          <div className="flex-1 space-y-2">
                            <input value={q.text} onChange={e => updateQuestion(idx, 'text', e.target.value)} placeholder="Question text..."
                              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                            <div className="flex flex-wrap gap-2 items-center">
                              <select value={q.type} onChange={e => updateQuestion(idx, 'type', e.target.value)}
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 outline-none">
                                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <label className="flex items-center text-xs text-gray-600 gap-1">
                                <input type="checkbox" checked={q.required} onChange={e => updateQuestion(idx, 'required', e.target.checked)} className="rounded" />
                                Required
                              </label>
                            </div>
                            {q.type === 'select' && (
                              <div className="space-y-1 mt-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Options</p>
                                {(q.options || []).map((opt, oIdx) => (
                                  <div key={oIdx} className="flex gap-2 items-center">
                                    <input value={opt} onChange={e => updateOption(idx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`}
                                      className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                    <button onClick={() => removeOption(idx, oIdx)} className="text-red-400 hover:text-red-600"><FiXCircle size={14} /></button>
                                  </div>
                                ))}
                                <button onClick={() => addOption(idx)} className="text-xs text-primary-600 hover:underline font-medium">+ Add Option</button>
                              </div>
                            )}
                          </div>
                          {formData.questions.length > 1 && (
                            <button onClick={() => removeQuestion(idx)} className="text-red-400 hover:text-red-600 mt-1 shrink-0"><FiTrash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button className="font-bold" onClick={handleSave}>{editingForm ? 'Update Form' : 'Create Form'}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Responses Modal */}
      <AnimatePresence>
        {responsesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold">Responses — {responsesModal.title}</h2>
                  {responsesData && <p className="text-xs text-gray-500 mt-0.5">{responsesData.stats?.submitted || 0} submitted · {responsesData.stats?.pending || 0} pending</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportResponses(responsesModal)}
                    disabled={(responsesData?.stats?.submitted || 0) === 0}
                    title="Export responses to Excel"
                  >
                    <FiDownload size={14} className="mr-1" /> Export Excel
                  </Button>
                  <button onClick={() => { setResponsesModal(null); setResponsesData(null); }} className="text-gray-400 hover:text-gray-600"><FiXCircle size={22} /></button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {loadingResponses ? (
                  <div className="text-center py-12 text-gray-500">Loading responses...</div>
                ) : !responsesData ? (
                  <div className="text-center py-12 text-gray-500">No data</div>
                ) : (
                  <div className="space-y-6">
                    {/* Submitted */}
                    {responsesData.submissions?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center"><FiCheckCircle className="mr-2 text-green-500" />Submitted ({responsesData.submissions.length})</h3>
                        <div className="space-y-3">
                          {responsesData.submissions.map(sub => (
                            <SubmissionCard key={sub._id} sub={sub} form={responsesData.form} onReset={() => handleResetSubmission(responsesModal._id, sub._id)} />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Pending */}
                    {responsesData.pendingStudents?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center"><FiClock className="mr-2 text-amber-500" />Pending ({responsesData.pendingStudents.length})</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {responsesData.pendingStudents.map(s => (
                            <div key={s.userId} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">{s.name?.[0]}</div>
                              <div className="min-w-0"><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.name}</p><p className="text-[10px] text-gray-500 truncate">{s.email}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SubmissionCard = ({ sub, form, onReset }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-400 shrink-0">{sub.user?.name?.[0]}</div>
          <div className="min-w-0"><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{sub.user?.name}</p><p className="text-[10px] text-gray-500">{new Date(sub.submittedAt).toLocaleString()}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-red-500 text-xs" onClick={e => { e.stopPropagation(); onReset(); }}>Reset</Button>
          {expanded ? <FiChevronUp size={14} className="text-gray-400" /> : <FiChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
          {sub.responses?.map((r, i) => {
            const question = form?.questions?.[r.questionIndex];
            return (
              <div key={i} className="text-sm">
                <p className="text-xs font-bold text-gray-500 mb-0.5">Q{r.questionIndex + 1}: {question?.text || 'Unknown'}</p>
                <p className="text-gray-800 dark:text-gray-200">
                  {question?.type === 'rating' ? (
                    <span className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map(s => <FiStar key={s} size={14} className={s <= Number(r.answer) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />)}</span>
                  ) : String(r.answer)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeedbackManager;

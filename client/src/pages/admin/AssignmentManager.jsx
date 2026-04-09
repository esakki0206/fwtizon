import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiFile, FiEye, FiDownload, FiStar, FiCalendar } from 'react-icons/fi';
import ImageUploader from '../../components/common/ImageUploader';

const AssignmentManager = () => {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradeData, setGradeData] = useState({ grade: '', feedback: '' });

  const [form, setForm] = useState({
    title: '',
    description: '',
    course: '',
    dueDate: '',
    maxMarks: 100,
    allowResubmission: false,
    status: 'active',
  });

  useEffect(() => {
    fetchAssignments();
    fetchCourses();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get('/api/assignments');
      setAssignments(res.data.data);
    } catch (err) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/api/courses?limit=100');
      setCourses(res.data.data || []);
    } catch (err) {
      console.error('Failed to load courses');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await axios.put(`/api/assignments/${editing._id}`, form);
        toast.success('Assignment updated');
      } else {
        await axios.post('/api/assignments', form);
        toast.success('Assignment created');
      }
      setShowModal(false);
      setEditing(null);
      resetForm();
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving assignment');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this assignment and all its submissions?')) return;
    try {
      await axios.delete(`/api/assignments/${id}`);
      toast.success('Assignment deleted');
      fetchAssignments();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleEdit = (assignment) => {
    setEditing(assignment);
    setForm({
      title: assignment.title,
      description: assignment.description,
      course: assignment.course?._id || assignment.course,
      dueDate: assignment.dueDate?.slice(0, 10) || '',
      maxMarks: assignment.maxMarks,
      allowResubmission: assignment.allowResubmission,
      status: assignment.status,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      course: '',
      dueDate: '',
      maxMarks: 100,
      allowResubmission: false,
      status: 'active',
    });
  };

  const viewSubmissions = async (assignmentId) => {
    try {
      const res = await axios.get(`/api/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data.data);
      setShowSubmissionsModal(true);
    } catch (err) {
      toast.error('Failed to load submissions');
    }
  };

  const openGradeModal = (submission) => {
    setSelectedSubmission(submission);
    setGradeData({ grade: submission.grade || '', feedback: submission.feedback || '' });
    setShowGradeModal(true);
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/assignments/submissions/${selectedSubmission._id}/grade`, {
        grade: Number(gradeData.grade),
        feedback: gradeData.feedback,
      });
      toast.success('Submission graded');
      setShowGradeModal(false);
      // Refresh submissions
      if (selectedSubmission?.assignment) {
        const aId = typeof selectedSubmission.assignment === 'object' ? selectedSubmission.assignment._id : selectedSubmission.assignment;
        viewSubmissions(aId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Grading failed');
    }
  };

  const statusColors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  const submissionStatusColors = {
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    graded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    resubmitted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-in">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-shimmer"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-shimmer"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Assignments</h1>
          <p className="text-gray-500 text-sm mt-1">{assignments.length} total assignments</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm transition shadow-md shadow-primary-600/20"
        >
          <FiPlus size={16} /> New Assignment
        </button>
      </div>

      {/* Assignment List */}
      <div className="space-y-3">
        {assignments.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <FiFile className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
            <p className="text-gray-500 font-medium">No assignments yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first assignment to get started</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <motion.div
              key={assignment._id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{assignment.title}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[assignment.status]}`}>
                      {assignment.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{assignment.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <FiCalendar size={12} />
                      Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiStar size={12} />
                      Max: {assignment.maxMarks} marks
                    </span>
                    <span>Course: {assignment.course?.title || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => viewSubmissions(assignment._id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                    title="View Submissions"
                  >
                    <FiEye size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(assignment)}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                    title="Edit"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(assignment._id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    title="Delete"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between z-10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editing ? 'Edit Assignment' : 'New Assignment'}
                </h2>
                <button onClick={() => { setShowModal(false); setEditing(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Assignment title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    required
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe the assignment..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                    <select
                      required
                      value={form.course}
                      onChange={(e) => setForm({ ...form, course: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select course</option>
                      {courses.map((c) => (
                        <option key={c._id} value={c._id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Marks</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={form.maxMarks}
                      onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowResubmission"
                    checked={form.allowResubmission}
                    onChange={(e) => setForm({ ...form, allowResubmission: e.target.checked })}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                  <label htmlFor="allowResubmission" className="text-sm text-gray-700 dark:text-gray-300">
                    Allow resubmission after grading
                  </label>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditing(null); }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition shadow-md shadow-primary-600/20"
                  >
                    {editing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submissions Modal */}
      <AnimatePresence>
        {showSubmissionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between z-10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Submissions ({submissions.length})
                </h2>
                <button onClick={() => setShowSubmissionsModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <FiX size={18} />
                </button>
              </div>

              <div className="p-6">
                {submissions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No submissions yet</p>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub) => (
                      <div key={sub._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={sub.student?.avatar || `https://ui-avatars.com/api/?name=${sub.student?.name}&background=4f46e5&color=fff&size=40`}
                            alt={sub.student?.name}
                            className="w-9 h-9 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{sub.student?.name}</p>
                            <p className="text-xs text-gray-500">{sub.student?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${submissionStatusColors[sub.status]}`}>
                            {sub.status}
                          </span>
                          {sub.grade !== null && sub.grade !== undefined && (
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{sub.grade}</span>
                          )}
                          {sub.fileUrl && (
                            <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                              <FiDownload size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => openGradeModal(sub)}
                            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition"
                          >
                            Grade
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grade Modal */}
      <AnimatePresence>
        {showGradeModal && selectedSubmission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Grade Submission</h2>
                <button onClick={() => setShowGradeModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleGradeSubmit} className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Student: <strong>{selectedSubmission.student?.name}</strong></p>
                  {selectedSubmission.textResponse && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                      {selectedSubmission.textResponse}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={gradeData.grade}
                    onChange={(e) => setGradeData({ ...gradeData, grade: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter grade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feedback</label>
                  <textarea
                    value={gradeData.feedback}
                    onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional feedback..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowGradeModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition shadow-md shadow-primary-600/20">
                    Save Grade
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssignmentManager;

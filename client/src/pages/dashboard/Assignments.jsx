import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFile, FiUpload, FiClock, FiCheck, FiX, FiCalendar, FiStar, FiMessageSquare } from 'react-icons/fi';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [textResponse, setTextResponse] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignmentsRes, submissionsRes] = await Promise.all([
        axios.get('/api/assignments'),
        axios.get('/api/assignments/my/submissions'),
      ]);
      setAssignments(assignmentsRes.data.data);
      setMySubmissions(submissionsRes.data.data);
    } catch (err) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForAssignment = (assignmentId) => {
    return mySubmissions.find(
      (s) => (typeof s.assignment === 'object' ? s.assignment._id : s.assignment) === assignmentId
    );
  };

  const openSubmitModal = (assignment) => {
    setSelectedAssignment(assignment);
    setTextResponse('');
    setSelectedFile(null);
    setShowSubmitModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!textResponse.trim() && !selectedFile) {
      toast.error('Please provide a text response or upload a file');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (textResponse.trim()) formData.append('textResponse', textResponse);
      if (selectedFile) formData.append('file', selectedFile);

      await axios.post(`/api/assignments/${selectedAssignment._id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Assignment submitted!');
      setShowSubmitModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  const statusConfig = {
    submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: FiClock },
    graded: { label: 'Graded', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: FiCheck },
    resubmitted: { label: 'Resubmitted', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: FiClock },
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-in">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-shimmer"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-shimmer"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">My Assignments</h1>
        <p className="text-gray-500 text-sm mt-1">View and submit your course assignments</p>
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {assignments.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <FiFile className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={48} />
            <p className="text-gray-500 font-medium">No assignments available</p>
          </div>
        ) : (
          assignments.map((assignment) => {
            const submission = getSubmissionForAssignment(assignment._id);
            const overdue = isOverdue(assignment.dueDate);
            const canSubmit = !overdue || (submission && assignment.allowResubmission);

            return (
              <motion.div
                key={assignment._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white">{assignment.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{assignment.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <FiCalendar size={12} />
                          Due: {new Date(assignment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {overdue && <span className="text-red-500 font-bold ml-1">(Overdue)</span>}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiStar size={12} />
                          {assignment.maxMarks} marks
                        </span>
                        <span>Course: {assignment.course?.title || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {submission ? (
                        <>
                          <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${statusConfig[submission.status]?.color}`}>
                            {statusConfig[submission.status]?.label}
                          </span>
                          {submission.status === 'graded' && (
                            <span className="text-lg font-black text-gray-900 dark:text-white">
                              {submission.grade}/{assignment.maxMarks}
                            </span>
                          )}
                          {submission.status === 'graded' && assignment.allowResubmission && (
                            <button
                              onClick={() => openSubmitModal(assignment)}
                              className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                            >
                              Resubmit
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => openSubmitModal(assignment)}
                          disabled={overdue}
                          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition shadow-md shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Feedback section */}
                  {submission?.status === 'graded' && submission.feedback && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-800/30">
                      <div className="flex items-center gap-1 text-xs font-bold text-green-700 dark:text-green-400 mb-1">
                        <FiMessageSquare size={12} /> Instructor Feedback
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-300">{submission.feedback}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && selectedAssignment && (
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
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg"
            >
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Submit: {selectedAssignment.title}</h2>
                <button onClick={() => setShowSubmitModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Response</label>
                  <textarea
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                    placeholder="Type your answer here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attach File (optional)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-primary-400 transition"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2 text-primary-600">
                        <FiFile size={16} />
                        <span className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-400">
                        <FiUpload size={20} />
                        <span className="text-sm">Click to upload or drag file</span>
                        <span className="text-xs">PDF, DOC, images • Max 10MB</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowSubmitModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition shadow-md shadow-primary-600/20 disabled:opacity-70"
                  >
                    {submitting ? 'Submitting...' : 'Submit Assignment'}
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

export default Assignments;

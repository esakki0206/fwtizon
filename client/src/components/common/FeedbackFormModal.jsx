import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiXCircle, FiCheckCircle, FiDownload, FiLoader, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';

const StarRating = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)} className="focus:outline-none transition-transform hover:scale-110" aria-label={`${star} star`}>
          <FiStar size={24} className={`transition-colors ${star <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
        </button>
      ))}
      {value > 0 && <span className="ml-2 text-xs font-bold text-gray-500">{value}/5</span>}
    </div>
  );
};

const FeedbackFormModal = ({ isOpen, onClose, formData, liveCourseId, onSuccess }) => {
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  if (!isOpen || !formData) return null;

  const setAnswer = (questionIndex, answer) => {
    setResponses(prev => ({ ...prev, [questionIndex]: answer }));
    setErrors(prev => { const n = { ...prev }; delete n[questionIndex]; return n; });
  };

  const validate = () => {
    const newErrors = {};
    formData.questions?.forEach((q, idx) => {
      if (q.required) {
        const val = responses[idx];
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim()) || val === 0) {
          newErrors[idx] = 'This field is required';
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { toast.error('Please fill all required fields'); return; }

    const payload = Object.entries(responses).map(([idx, answer]) => ({ questionIndex: Number(idx), answer }));

    try {
      setSubmitting(true);
      const res = await axios.post(`/api/feedback/submit/${formData._id}`, { responses: payload });
      setResult(res.data.data);
      toast.success('Feedback submitted successfully!');
      if (onSuccess) onSuccess(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResponses({});
    setErrors({});
    setResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl">

          {/* Header */}
          <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{formData.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{formData.liveCourse?.title}</p>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-4"><FiXCircle size={22} /></button>
          </div>

          {/* Body */}
          <div className="p-5 md:p-6 overflow-y-auto flex-1">
            {result ? (
              /* Success State */
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheckCircle size={32} className="text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Thank You!</h3>
                <p className="text-sm text-gray-500 mb-6">Your feedback has been submitted successfully.</p>

                {result.certificate && (
                  <div className="bg-primary-50 dark:bg-primary-900/20 rounded-2xl p-5 border border-primary-200 dark:border-primary-800 mb-4">
                    <p className="text-sm font-bold text-primary-700 dark:text-primary-400 mb-3">🎉 Your certificate is ready!</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <a href={result.certificate.viewUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-colors">
                        View Certificate
                      </a>
                      <a href={result.certificate.downloadUrl}
                        className="inline-flex items-center justify-center px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <FiDownload className="mr-2" /> Download PDF
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Form */
              <div className="space-y-5">
                {formData.instructions && (
                  <div className="bg-blue-50 dark:bg-blue-900/15 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">{formData.instructions}</p>
                  </div>
                )}

                {formData.questions?.map((q, idx) => (
                  <div key={idx} className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                      {idx + 1}. {q.text}
                      {q.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {q.type === 'rating' && (
                      <StarRating value={responses[idx] || 0} onChange={(val) => setAnswer(idx, val)} />
                    )}

                    {q.type === 'text' && (
                      <input type="text" value={responses[idx] || ''} onChange={e => setAnswer(idx, e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="Your answer..." />
                    )}

                    {q.type === 'textarea' && (
                      <textarea value={responses[idx] || ''} onChange={e => setAnswer(idx, e.target.value)} rows={3}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                        placeholder="Your answer..." />
                    )}

                    {q.type === 'select' && (
                      <select value={responses[idx] || ''} onChange={e => setAnswer(idx, e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                        <option value="">-- Select --</option>
                        {q.options?.map((opt, oIdx) => <option key={oIdx} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {errors[idx] && (
                      <p className="text-xs text-red-500 flex items-center"><FiAlertCircle className="mr-1" size={12} />{errors[idx]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!result && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button onClick={handleClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-6 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center">
                {submitting ? <><FiLoader className="mr-2 animate-spin" /> Submitting...</> : 'Submit Feedback'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FeedbackFormModal;

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiToggleLeft, FiToggleRight, FiLock, FiUnlock, FiMessageSquare, FiXCircle, FiChevronDown, FiChevronUp, FiStar, FiCheckCircle, FiClock, FiUsers } from 'react-icons/fi';
import { Button } from '../../components/ui/button';

const QUESTION_TYPES = [
  { value: 'rating', label: 'Star Rating (1-5)' },
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select', label: 'Dropdown Select' },
];

const emptyQuestion = () => ({ text: '', type: 'rating', required: true, options: [] });

const StatusBadge = ({ isUnlocked, isActive }) => {
  if (!isActive) return <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Disabled</span>;
  if (isUnlocked) return <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center w-max"><FiUnlock className="mr-1" size={10}/>Unlocked</span>;
  return <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center w-max"><FiLock className="mr-1" size={10}/>Locked</span>;
};

const FeedbackManager = () => {
  const [forms, setForms] = useState([]);
  const [liveCourses, setLiveCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [responsesModal, setResponsesModal] = useState(null);
  const [responsesData, setResponsesData] = useState(null);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ liveCourseId: '', title: '', instructions: '', unlockDate: '', submissionDeadline: '', questions: [emptyQuestion()] });

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

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const openCreateModal = async () => {
    await fetchLiveCourses();
    setEditingForm(null);
    setFormData({ liveCourseId: '', title: '', instructions: '', unlockDate: '', submissionDeadline: '', questions: [emptyQuestion()] });
    setModalOpen(true);
  };

  const openEditModal = async (form) => {
    await fetchLiveCourses();
    setEditingForm(form);
    setFormData({
      liveCourseId: form.liveCourse?._id || '',
      title: form.title,
      instructions: form.instructions || '',
      unlockDate: form.unlockDate ? new Date(form.unlockDate).toISOString().slice(0, 16) : '',
      submissionDeadline: form.submissionDeadline ? new Date(form.submissionDeadline).toISOString().slice(0, 16) : '',
      questions: form.questions.map(q => ({ text: q.text, type: q.type, required: q.required, options: q.options || [] })),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return toast.error('Title is required');
    if (!formData.questions.length || formData.questions.some(q => !q.text.trim())) return toast.error('All questions must have text');
    if (!editingForm && !formData.liveCourseId) return toast.error('Select a live course');

    try {
      if (editingForm) {
        await axios.put(`/api/admin/feedback-forms/${editingForm._id}`, {
          title: formData.title, instructions: formData.instructions, questions: formData.questions,
          unlockDate: formData.unlockDate || null, submissionDeadline: formData.submissionDeadline || null,
        });
        toast.success('Form updated');
      } else {
        await axios.post('/api/admin/feedback-forms', {
          liveCourseId: formData.liveCourseId, title: formData.title, instructions: formData.instructions,
          questions: formData.questions, unlockDate: formData.unlockDate || null, submissionDeadline: formData.submissionDeadline || null,
        });
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
        <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Feedback Forms</h2><p className="text-sm text-gray-500 mt-0.5">Manage feedback forms for live cohort courses</p></div>
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
                  <p className="text-xs text-gray-500 mb-2">Course: <span className="font-semibold text-gray-700 dark:text-gray-300">{form.liveCourse?.title || 'Unknown'}</span></p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center"><FiUsers className="mr-1" size={12}/>{form.stats?.totalEnrolled || 0} enrolled</span>
                    <span className="flex items-center"><FiCheckCircle className="mr-1" size={12}/>{form.stats?.totalSubmissions || 0} submitted</span>
                    <span className="flex items-center"><FiClock className="mr-1" size={12}/>{form.stats?.totalPending || 0} pending</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => viewResponses(form)} title="View responses"><FiEye size={14} /></Button>
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
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><FiXCircle size={22}/></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {!editingForm && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Live Course *</label>
                    <select value={formData.liveCourseId} onChange={e => setFormData(p => ({ ...p, liveCourseId: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                      <option value="">-- Select Course --</option>
                      {liveCourses.map(c => <option key={c._id} value={c._id}>{c.title} ({c.status})</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Form Title *</label>
                  <input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Course Feedback Survey"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Instructions</label>
                  <textarea value={formData.instructions} onChange={e => setFormData(p => ({ ...p, instructions: e.target.value }))} rows={2}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" placeholder="Optional instructions for students..."/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Unlock Date (optional)</label>
                    <input type="datetime-local" value={formData.unlockDate} onChange={e => setFormData(p => ({ ...p, unlockDate: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Submission Deadline (optional)</label>
                    <input type="datetime-local" value={formData.submissionDeadline} onChange={e => setFormData(p => ({ ...p, submissionDeadline: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"/>
                  </div>
                </div>

                {/* Questions Builder */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Questions *</label>
                    <Button size="sm" variant="outline" onClick={addQuestion}><FiPlus className="mr-1" size={12}/>Add Question</Button>
                  </div>
                  <div className="space-y-3">
                    {formData.questions.map((q, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-xs font-black text-gray-400 mt-2 shrink-0">Q{idx + 1}</span>
                          <div className="flex-1 space-y-2">
                            <input value={q.text} onChange={e => updateQuestion(idx, 'text', e.target.value)} placeholder="Question text..."
                              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"/>
                            <div className="flex flex-wrap gap-2 items-center">
                              <select value={q.type} onChange={e => updateQuestion(idx, 'type', e.target.value)}
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 outline-none">
                                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <label className="flex items-center text-xs text-gray-600 gap-1">
                                <input type="checkbox" checked={q.required} onChange={e => updateQuestion(idx, 'required', e.target.checked)} className="rounded"/>
                                Required
                              </label>
                            </div>
                            {q.type === 'select' && (
                              <div className="space-y-1 mt-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Options</p>
                                {(q.options || []).map((opt, oIdx) => (
                                  <div key={oIdx} className="flex gap-2 items-center">
                                    <input value={opt} onChange={e => updateOption(idx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`}
                                      className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs outline-none"/>
                                    <button onClick={() => removeOption(idx, oIdx)} className="text-red-400 hover:text-red-600"><FiXCircle size={14}/></button>
                                  </div>
                                ))}
                                <button onClick={() => addOption(idx)} className="text-xs text-primary-600 hover:underline font-medium">+ Add Option</button>
                              </div>
                            )}
                          </div>
                          {formData.questions.length > 1 && (
                            <button onClick={() => removeQuestion(idx)} className="text-red-400 hover:text-red-600 mt-1 shrink-0"><FiTrash2 size={14}/></button>
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
                <button onClick={() => { setResponsesModal(null); setResponsesData(null); }} className="text-gray-400 hover:text-gray-600"><FiXCircle size={22}/></button>
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
                    <span className="flex items-center gap-0.5">{[1,2,3,4,5].map(s => <FiStar key={s} size={14} className={s <= Number(r.answer) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />)}</span>
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

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AdminTable } from '../../components/admin/AdminTable';
import { Button } from '../../components/ui/button';
import { FiPlus, FiTrash2, FiFileText } from 'react-icons/fi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

const QuizManager = () => {
  const [view, setView] = useState('list');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingQuiz, setEditingQuiz] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/quizzes');
      setQuizzes(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingQuiz(null);
    setFormData({
      title: '',
      course: '', // assuming course ID input or dropdown
      passingScore: 70,
      questions: []
    });
    setView('editor');
  };

  const handleEdit = (quiz) => {
    setEditingQuiz(quiz._id);
    setFormData({
      title: quiz.title || '',
      course: quiz.course?._id || quiz.course || '',
      passingScore: quiz.passingScore || 70,
      questions: quiz.questions || []
    });
    setView('editor');
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await axios.delete(`/api/quizzes/${id}`);
      toast.success('Quiz deleted');
      setQuizzes(quizzes.filter(q => q._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete quiz');
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.course) {
      return toast.error('Please fill required fields (Title, Course ID)');
    }
    try {
      if (editingQuiz) {
        await axios.put(`/api/quizzes/${editingQuiz}`, formData);
        toast.success('Quiz updated successfully');
      } else {
        await axios.post('/api/quizzes', formData);
        toast.success('Quiz created successfully');
      }
      setView('list');
      fetchQuizzes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save quiz');
    }
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { questionText: 'New Question', options: [{ text: 'Option 1', isCorrect: true }] }]
    }));
  };

  const updateQuestion = (qIdx, text) => {
    const updated = [...formData.questions];
    updated[qIdx].questionText = text;
    setFormData({ ...formData, questions: updated });
  };

  const removeQuestion = (qIdx) => {
    const updated = formData.questions.filter((_, i) => i !== qIdx);
    setFormData({ ...formData, questions: updated });
  };

  const addOption = (qIdx) => {
    const updated = [...formData.questions];
    updated[qIdx].options.push({ text: 'New Option', isCorrect: false });
    setFormData({ ...formData, questions: updated });
  };

  const updateOption = (qIdx, oIdx, key, val) => {
    const updated = [...formData.questions];
    updated[qIdx].options[oIdx][key] = val;
    setFormData({ ...formData, questions: updated });
  };

  const removeOption = (qIdx, oIdx) => {
    const updated = [...formData.questions];
    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== oIdx);
    setFormData({ ...formData, questions: updated });
  };

  const columns = [
    { header: 'Quiz Title', accessorKey: 'title', cell: (row) => <div className="font-bold text-gray-900 dark:text-white max-w-xs">{row.title}</div> },
    { header: 'Course', accessorKey: 'course', cell: (row) => <span className="text-gray-500 font-medium truncate max-w-[150px] inline-block">{row.course?.title || row.course}</span> },
    { header: 'Questions', accessorKey: 'questions', cell: (row) => <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-bold">{row.questions?.length || 0} Qs</span> },
    { header: 'Passing Score', accessorKey: 'passingScore', cell: (row) => <span className="text-primary-600 dark:text-primary-400 font-bold">{row.passingScore}%</span> },
    { header: 'Actions', id: 'actions', cell: (row) => (
      <Button variant="destructive" size="sm" onClick={(e) => handleDelete(e, row._id)}>Delete</Button>
    )}
  ];

  return (
    <div className="animate-in fade-in duration-500">
      {view === 'list' && (
        <AdminTable
          title="Quiz Assessments"
          description="Manage course quizzes, questions, and passing criteria."
          columns={columns}
          data={quizzes}
          loading={loading}
          onRowClick={handleEdit}
          renderActions={() => (
            <Button className="font-bold" onClick={handleCreateNew}>
              <FiPlus className="mr-2" /> New Quiz
            </Button>
          )}
        />
      )}

      {view === 'editor' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingQuiz ? 'Edit Quiz' : 'New Quiz'}</h2>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
              <Button onClick={handleSave}>Save Quiz</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-1 lg:col-span-2 space-y-6">
              
              <Card>
                <CardHeader><CardTitle>Quiz Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quiz Title <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-primary-500" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Course ID <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={formData.course} 
                        onChange={e => setFormData({...formData, course: e.target.value})} 
                        className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-primary-500" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Passing Score (%)</label>
                      <input 
                        type="number" 
                        value={formData.passingScore} 
                        onChange={e => setFormData({...formData, passingScore: Number(e.target.value)})} 
                        className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-primary-500" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Questions</h3>
                  <Button size="sm" variant="outline" onClick={addQuestion}><FiPlus className="mr-2" /> Add Question</Button>
                </div>
                
                {formData.questions.map((q, qIdx) => (
                  <Card key={qIdx} className="mb-4">
                    <CardHeader className="py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center w-full max-w-lg">
                          <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-bold rounded w-6 h-6 flex items-center justify-center mr-3 text-xs">{qIdx + 1}</span>
                          <input 
                            value={q.questionText} 
                            onChange={(e) => updateQuestion(qIdx, e.target.value)} 
                            className="w-full bg-transparent font-bold focus:outline-none" 
                          />
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeQuestion(qIdx)}><FiTrash2 /></Button>
                      </div>
                    </CardHeader>
                    <CardContent className="py-4">
                       <ul className="space-y-2 mb-3">
                         {q.options.map((opt, oIdx) => (
                           <li key={oIdx} className="flex items-center space-x-3">
                             <input 
                               type="checkbox" 
                               checked={opt.isCorrect} 
                               onChange={(e) => updateOption(qIdx, oIdx, 'isCorrect', e.target.checked)} 
                               className="w-4 h-4 text-primary-600 rounded" 
                             />
                             <input 
                               type="text" 
                               value={opt.text} 
                               onChange={(e) => updateOption(qIdx, oIdx, 'text', e.target.value)} 
                               className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm" 
                             />
                             <button onClick={() => removeOption(qIdx, oIdx)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={14}/></button>
                           </li>
                         ))}
                       </ul>
                       <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary-600 dark:text-primary-400" onClick={() => addOption(qIdx)}>
                         + Add Option
                       </Button>
                    </CardContent>
                  </Card>
                ))}
                {formData.questions.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    <p className="text-sm text-gray-500">No questions added yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Validation rules</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="mb-2">- Title is required.</p>
                  <p className="mb-2">- Course ID must be a valid attached course.</p>
                  <p>- Check the box next to correct options.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizManager;

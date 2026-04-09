import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiXCircle, FiAward, FiArrowRight, FiClock, FiFileText } from 'react-icons/fi';
import { Button } from '../../components/ui/button';

const QuizView = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`/api/quizzes/${quizId}`);
        setQuiz(res.data.data);
      } catch (err) {
        toast.error('Failed to load assessment data');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId, navigate]);

  const handleOptionSelect = (questionId, optionId) => {
    setAnswers({ ...answers, [questionId]: optionId });
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      return toast.error("Please provide answers to all questions before submitting the assessment.");
    }

    setSubmitting(true);
    try {
      const formattedAnswers = Object.keys(answers).map(qId => ({ questionId: qId, selectedOptionId: answers[qId] }));
      const res = await axios.post(`/api/quizzes/${quizId}/submit`, { answers: formattedAnswers });
      setResult(res.data);
      window.scrollTo(0, 0);
    } catch (err) {
      toast.error('Failed to parse validation signature');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600 dark:border-primary-500 mb-6"></div>
      <p className="text-gray-500 font-medium">Encrypting and building digital assessment...</p>
    </div>
  );

  const percentProgress = quiz ? (Object.keys(answers).length / quiz.questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-100/50 dark:bg-primary-900/10 rounded-full blur-[120px] -mr-[400px] -mt-[400px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {result ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-[2rem] p-12 text-center shadow-xl shadow-primary-900/5 border border-gray-100 dark:border-gray-800"
          >
            <div className="relative inline-block mb-8">
              <div className={`absolute inset-0 scale-150 rounded-full opacity-20 blur-xl ${result.passed ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div className={`w-32 h-32 relative z-10 rounded-full flex items-center justify-center shadow-2xl border-4 border-white dark:border-gray-900 ${result.passed ? 'bg-gradient-to-tr from-green-500 to-green-400 text-white' : 'bg-gradient-to-tr from-red-500 to-rose-400 text-white'}`}>
                {result.passed ? <FiCheckCircle size={64} /> : <FiXCircle size={64} />}
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
              {result.passed ? "Assessment Passed!" : "Threshold Missed"}
            </h1>
            
            <div className="inline-block px-8 py-3 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 mb-10">
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                Final Accuracy: <span className={`text-2xl font-black ml-2 ${result.passed ? 'text-green-600' : 'text-red-500'}`}>{result.score}%</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {result.passed ? (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/learn/${courseId}`)}
                    className="h-14 px-8 text-lg rounded-full font-bold border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Return to Curriculum
                  </Button>
                  {result.certificateId && (
                     <Button
                       onClick={() => navigate(`/certificate/${result.certificateId}`)}
                       className="h-14 px-8 text-lg rounded-full font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg shadow-yellow-500/25 border-0"
                     >
                       <FiAward className="mr-2" size={20} /> Claim Certificate
                     </Button>
                  )}
                </>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/learn/${courseId}`)}
                    className="h-14 px-8 text-lg rounded-full font-bold border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Return to Study
                  </Button>
                  <Button 
                    onClick={() => { setResult(null); setAnswers({}); }}
                    className="h-14 px-8 text-lg rounded-full font-bold shadow-lg shadow-primary-500/20"
                  >
                    Reseat Assessment
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <div>
            {/* Header / Meta */}
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 lg:p-12 shadow-sm border border-gray-100 dark:border-gray-800 mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gray-100 dark:bg-gray-800">
                <motion.div 
                  className="h-full bg-primary-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-100 dark:border-gray-800 pb-8 mb-8">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center text-primary-600 dark:text-primary-400 font-bold uppercase tracking-widest text-xs mb-3">
                    <FiFileText className="mr-2" /> Formal Assessment
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">{quiz.title}</h1>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-900/50 flex flex-col items-center font-medium shadow-sm w-max">
                  <span className="text-[10px] uppercase tracking-wider mb-1">Pass Requirement</span>
                  <span className="text-2xl font-black leading-none">{quiz.passingScore}%</span>
                </div>
              </div>

              <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <FiClock className="mr-2 flex-shrink-0" size={18} /> 
                Answers are logged securely. You may review your answers before submitting the final protocol.
              </div>
            </div>

            {/* Questions Grid */}
            <div className="space-y-6 mb-12">
              {quiz.questions.map((q, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                  key={q._id} 
                  className="bg-white dark:bg-gray-900 p-8 lg:p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 leading-relaxed">
                    <span className="text-primary-400 mr-2 opacity-50 text-2xl">Q{index + 1}.</span> {q.text}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {q.options.map((opt) => {
                      const isSelected = answers[q._id] === opt._id;
                      return (
                        <label 
                          key={opt._id}
                          className={`relative flex p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 group ${
                            isSelected 
                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 ring-4 ring-primary-500/10'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <div className="flex-1 pr-8">
                            <span className={`font-semibold text-lg leading-snug ${isSelected ? 'text-primary-800 dark:text-primary-200' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                              {opt.text}
                            </span>
                          </div>
                          
                          <div className="absolute right-5 top-1/2 -translate-y-1/2">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'border-primary-600 bg-white dark:bg-gray-900' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                            }`}>
                              <AnimatePresence>
                                {isSelected && (
                                  <motion.div 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                    className="w-3 h-3 rounded-full bg-primary-600" 
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="sticky bottom-8 z-30">
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-4 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-2xl flex items-center justify-between">
                 <div className="pl-4 font-bold text-gray-500 dark:text-gray-400">
                   <span className="text-gray-900 dark:text-white font-black">{Object.keys(answers).length}</span> of {quiz.questions.length} Answered
                 </div>
                 <Button
                   onClick={handleSubmit}
                   disabled={submitting}
                   size="lg"
                   className="h-14 px-10 rounded-full font-extrabold text-lg shadow-lg shadow-primary-500/25 transition-transform hover:scale-105 active:scale-95 disabled:scale-100"
                 >
                   {submitting ? 'Analyzing...' : 'Submit Evaluation'} <FiArrowRight className="ml-2" />
                 </Button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default QuizView;

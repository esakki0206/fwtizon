import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiPlayCircle, FiCheckCircle, FiFileText, FiMenu, FiX, FiList, FiClock, FiDownload, FiVideo } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/button';
import DOMPurify from 'dompurify';
import FeedbackFormModal from '../../components/common/FeedbackFormModal';

const CoursePlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // SECURITY FIX: Use the protected content endpoint
        const res = await axios.get(`/api/courses/${id}/content`);
        setCourse(res.data.data);
      } catch (err) {
        if (err.response && err.response.status === 403) {
          toast.error('You are not enrolled in this course.');
          navigate(`/courses/${id}`);
        } else {
          toast.error('Failed to load course content');
          navigate('/dashboard');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleLessonComplete = async (lessonId) => {
    if (!completedLessons.includes(lessonId)) {
      setCompletedLessons([...completedLessons, lessonId]);
      try {
        await axios.put('/api/enroll/progress', { courseId: id, lessonId });
        toast.success('Lesson completed!');
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  );

  if (!course || !course.modules || course.modules.length === 0) return (
    <div className="h-screen flex items-center justify-center text-center p-8 bg-gray-50 dark:bg-gray-950">
      <div>
        <FiFileText size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Course content not available</h2>
        <p className="text-gray-500 text-sm mb-4">This course doesn't have any content yet.</p>
        <Button asChild><a href="/dashboard">Back to Dashboard</a></Button>
      </div>
    </div>
  );

  const currentModule = course.modules[activeModuleIndex];
  const currentLesson = currentModule?.lessons?.[activeLessonIndex];

  // Render different content types securely
  const renderContent = () => {
    if (!currentLesson) return null;

    switch (currentLesson.type) {
      case 'video':
        return currentLesson.content ? (
          <video src={currentLesson.content} controls className="w-full h-full object-contain" poster={course.thumbnail} controlsList="nodownload" />
        ) : (
          <div className="text-gray-500 flex flex-col items-center">
            <FiPlayCircle size={56} className="mb-3 opacity-40 text-white" />
            <span className="text-white font-medium text-sm">Video Source Not Available</span>
          </div>
        );

      case 'external_video':
        return currentLesson.content ? (
          <iframe
            src={currentLesson.content}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="text-gray-500 flex flex-col items-center">
            <FiPlayCircle size={56} className="mb-3 opacity-40 text-white" />
            <span className="text-white font-medium text-sm">Video URL Not Provided</span>
          </div>
        );

      case 'zoom':
        return currentLesson.zoomEmbedLink ? (
          <div className="w-full h-full flex flex-col">
            <div className="bg-gray-900 text-white p-2 text-xs flex justify-between items-center z-10 relative">
              <span>Zoom Session</span>
              {currentLesson.zoomPassword && (
                <span className="bg-gray-800 px-2 py-1 rounded select-all cursor-text font-mono">
                  Passcode: {currentLesson.zoomPassword}
                </span>
              )}
            </div>
            <iframe
              src={currentLesson.zoomEmbedLink}
              className="w-full flex-1"
              allow="microphone; camera; display-capture"
              allowFullScreen
            ></iframe>
          </div>
        ) : (
          <div className="text-gray-500 flex flex-col items-center justify-center h-full">
            <FiVideo size={56} className="mb-3 opacity-40 text-white" />
            <span className="text-white font-medium text-sm">Zoom Session Link Not Configured</span>
          </div>
        );

      case 'pdf':
        return currentLesson.content ? (
          <iframe
            src={currentLesson.content}
            className="w-full h-full"
            title="PDF Document"
          ></iframe>
        ) : (
          <div className="text-gray-500 flex flex-col items-center justify-center h-full">
            <FiFileText size={56} className="mb-3 opacity-40 text-white" />
            <span className="text-white font-medium text-sm">PDF Document Not Available</span>
          </div>
        );

      case 'text':
      default:
        // SECURITY FIX: Use DOMPurify to prevent XSS attacks
        const cleanHTML = DOMPurify.sanitize(currentLesson.content || '<p>Reading materials go here...</p>');
        return (
          <div className="bg-gray-50 dark:bg-gray-900 w-full h-full flex flex-col items-center p-6 lg:p-12 text-gray-800 dark:text-gray-200 overflow-y-auto absolute inset-0">
            <FiFileText size={56} className="text-primary-300 dark:text-primary-800 mb-6 flex-shrink-0" />
            <div
              className="max-w-3xl w-full text-left prose dark:prose-invert text-sm pb-10"
              dangerouslySetInnerHTML={{ __html: cleanHTML }}
            ></div>
          </div>
        );
    }
  };

  // Calculate real progress
  const totalLessons = course.modules.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0);
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

  const prevLesson = () => {
    if (activeLessonIndex > 0) {
      setActiveLessonIndex(activeLessonIndex - 1);
    } else if (activeModuleIndex > 0) {
      const prevMod = course.modules[activeModuleIndex - 1];
      setActiveModuleIndex(activeModuleIndex - 1);
      setActiveLessonIndex((prevMod.lessons?.length || 1) - 1);
    }
  };

  const nextLesson = async () => {
    await handleLessonComplete(currentLesson._id);
    if (activeLessonIndex < currentModule.lessons.length - 1) {
      setActiveLessonIndex(activeLessonIndex + 1);
    } else if (activeModuleIndex < course.modules.length - 1) {
      if (currentModule.quiz) {
        navigate(`/learn/${id}/quiz/${currentModule.quiz._id}`);
      } else {
        setActiveModuleIndex(activeModuleIndex + 1);
        setActiveLessonIndex(0);
      }
    } else if (currentModule.quiz) {
      navigate(`/learn/${id}/quiz/${currentModule.quiz._id}`);
    } else {
      toast.success('Course Completed! 🎉');

      try {
        const fbRes = await axios.get(`/api/feedback/status/${id}`);
        const fb = fbRes.data?.data;
        if (fb?.formAvailable && fb?.isUnlocked && !fb?.isSubmitted) {
          const formRes = await axios.get(`/api/feedback/form/${id}`);
          setFeedbackData(formRes.data.data);
          setFeedbackModalOpen(true);
          return; // Wait for modal completion
        }
      } catch (err) {
        console.error('Feedback check error', err);
      }

      navigate('/dashboard');
    }
  };

  const handleFeedbackSuccess = () => {
    setFeedbackModalOpen(false);
    navigate('/dashboard');
  };

  const isFirstLesson = activeModuleIndex === 0 && activeLessonIndex === 0;

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 relative z-0">

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 lg:static z-50 w-80 lg:w-[330px] bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2 leading-tight">{course.title}</h2>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 mt-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 1 }}
                className="bg-primary-600 h-full rounded-full"
              />
            </div>
            <p className="text-[10px] text-gray-500 font-bold mt-1.5 uppercase tracking-wider">{progressPercent}% Complete</p>
          </div>
          <button className="lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white ml-3" onClick={() => setSidebarOpen(false)}>
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto">
          {course.modules.map((mod, mIndex) => (
            <div key={mod._id} className="border-b border-gray-200 dark:border-gray-800/50">
              <div className="px-5 py-3 bg-gray-100/60 dark:bg-gray-800/40 font-semibold text-gray-700 dark:text-gray-300 text-xs flex items-center justify-between tracking-wide uppercase">
                <span>Part {mIndex + 1}: {mod.title}</span>
              </div>
              <div className="py-1">
                {mod.lessons.map((lesson, lIndex) => {
                  const isActive = mIndex === activeModuleIndex && lIndex === activeLessonIndex;
                  const isCompleted = completedLessons.includes(lesson._id);
                  return (
                    <div
                      key={lesson._id}
                      onClick={() => { setActiveModuleIndex(mIndex); setActiveLessonIndex(lIndex); setSidebarOpen(false); }}
                      className={`px-5 py-2.5 cursor-pointer flex items-start text-sm transition-all ${isActive ? 'bg-primary-50 dark:bg-primary-900/30 border-l-3 border-primary-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-3 border-transparent'
                        }`}
                    >
                      <div className="mt-0.5 mr-3">
                        {isCompleted ? (
                          <FiCheckCircle className="text-green-500 flex-shrink-0" size={15} />
                        ) : lesson.type === 'video' || lesson.type === 'external_video' ? (
                          <FiPlayCircle className={`${isActive ? 'text-primary-600' : 'text-gray-400'} flex-shrink-0`} size={15} />
                        ) : lesson.type === 'zoom' ? (
                          <FiVideo className={`${isActive ? 'text-primary-600' : 'text-gray-400'} flex-shrink-0`} size={15} />
                        ) : (
                          <FiFileText className={`${isActive ? 'text-primary-600' : 'text-gray-400'} flex-shrink-0`} size={15} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs ${isActive ? 'text-primary-800 dark:text-primary-200 font-bold' : 'text-gray-600 dark:text-gray-400 font-medium'} line-clamp-2`}>
                          {lesson.title}
                        </span>
                        <div className="flex items-center text-[9px] uppercase font-bold text-gray-400 mt-0.5">
                          <FiClock className="mr-1" size={9} /> {Math.floor((lesson.duration || 600) / 60)} min
                        </div>
                      </div>
                    </div>
                  );
                })}
                {mod.quiz && (
                  <div
                    onClick={() => navigate(`/learn/${id}/quiz/${mod.quiz._id}`)}
                    className="px-5 py-3 cursor-pointer flex items-center text-xs bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 border-l-3 border-yellow-500 transition-colors"
                  >
                    <FiFileText className="text-yellow-600 mr-3 flex-shrink-0" size={14} />
                    <div>
                      <span className="text-yellow-800 dark:text-yellow-500 font-bold block">{mod.quiz.title}</span>
                      <span className="text-yellow-600/60 text-[9px] uppercase font-bold mt-0.5 block">Assessment</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col bg-white dark:bg-gray-950 overflow-y-auto relative w-full lg:w-[calc(100%-330px)]">

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm mr-3">
            <FiList className="text-gray-900 dark:text-white" size={16} />
          </button>
          <h1 className="font-bold text-gray-900 dark:text-white truncate text-sm">{currentLesson?.title || 'Lesson'}</h1>
        </div>

        {/* Video / Content */}
        <div className="bg-black aspect-video w-full flex items-center justify-center relative overflow-hidden">
          {renderContent()}
        </div>

        {/* Lesson Info & Navigation */}
        <div className="p-5 lg:p-10 max-w-5xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-5 border-b border-gray-200 dark:border-gray-800 gap-4">
            <div>
              <span className="inline-block px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold text-[10px] rounded-lg uppercase tracking-widest mb-2">
                Module {activeModuleIndex + 1} &bull; {currentModule?.title}
              </span>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{currentLesson?.title || 'Lesson'}</h1>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <Button
                onClick={prevLesson}
                disabled={isFirstLesson}
                variant="outline"
                size="default"
                className="rounded-xl font-semibold text-xs flex-1 md:flex-initial disabled:opacity-30"
              >
                <FiChevronLeft className="mr-1" /> Previous
              </Button>
              <Button
                onClick={nextLesson}
                size="default"
                className="rounded-xl font-semibold shadow-md shadow-primary-600/15 text-xs flex-1 md:flex-initial"
              >
                Complete & Next <FiChevronRight className="ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Overview</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                Ensure you fully grasp these core concepts before advancing. The notes below serve as reference for the upcoming assessment.
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center border-b border-gray-200 dark:border-gray-800 pb-3 mb-3 text-sm">
                  <FiFileText className="mr-2 text-primary-500" size={14} /> Instructor Notes
                </h3>
                <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 text-sm">
                  {currentLesson?.description ? (
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentLesson.description) }} />
                  ) : (
                    "No supplemental notes available for this lesson."
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center text-sm"><FiDownload className="mr-2 text-accent-500" size={14} /> Resources</h3>
                <div className="space-y-2">
                  {currentLesson?.resources && currentLesson.resources.length > 0 ? (
                    currentLesson.resources.map((resource, idx) => (
                      <a
                        key={idx}
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg flex items-center justify-between group cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                      >
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{resource.title}</span>
                        <FiDownload className="text-gray-400 group-hover:text-primary-500 flex-shrink-0" size={13} />
                      </a>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">No resources attached to this lesson.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FeedbackFormModal
        isOpen={feedbackModalOpen}
        onClose={() => {
          setFeedbackModalOpen(false);
          navigate('/dashboard');
        }}
        formData={feedbackData}
        liveCourseId={id}
        onSuccess={handleFeedbackSuccess}
      />
    </div>
  );
};

export default CoursePlayer;

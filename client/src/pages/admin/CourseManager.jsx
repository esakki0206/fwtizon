import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AdminTable } from '../../components/admin/AdminTable';
import { Button } from '../../components/ui/button';
import { FiPlus, FiTrash2, FiVideo, FiFileText, FiAlertCircle, FiSettings, FiLink, FiUsers, FiDownload } from 'react-icons/fi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import ImageUploader from '../../components/common/ImageUploader';

// Valid categories that match the DB schema enum
const CATEGORIES = [
  'Development',
  'Business',
  'IT & Software',
  'Design',
  'Marketing',
  'Personal Development',
];

const EMPTY_FORM = {
  title: '',
  description: '',
  price: '',
  category: '',
  status: 'draft',
  thumbnail: '',
  instructorName: '',
  instructorPhoto: '',
  modules: [],
  linkedLiveCourseId: '',
};

const CourseManager = () => {
  const [view, setView] = useState('list');  // 'list' | 'editor'
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingCourse, setEditingCourse] = useState(null);  // null = create, string = course _id
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [liveCourses, setLiveCourses] = useState([]);

  const [currentCourse, setCurrentCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchLiveCourses();
  }, []);

  // ── Admin fetch: gets ALL statuses (draft + published)
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/courses');
      setCourses(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveCourses = async () => {
    try {
      const res = await axios.get('/api/admin/live-courses');
      setLiveCourses(res.data.data || []);
    } catch (err) {
      console.error('Failed to load live courses for linking');
    }
  };

  const handleToggleStatus = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await axios.patch(`/api/admin/courses/${id}/toggle-status`);
      toast.success(res.data.message);
      setCourses(prev => prev.map(c => c._id === id ? { ...c, status: res.data.data.status } : c));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.title.trim()) e.title = 'Course title is required';
    if (!formData.description.trim()) e.description = 'Description is required';
    if (!formData.instructorName.trim()) e.instructorName = 'Instructor name is required';
    if (formData.price === '' || isNaN(Number(formData.price)) || Number(formData.price) < 0)
      e.price = 'Enter a valid price (₹ 0 or more)';
    if (!formData.category) e.category = 'Please select a category';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Open editor ─────────────────────────────────────────────────────────
  const handleEdit = async (course) => {
    setEditingCourse(course._id);
    setErrors({});
    
    // Set initial basic data immediately for UI responsiveness
    setFormData({
      title: course.title || '',
      description: course.description || '',
      price: course.price ?? '',
      category: course.category || '',
      status: (course.status || 'draft').toLowerCase(),
      thumbnail: course.thumbnail || '',
      instructorName: course.instructorName || course.displayInstructorName || '',
      instructorPhoto: course.instructorPhoto || course.displayInstructorPhoto || '',
      modules: [], // Will be populated shortly
      linkedLiveCourseId: course.linkedLiveCourseId || '',
    });
    
    setView('editor');
    
    // Fetch full course data including lessons
    try {
      const res = await axios.get(`/api/admin/courses/${course._id}/full`);
      const fullCourse = res.data.data;
      setFormData(prev => ({
        ...prev,
        modules: fullCourse.modules || [],
      }));
    } catch (err) {
      toast.error('Failed to load full curriculum. Module editing may be incomplete.');
    }
  };

  const handleCreateNew = () => {
    setEditingCourse(null);
    setErrors({});
    setFormData(EMPTY_FORM);
    setView('editor');
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
    try {
      await axios.delete(`/api/admin/courses/${id}`);
      toast.success('Course deleted');
      setCourses(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
    }
  };

  // ── View Students ───────────────────────────────────────────────────────
  const handleViewStudents = async (e, course) => {
    e.stopPropagation();
    setEditingCourse(course._id);
    setCurrentCourse(course);
    setView('students');
    setStudentsLoading(true);
    try {
      const res = await axios.get(`/api/admin/courses/${course._id}/students`);
      setStudents(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleExportStudents = () => {
    if (!students || students.length === 0) return;
    setExportLoading(true);
    try {
      const headers = ['Name', 'Email', 'Contact', 'Status', 'Enrolled On'];
      const rows = students.map(app => [
        `"${app.user?.name || app.fullName || ''}"`,
        `"${app.user?.email || app.email || ''}"`,
        `"${app.user?.mobileNumber || ''}"`,
        `"${app.status || 'active'}"`,
        `"${new Date(app.createdAt).toISOString()}"`
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const courseName = currentCourse?.title ? currentCourse.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40) : 'course';
      link.setAttribute('download', `students_${courseName}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Students exported successfully');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
      category: formData.category,
      status: formData.status.toLowerCase(),
      thumbnail: formData.thumbnail || 'no-photo.jpg',
      instructorName: formData.instructorName.trim(),
      instructorPhoto: formData.instructorPhoto || '',
      linkedLiveCourseId: formData.linkedLiveCourseId || null,
    };

    try {
      setSaving(true);
      let savedCourse;

      // 1. Save Base Course Data
      if (editingCourse) {
        const res = await axios.put(`/api/admin/courses/${editingCourse}`, payload);
        savedCourse = res.data.data;
        setCourses(prev => prev.map(c => c._id === editingCourse ? savedCourse : c));
      } else {
        const res = await axios.post('/api/admin/courses', payload);
        savedCourse = res.data.data;
        setEditingCourse(savedCourse._id); // Needed for module save
        setCourses(prev => [savedCourse, ...prev]);
      }

      // 2. Bulk Save Curriculum Modules & Lessons
      if (formData.modules && formData.modules.length > 0) {
        await axios.put(`/api/admin/courses/${savedCourse._id}/modules`, {
          modules: formData.modules
        });
      }

      toast.success('Course and curriculum saved successfully');
      setView('list');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  // ── Field helper ────────────────────────────────────────────────────────
  const set = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  // ── Module helpers ──────────────────────────────────────────────────────
  const addModule = () =>
    setFormData(prev => ({
      ...prev,
      modules: [...(prev.modules || []), { title: 'New Module', lessons: [] }],
    }));

  const removeModule = (mIdx) => {
    if(!window.confirm('Remove this module and all its lessons?')) return;
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.filter((_, i) => i !== mIdx),
    }));
  }

  const addLesson = (mIdx) =>
    setFormData(prev => {
      const updated = [...prev.modules];
      updated[mIdx].lessons.push({ 
        title: 'New Lesson', 
        type: 'video', 
        duration: 600,
        content: '',
        zoomEmbedLink: '',
        zoomPassword: '',
        resources: []
      });
      return { ...prev, modules: updated };
    });

  const addResource = (mIdx, lIdx) => {
    setFormData(prev => {
      const updated = [...prev.modules];
      const lesson = updated[mIdx].lessons[lIdx];
      if (!lesson.resources) lesson.resources = [];
      lesson.resources.push({ title: 'New Resource', url: '' });
      return { ...prev, modules: updated };
    });
  };

  // ── Table columns ───────────────────────────────────────────────────────
  const columns = [
    {
      header: 'Course',
      accessorKey: 'title',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={
              row.thumbnail && row.thumbnail !== 'no-photo.jpg'
                ? row.thumbnail
                : '/default-course.jpg'
            }
            alt={row.title}
            className="w-10 h-10 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 flex-shrink-0"
            onError={e => { e.target.src = '/default-course.jpg'; }}
          />
          <div>
            <div className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{row.title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              <img
                src={
                  row.displayInstructorPhoto || row.instructorPhoto || row.instructor?.avatar
                    ? (row.displayInstructorPhoto || row.instructorPhoto || row.instructor?.avatar)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(row.displayInstructorName || 'A')}&size=24&background=4f46e5&color=fff`
                }
                alt="instructor"
                className="w-4 h-4 rounded-full object-cover"
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(row.displayInstructorName || 'A')}&size=24&background=4f46e5&color=fff`; }}
              />
              {row.displayInstructorName || row.instructorName || row.instructor?.name || 'Fwtion Academy'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: (row) => (
        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-medium">
          {row.category}
        </span>
      ),
    },
    {
      header: 'Price',
      accessorKey: 'price',
      cell: (row) => <span className="font-bold text-sm">₹{row.price}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <button
          onClick={(e) => handleToggleStatus(e, row._id)}
          className={`px-2 py-1 rounded text-xs font-bold w-max transition-colors ${
            row.status === 'published'
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50'
          }`}
        >
          {row.status === 'published' ? 'Published' : 'Draft'}
        </button>
      ),
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={(e) => handleViewStudents(e, row)}>
            Students
          </Button>
          <Button variant="destructive" size="sm" onClick={(e) => handleDelete(e, row._id)}>
            <FiTrash2 className="mr-1" size={12} /> Delete
          </Button>
        </div>
      ),
    },
  ];

  const FieldError = ({ field }) =>
    errors[field] ? (
      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
        <FiAlertCircle size={11} /> {errors[field]}
      </p>
    ) : null;

  return (
    <div className="animate-in fade-in duration-500">
      {view === 'list' && (
        <AdminTable
          title="Course Database"
          description="Manage all learning paths, prices, instructor details, and visibility."
          columns={columns}
          data={courses}
          loading={loading}
          onRowClick={(row) => handleEdit(row)}
          renderActions={() => (
            <Button className="font-bold" onClick={handleCreateNew}>
              <FiPlus className="mr-2" /> New Course
            </Button>
          )}
        />
      )}

      {view === 'editor' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between sticky top-0 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md py-4 z-20 border-b border-gray-200 dark:border-gray-800 -mx-6 px-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingCourse ? 'Edit Course' : 'Create Course'}
            </h2>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setView('list')} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Full Course'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Left column: details + curriculum ── */}
            <div className="lg:col-span-2 space-y-6">

              <Card>
                <CardHeader><CardTitle>Course Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => set('title', e.target.value)}
                      placeholder="e.g. Complete Python Bootcamp"
                      className={`mt-1 w-full bg-white dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none ${errors.title ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                    <FieldError field="title" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="What will students learn? Why is this course valuable? (Supports HTML)"
                      className={`mt-1 w-full bg-white dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm h-32 resize-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none ${errors.description ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                    <FieldError field="description" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => set('category', e.target.value)}
                      className={`mt-1 w-full bg-white dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none ${errors.category ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      <option value="">— Select category —</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <FieldError field="category" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Instructor Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Instructor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.instructorName}
                      onChange={e => set('instructorName', e.target.value)}
                      placeholder="e.g. John Smith"
                      className={`mt-1 w-full bg-white dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none ${errors.instructorName ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                    <FieldError field="instructorName" />
                  </div>

                  <div>
                    <ImageUploader
                      label="Instructor Photo"
                      currentImage={formData.instructorPhoto}
                      onUploadComplete={(url) => set('instructorPhoto', url)}
                    />
                    <div className="mt-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        Or paste a direct image URL:
                      </label>
                      <input
                        type="url"
                        value={formData.instructorPhoto}
                        onChange={e => set('instructorPhoto', e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Curriculum Builder */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Course Curriculum</h3>
                
                {formData.modules?.map((module, mIdx) => (
                  <div key={mIdx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-6 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex-1 flex items-center">
                        <span className="font-bold text-gray-400 mr-3">Module {mIdx + 1}</span>
                        <input
                          value={module.title}
                          onChange={e => {
                            const updated = [...formData.modules];
                            updated[mIdx].title = e.target.value;
                            setFormData(prev => ({ ...prev, modules: updated }));
                          }}
                          className="bg-transparent font-bold text-gray-900 dark:text-white focus:outline-none w-full"
                          placeholder="Module Title"
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeModule(mIdx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <FiTrash2 size={16} />
                      </Button>
                    </div>

                    <div className="p-4 space-y-4">
                      {module.lessons?.map((lesson, lIdx) => (
                        <div key={lIdx} className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                          
                          {/* Lesson Header */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex-1 flex items-center w-full">
                              {lesson.type === 'video' || lesson.type === 'external_video' ? <FiVideo className="mr-3 text-primary-500" /> : <FiFileText className="mr-3 text-accent-500" />}
                              <input
                                value={lesson.title}
                                onChange={e => {
                                  const updated = [...formData.modules];
                                  updated[mIdx].lessons[lIdx].title = e.target.value;
                                  setFormData(prev => ({ ...prev, modules: updated }));
                                }}
                                className="bg-transparent font-semibold text-gray-800 dark:text-white focus:outline-none w-full border-b border-dashed border-gray-300 dark:border-gray-600 focus:border-primary-500 pb-1"
                                placeholder="Lesson Title"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={lesson.type}
                                onChange={e => {
                                  const updated = [...formData.modules];
                                  updated[mIdx].lessons[lIdx].type = e.target.value;
                                  setFormData(prev => ({ ...prev, modules: updated }));
                                }}
                                className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="video">Video (URL)</option>
                                <option value="external_video">External Video (Embed)</option>
                                <option value="zoom">Zoom Embed</option>
                                <option value="pdf">PDF Document</option>
                                <option value="text">Rich Text</option>
                              </select>
                              <Button variant="ghost" size="sm" onClick={() => {
                                if(!window.confirm('Remove lesson?')) return;
                                const updated = [...formData.modules];
                                updated[mIdx].lessons = updated[mIdx].lessons.filter((_, i) => i !== lIdx);
                                setFormData(prev => ({ ...prev, modules: updated }));
                              }} className="text-red-500 p-2">
                                <FiTrash2 size={14} />
                              </Button>
                            </div>
                          </div>

                          {/* Lesson Content Type Specific Fields */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                            
                            {(lesson.type === 'video' || lesson.type === 'external_video' || lesson.type === 'pdf') && (
                              <div className="md:col-span-2">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Content URL</label>
                                <input
                                  type="text"
                                  value={lesson.content || ''}
                                  onChange={e => {
                                    const updated = [...formData.modules];
                                    updated[mIdx].lessons[lIdx].content = e.target.value;
                                    setFormData(prev => ({ ...prev, modules: updated }));
                                  }}
                                  className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 outline-none"
                                  placeholder={lesson.type === 'pdf' ? "https://.../file.pdf" : "https://..."}
                                />
                              </div>
                            )}

                            {lesson.type === 'zoom' && (
                              <>
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Zoom Embed URL</label>
                                  <input
                                    type="text"
                                    value={lesson.zoomEmbedLink || ''}
                                    onChange={e => {
                                      const updated = [...formData.modules];
                                      updated[mIdx].lessons[lIdx].zoomEmbedLink = e.target.value;
                                      setFormData(prev => ({ ...prev, modules: updated }));
                                    }}
                                    className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 outline-none"
                                    placeholder="https://zoom.us/wc/join/..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Zoom Password (Optional)</label>
                                  <input
                                    type="text"
                                    value={lesson.zoomPassword || ''}
                                    onChange={e => {
                                      const updated = [...formData.modules];
                                      updated[mIdx].lessons[lIdx].zoomPassword = e.target.value;
                                      setFormData(prev => ({ ...prev, modules: updated }));
                                    }}
                                    className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 outline-none"
                                    placeholder="Passcode for students"
                                  />
                                </div>
                              </>
                            )}

                            {lesson.type === 'text' && (
                              <div className="md:col-span-2">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Rich Text Content (HTML)</label>
                                <textarea
                                  value={lesson.content || ''}
                                  onChange={e => {
                                    const updated = [...formData.modules];
                                    updated[mIdx].lessons[lIdx].content = e.target.value;
                                    setFormData(prev => ({ ...prev, modules: updated }));
                                  }}
                                  className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 outline-none h-24 font-mono"
                                  placeholder="<p>Enter your HTML content here</p>"
                                />
                              </div>
                            )}

                            <div className="md:col-span-2">
                              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Instructor Notes / Description</label>
                              <textarea
                                value={lesson.description || ''}
                                onChange={e => {
                                  const updated = [...formData.modules];
                                  updated[mIdx].lessons[lIdx].description = e.target.value;
                                  setFormData(prev => ({ ...prev, modules: updated }));
                                }}
                                className="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 outline-none h-16"
                                placeholder="Summary or additional reading notes..."
                              />
                            </div>

                            <div className="flex gap-4">
                              <label className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={lesson.isPreview || false}
                                  onChange={e => {
                                    const updated = [...formData.modules];
                                    updated[mIdx].lessons[lIdx].isPreview = e.target.checked;
                                    setFormData(prev => ({ ...prev, modules: updated }));
                                  }}
                                  className="mr-2"
                                />
                                Free Preview
                              </label>
                            </div>
                            
                            <div>
                              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Duration (seconds)</label>
                              <input
                                type="number"
                                value={lesson.duration || 0}
                                onChange={e => {
                                  const updated = [...formData.modules];
                                  updated[mIdx].lessons[lIdx].duration = Number(e.target.value);
                                  setFormData(prev => ({ ...prev, modules: updated }));
                                }}
                                className="w-24 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 outline-none"
                              />
                            </div>
                          </div>

                          {/* Resources Array */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Downloadable Resources</label>
                              <button type="button" onClick={() => addResource(mIdx, lIdx)} className="text-[10px] bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-300 font-bold">+ Add Resource</button>
                            </div>
                            
                            <div className="space-y-2">
                              {lesson.resources?.map((res, rIdx) => (
                                <div key={rIdx} className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={res.title}
                                    onChange={e => {
                                      const updated = [...formData.modules];
                                      updated[mIdx].lessons[lIdx].resources[rIdx].title = e.target.value;
                                      setFormData(prev => ({ ...prev, modules: updated }));
                                    }}
                                    className="w-1/3 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                                    placeholder="Resource Title"
                                  />
                                  <input
                                    type="text"
                                    value={res.url}
                                    onChange={e => {
                                      const updated = [...formData.modules];
                                      updated[mIdx].lessons[lIdx].resources[rIdx].url = e.target.value;
                                      setFormData(prev => ({ ...prev, modules: updated }));
                                    }}
                                    className="flex-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                                    placeholder="https://..."
                                  />
                                  <button onClick={() => {
                                    const updated = [...formData.modules];
                                    updated[mIdx].lessons[lIdx].resources = updated[mIdx].lessons[lIdx].resources.filter((_, i) => i !== rIdx);
                                    setFormData(prev => ({ ...prev, modules: updated }));
                                  }} className="text-red-400 p-1">
                                    <FiTrash2 size={12}/>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      ))}
                      
                      <Button variant="ghost" size="sm" onClick={() => addLesson(mIdx)} className="w-full mt-2 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                        <FiPlus className="mr-2" /> Add Lesson
                      </Button>
                    </div>
                  </div>
                ))}

                <Button onClick={addModule} variant="outline" className="w-full py-8 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <FiPlus className="mr-2" size={18} /> Add New Module
                </Button>
              </div>
            </div>

            {/* ── Right column: settings ── */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Course Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Visibility
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => set('status', e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none"
                    >
                      <option value="published">Published — visible to all</option>
                      <option value="draft">Draft — hidden</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      Base Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.price}
                      onChange={e => set('price', e.target.value)}
                      placeholder="e.g. 999"
                      className={`w-full bg-white dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none ${errors.price ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                    <FieldError field="price" />
                  </div>

                  <div>
                    <ImageUploader
                      label="Course Thumbnail"
                      currentImage={formData.thumbnail !== 'no-photo.jpg' ? formData.thumbnail : ''}
                      onUploadComplete={(url) => set('thumbnail', url)}
                    />
                    <div className="mt-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        Or paste thumbnail URL:
                      </label>
                      <input
                        type="url"
                        value={formData.thumbnail === 'no-photo.jpg' ? '' : formData.thumbnail}
                        onChange={e => set('thumbnail', e.target.value)}
                        placeholder="https://..."
                        className="mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Linked Live Course */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FiLink size={14} className="text-primary-500" /> Linked Live Course
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                    If linked, students enrolled in the selected live course get <strong>free auto-enrollment</strong> into this course.
                  </p>
                  <select
                    value={formData.linkedLiveCourseId || ''}
                    onChange={e => set('linkedLiveCourseId', e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none"
                  >
                    <option value="">— No linked live course —</option>
                    {liveCourses.map(lc => (
                      <option key={lc._id} value={lc._id}>{lc.title}</option>
                    ))}
                  </select>
                  {formData.linkedLiveCourseId && (
                    <div className="mt-2 flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <FiLink size={12} />
                      <span>Live course students will get free access</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(formData.instructorName || formData.instructorPhoto) && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Instructor Preview</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          formData.instructorPhoto ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.instructorName || 'I')}&background=4f46e5&color=fff&size=48`
                        }
                        alt="instructor"
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                        onError={e => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.instructorName || 'I')}&background=4f46e5&color=fff&size=48`;
                        }}
                      />
                      <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-white">
                          {formData.instructorName || 'Instructor Name'}
                        </p>
                        <p className="text-xs text-gray-500">Lead Instructor</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enrolled Students</h2>
              <p className="text-gray-500 text-sm truncate">
                {currentCourse?.title || 'Selected course'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {students.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleExportStudents}
                  disabled={exportLoading}
                  className="flex items-center gap-2 font-semibold text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20"
                >
                  <FiDownload size={15} />
                  {exportLoading ? 'Exporting...' : 'Export to Excel'}
                </Button>
              )}
              <Button variant="outline" onClick={() => { setView('list'); setCurrentCourse(null); }}>
                Back to Courses
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {studentsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading students...</div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <FiUsers className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={48} />
                  <p className="font-medium">No students enrolled yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-4 sm:px-6 py-4 font-bold">#</th>
                        <th className="px-4 sm:px-6 py-4 font-bold">Student</th>
                        <th className="px-4 sm:px-6 py-4 font-bold">Contact</th>
                        <th className="px-4 sm:px-6 py-4 font-bold">Progress</th>
                        <th className="px-4 sm:px-6 py-4 font-bold">Status</th>
                        <th className="px-4 sm:px-6 py-4 font-bold">Enrolled On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {students.map((app, index) => (
                        <tr
                          key={app._id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-4 text-gray-400 text-xs font-mono">{index + 1}</td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="font-bold text-gray-900 dark:text-white">{app.user?.name || app.fullName || 'Unknown'}</div>
                            <div className="text-gray-500 text-xs mt-0.5">{app.user?.email || app.email || 'N/A'}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="text-gray-900 dark:text-white text-xs font-medium">
                              {app.user?.mobileNumber || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="text-gray-900 dark:text-white text-xs font-medium">
                              {app.progress?.percentComplete || 0}%
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${app.status === 'completed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                              {app.status || 'active'}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-gray-500 text-xs">
                            {new Date(app.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CourseManager;

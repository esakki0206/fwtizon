import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AdminTable } from '../../components/admin/AdminTable';
import { Button } from '../../components/ui/button';
import { FiPlus, FiTrash2, FiVideo, FiFileText, FiAlertCircle } from 'react-icons/fi';
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
  status: 'draft',         // lowercase — matches DB schema enum
  thumbnail: '',
  instructorName: '',
  instructorPhoto: '',
  modules: [],
};

const CourseManager = () => {
  const [view, setView] = useState('list');  // 'list' | 'editor'
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingCourse, setEditingCourse] = useState(null);  // null = create, string = course _id
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCourses();
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
  const handleEdit = (course) => {
    setEditingCourse(course._id);
    setErrors({});
    setFormData({
      title: course.title || '',
      description: course.description || '',
      price: course.price ?? '',
      category: course.category || '',
      status: (course.status || 'draft').toLowerCase(),
      thumbnail: course.thumbnail || '',
      instructorName: course.instructorName || course.displayInstructorName || '',
      instructorPhoto: course.instructorPhoto || course.displayInstructorPhoto || '',
      modules: course.modules || [],
    });
    setView('editor');
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
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await axios.delete(`/api/admin/courses/${id}`);
      toast.success('Course deleted');
      setCourses(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
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
    };

    try {
      setSaving(true);
      let savedCourse;

      if (editingCourse) {
        const res = await axios.put(`/api/admin/courses/${editingCourse}`, payload);
        savedCourse = res.data.data;
        toast.success('Course updated successfully');
        // Replace in local state so the table reflects immediately
        setCourses(prev => prev.map(c => c._id === editingCourse ? savedCourse : c));
      } else {
        const res = await axios.post('/api/admin/courses', payload);
        savedCourse = res.data.data;
        toast.success('Course created successfully');
        setCourses(prev => [savedCourse, ...prev]);
      }

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

  const removeModule = (mIdx) =>
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.filter((_, i) => i !== mIdx),
    }));

  const addLesson = (mIdx) =>
    setFormData(prev => {
      const updated = [...prev.modules];
      updated[mIdx].lessons.push({ title: 'New Lesson', type: 'video', duration: 300 });
      return { ...prev, modules: updated };
    });

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
        <span
          className={`px-2 py-1 rounded text-xs font-bold w-max ${
            row.status === 'published'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}
        >
          {row.status === 'published' ? 'Published' : 'Draft'}
        </span>
      ),
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: (row) => (
        <Button variant="destructive" size="sm" onClick={(e) => handleDelete(e, row._id)}>
          <FiTrash2 className="mr-1" size={12} /> Delete
        </Button>
      ),
    },
  ];

  // ── Error field helper ──────────────────────────────────────────────────
  const FieldError = ({ field }) =>
    errors[field] ? (
      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
        <FiAlertCircle size={11} /> {errors[field]}
      </p>
    ) : null;

  // ── Render ──────────────────────────────────────────────────────────────
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editingCourse ? 'Edit Course' : 'Create Course'}
            </h2>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setView('list')} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Course'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Left column: details + curriculum ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Course Details */}
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
                      className={`mt-1 w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none ${errors.title ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
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
                      placeholder="What will students learn? Why is this course valuable?"
                      className={`mt-1 w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm h-32 resize-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none ${errors.description ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
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
                      className={`mt-1 w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none ${errors.category ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
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

              {/* Instructor Details */}
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
                      className={`mt-1 w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none ${errors.instructorName ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                    <FieldError field="instructorName" />
                  </div>

                  {/* Instructor photo: prefer uploaded URL but allow manual URL fallback */}
                  <div>
                    <ImageUploader
                      label="Instructor Photo"
                      currentImage={formData.instructorPhoto}
                      onUploadComplete={(url) => set('instructorPhoto', url)}
                    />
                    {/* Manual URL fallback */}
                    <div className="mt-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        Or paste a direct image URL:
                      </label>
                      <input
                        type="url"
                        value={formData.instructorPhoto}
                        onChange={e => set('instructorPhoto', e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none"
                      />
                    </div>
                    {formData.instructorPhoto && (
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={formData.instructorPhoto}
                          alt="Instructor preview"
                          className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                          onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.instructorName || 'Instructor')}&background=4f46e5&color=fff`; }}
                        />
                        <span className="text-xs text-gray-500">Photo preview</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Curriculum */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Curriculum</h3>
                {formData.modules?.map((module, mIdx) => (
                  <div key={mIdx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 shadow-sm">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-t-xl border-b border-gray-200 dark:border-gray-700">
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
                      <Button variant="destructive" size="sm" onClick={() => removeModule(mIdx)} className="ml-4">
                        <FiTrash2 size={14} />
                      </Button>
                    </div>
                    <div className="p-4 space-y-2">
                      {module.lessons?.map((lesson, lIdx) => (
                        <div key={lIdx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-lg gap-2">
                          <div className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 w-full">
                            {lesson.type === 'video'
                              ? <FiVideo className="mr-3 text-primary-500 flex-shrink-0" />
                              : <FiFileText className="mr-3 text-accent-500 flex-shrink-0" />}
                            <input
                              value={lesson.title}
                              onChange={e => {
                                const updated = [...formData.modules];
                                updated[mIdx].lessons[lIdx].title = e.target.value;
                                setFormData(prev => ({ ...prev, modules: updated }));
                              }}
                              className="bg-transparent focus:outline-none w-full"
                              placeholder="Lesson Title"
                            />
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                              value={lesson.type}
                              onChange={e => {
                                const updated = [...formData.modules];
                                updated[mIdx].lessons[lIdx].type = e.target.value;
                                setFormData(prev => ({ ...prev, modules: updated }));
                              }}
                              className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 focus:outline-none"
                            >
                              <option value="video">Video</option>
                              <option value="text">Text</option>
                            </select>
                            <Button variant="ghost" size="sm" onClick={() => {
                              const updated = [...formData.modules];
                              updated[mIdx].lessons = updated[mIdx].lessons.filter((_, i) => i !== lIdx);
                              setFormData(prev => ({ ...prev, modules: updated }));
                            }} className="text-red-500">
                              <FiTrash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => addLesson(mIdx)} className="w-full mt-2 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500">
                        <FiPlus className="mr-2" /> Add Lesson
                      </Button>
                    </div>
                  </div>
                ))}
                <Button onClick={addModule} variant="outline" className="w-full py-8 border-dashed border-gray-300 dark:border-gray-700">
                  <FiPlus className="mr-2" /> Add New Module
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
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none"
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
                      className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none ${errors.price ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
                    />
                    <FieldError field="price" />
                  </div>

                  <div>
                    <ImageUploader
                      label="Course Thumbnail"
                      currentImage={formData.thumbnail !== 'no-photo.jpg' ? formData.thumbnail : ''}
                      onUploadComplete={(url) => set('thumbnail', url)}
                    />
                    {/* Manual URL fallback */}
                    <div className="mt-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        Or paste thumbnail URL:
                      </label>
                      <input
                        type="url"
                        value={formData.thumbnail === 'no-photo.jpg' ? '' : formData.thumbnail}
                        onChange={e => set('thumbnail', e.target.value)}
                        placeholder="https://..."
                        className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Live preview of what users will see */}
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
    </div>
  );
};

export default CourseManager;

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AdminTable } from '../../components/admin/AdminTable';
import { Button } from '../../components/ui/button';
import { FiPlus, FiEdit2, FiTrash2, FiVideo, FiFileText } from 'react-icons/fi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

const CourseManager = () => {
  const [view, setView] = useState('list'); // 'list' | 'editor'
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/courses');
      setCourses(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course._id);
    setFormData({
      title: course.title || '',
      description: course.description || '',
      price: course.price || 0,
      category: course.category || '',
      status: course.status || 'Draft',
      thumbnail: course.thumbnail || '',
      modules: course.modules || []
    });
    setView('editor');
  };

  const handleCreateNew = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      description: '',
      price: 0,
      category: '',
      status: 'Draft',
      thumbnail: '',
      modules: []
    });
    setView('editor');
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent row click
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await axios.delete(`/api/courses/${id}`);
      toast.success('Course deleted successfully');
      setCourses(courses.filter(c => c._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.price || !formData.category) {
      return toast.error('Please fill all required fields');
    }

    try {
      if (editingCourse) {
        await axios.put(`/api/courses/${editingCourse}`, formData);
        toast.success('Course updated successfully');
      } else {
        await axios.post('/api/courses', formData);
        toast.success('Course created successfully');
      }
      setView('list');
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save course');
    }
  };

  // Simple handlers to add dummy modules/lessons for demonstration of CRUD
  const addModule = () => {
    setFormData(prev => ({
      ...prev,
      modules: [...(prev.modules || []), { title: 'New Module', lessons: [] }]
    }));
  };

  const addLesson = (moduleIndex) => {
    const updatedModules = [...formData.modules];
    updatedModules[moduleIndex].lessons.push({ title: 'New Lesson', type: 'video', duration: 300 });
    setFormData({ ...formData, modules: updatedModules });
  };

  const removeModule = (moduleIndex) => {
    const updatedModules = formData.modules.filter((_, idx) => idx !== moduleIndex);
    setFormData({ ...formData, modules: updatedModules });
  };

  const columns = [
    { header: 'Course', accessorKey: 'title', cell: (row) => <div className="font-bold text-gray-900 dark:text-white max-w-xs">{row.title}</div> },
    { header: 'Category', accessorKey: 'category', cell: (row) => <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-medium">{row.category}</span> },
    { header: 'Price', accessorKey: 'price', cell: (row) => <span className="font-bold">₹{row.price}</span> },
    {
      header: 'Status', accessorKey: 'status', cell: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${row.status === 'Published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'} w-max`}>
          {row.status || 'Draft'}
        </span>
      )
    },
    {
      header: 'Actions', id: 'actions', cell: (row) => (
        <div className="flex space-x-2">
          <Button variant="destructive" size="sm" onClick={(e) => handleDelete(e, row._id)}>Delete</Button>
        </div>
      )
    }
  ];

  return (
    <div className="animate-in fade-in duration-500">
      {view === 'list' && (
        <AdminTable
          title="Course Database"
          description="Manage all learning paths, prices, and visibility."
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingCourse ? 'Edit Course' : 'Create Course'}</h2>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
              <Button onClick={handleSave}>Save Course</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

              <Card>
                <CardHeader><CardTitle>Course Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm h-32 resize-none"
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Development"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Modules Editor */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Curriculum</h3>
                {formData.modules?.map((module, mIdx) => (
                  <div key={mIdx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 shadow-sm relative z-0">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-t-xl border-b border-gray-200 dark:border-gray-700">
                      <input
                        value={module.title}
                        onChange={(e) => {
                          const updated = [...formData.modules];
                          updated[mIdx].title = e.target.value;
                          setFormData({ ...formData, modules: updated });
                        }}
                        className="bg-transparent font-bold text-gray-900 dark:text-white focus:outline-none w-full"
                        placeholder="Module Title"
                      />
                      <Button variant="destructive" size="sm" onClick={() => removeModule(mIdx)} className="ml-4 bg-red-50 text-red-600 hover:bg-red-100"><FiTrash2 /></Button>
                    </div>
                    <div className="p-4 space-y-2">
                      {module.lessons?.map((lesson, lIdx) => (
                        <div key={lIdx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg group gap-2">
                          <div className="flex w-full items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                            {lesson.type === 'video' ? <FiVideo className="mr-3 text-primary-500" /> : <FiFileText className="mr-3 text-accent-500" />}
                            <input
                              value={lesson.title}
                              onChange={(e) => {
                                const updated = [...formData.modules];
                                updated[mIdx].lessons[lIdx].title = e.target.value;
                                setFormData({ ...formData, modules: updated });
                              }}
                              className="bg-transparent focus:outline-none w-full"
                              placeholder="Lesson Title"
                            />
                          </div>
                          <div className="flex items-center w-full sm:w-auto">
                            <select
                              value={lesson.type}
                              onChange={(e) => {
                                const updated = [...formData.modules];
                                updated[mIdx].lessons[lIdx].type = e.target.value;
                                setFormData({ ...formData, modules: updated });
                              }}
                              className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 mr-2 focus:outline-none"
                            >
                              <option value="video">Video</option>
                              <option value="text">Text</option>
                            </select>
                            <Button variant="ghost" size="sm" onClick={() => {
                              const updated = [...formData.modules];
                              updated[mIdx].lessons = updated[mIdx].lessons.filter((_, i) => i !== lIdx);
                              setFormData({ ...formData, modules: updated });
                            }} className="text-red-500 w-full sm:w-auto"><FiTrash2 /></Button>
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

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Course Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Course Visibility</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                    >
                      <option value="Published">Published - Visible to all</option>
                      <option value="Draft">Draft - Hidden</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Base Price (₹) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Thumbnail URL</label>
                    <input
                      type="url"
                      value={formData.thumbnail}
                      onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManager;

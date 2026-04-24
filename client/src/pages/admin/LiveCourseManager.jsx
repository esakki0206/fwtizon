import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AdminTable } from '../../components/admin/AdminTable';
import { Button } from '../../components/ui/button';
import { FiPlus, FiVideo, FiUsers, FiMessageCircle, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { formatLiveCourseStartLabel, getLiveCourseTimingText } from '../../lib/liveCourseTiming';

const LiveCourseManager = () => {
  const [view, setView] = useState('list'); // list | editor | applications
  const [liveCourses, setLiveCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingCourse, setEditingCourse] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchLiveCourses();
  }, []);

  const fetchLiveCourses = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/live-courses');
      setLiveCourses(res.data.data || []);
    } // eslint-disable-next-line no-unused-vars
    catch (err) {
      toast.error('Failed to load live cohorts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      classStartTime: '',
      classEndTime: '',
      duration: '',
      price: '',
      zoomLink: '',
      whatsappGroup: '',
      maxStudents: 30,
      status: 'Draft',
      thumbnail: 'no-photo-live.jpg',
      instructorName: '',
      instructorImage: '',
      instructorDesignation: '',
      instructorBio: ''
    });
    setView('editor');
  };

  const handleEdit = (course) => {
    setEditingCourse(course._id);
    // Always fetch the full admin record so sensitive fields (zoomLink, whatsappGroup)
    // are guaranteed to be present — the list endpoint already uses /api/admin/live-courses
    // but this guard makes re-use safe regardless of call origin.
    setFormData({
      title: course.title ?? '',
      description: course.description ?? '',
      startDate: course.startDate ? new Date(course.startDate).toISOString().split('T')[0] : '',
      classStartTime: course.classStartTime ?? '',
      classEndTime: course.classEndTime ?? '',
      duration: course.duration ?? '',
      price: course.price ?? 0,
      zoomLink: course.zoomLink ?? '',
      whatsappGroup: course.whatsappGroup ?? '',
      maxStudents: course.maxStudents ?? 30,
      status: course.status ?? 'Draft',
      thumbnail: course.thumbnail ?? 'no-photo-live.jpg',
      instructorName: course.instructorName ?? '',
      instructorImage: course.instructorImage ?? '',
      instructorDesignation: course.instructorDesignation ?? '',
      instructorBio: course.instructorBio ?? '',
    });
    setView('editor');
  };

  const handleUploadThumbnail = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    // Using a specific toast ID so we can update it
    const toastId = toast.loading('Uploading image...');
    try {
      const res = await axios.post('/api/upload', formDataUpload);
      setFormData(prev => ({ ...prev, thumbnail: res.data.url }));
      toast.success('Image uploaded successfully', { id: toastId });
    }// eslint-disable-next-line no-unused-vars
     catch (err) {
      toast.error('Upload failed', { id: toastId });
    }
  };

  const handleUploadInstructorImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    const toastId = toast.loading('Uploading instructor image...');
    try {
      const res = await axios.post('/api/upload', formDataUpload);
      setFormData(prev => ({ ...prev, instructorImage: res.data.url }));
      toast.success('Instructor image uploaded successfully', { id: toastId });
    } catch (err) {
      toast.error('Upload failed', { id: toastId });
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this live cohort?')) return;
    try {
      await axios.delete(`/api/admin/live-courses/${id}`);
      toast.success('Live Cohort deleted successfully');
      setLiveCourses(liveCourses.filter(c => c._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete cohort');
    }
  };

  const handleViewApplications = async (e, course) => {
    e.stopPropagation();
    setEditingCourse(course._id);
    setView('applications');
    setApplicationsLoading(true);
    try {
      const res = await axios.get(`/api/admin/live-courses/${course._id}/applications`);
      setApplications(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.startDate || !formData.zoomLink) {
      return toast.error('Please fill required fields (Title, Date, Zoom Link)');
    }

    if (formData.classEndTime && !formData.classStartTime) {
      return toast.error('Please add a class start time before setting the end time');
    }

    if (formData.classStartTime && formData.classEndTime && formData.classEndTime <= formData.classStartTime) {
      return toast.error('Class end time must be after class start time');
    }

    try {
      if (editingCourse) {
        await axios.put(`/api/admin/live-courses/${editingCourse}`, formData);
        toast.success('Cohort updated successfully');
      } else {
        await axios.post('/api/admin/live-courses', formData);
        toast.success('Cohort created successfully');
      }
      setView('list');
      fetchLiveCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save cohort');
    }
  };

  const columns = [
    { header: 'Cohort Name', accessorKey: 'title', cell: (row) => <div className="font-bold text-gray-900 dark:text-white max-w-xs">{row.title}</div> },
    {
      header: 'Schedule',
      accessorKey: 'startDate',
      cell: (row) => (
        <div className="min-w-0">
          <div className="text-gray-700 dark:text-gray-200 font-medium text-sm">{formatLiveCourseStartLabel(row, { month: 'short', day: 'numeric', year: 'numeric', includeTime: false })}</div>
          {getLiveCourseTimingText(row) ? <div className="text-[11px] text-gray-500 mt-0.5">{getLiveCourseTimingText(row)}</div> : null}
        </div>
      ),
    },
    { header: 'Enrolled', accessorKey: 'enrolled', cell: (row) => <span className="bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded font-bold text-xs">{row.currentEnrollments || 0} / {row.maxStudents || 30}</span> },
    { header: 'Status', accessorKey: 'status', cell: (row) => (
      <span className={`px-2 py-1 rounded text-xs font-bold ${row.status === 'Ongoing' || row.status === 'Published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
        {row.status || 'Draft'}
      </span>
    )},
    { header: 'Actions', id: 'actions', cell: (row) => (
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" onClick={(e) => handleViewApplications(e, row)}>Applications</Button>
        <Button variant="destructive" size="sm" onClick={(e) => handleDelete(e, row._id)}>Delete</Button>
      </div>
    )}
  ];

  return (
    <div className="animate-in fade-in duration-500">
      {view === 'list' && (
        <AdminTable
          title="Live Cohorts"
          description="Manage active synchronous learning streams."
          columns={columns}
          data={liveCourses}
          loading={loading}
          onRowClick={(row) => handleEdit(row)}
          renderActions={() => (
            <Button className="font-bold" onClick={handleCreateNew}>
              <FiPlus className="mr-2" /> New Cohort
            </Button>
          )}
        />
      )}

      {view === 'editor' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingCourse ? 'Edit Live Cohort' : 'New Live Cohort'}</h2>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
              <Button onClick={handleSave}>Save Cohort</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-1 lg:col-span-2 space-y-6">
               <Card>
                 <CardHeader><CardTitle>Session Details</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                   <div>
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cohort Title <span className="text-red-500">*</span></label>
                     <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                   </div>
                   <div>
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                     <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 w-full h-24 resize-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div>
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date <span className="text-red-500">*</span></label>
                       <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration (e.g. '8 Weeks')</label>
                       <input type="text" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Class Start Time</label>
                       <input type="time" value={formData.classStartTime} onChange={e => setFormData({...formData, classStartTime: e.target.value})} className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Class End Time</label>
                       <input type="time" value={formData.classEndTime} onChange={e => setFormData({...formData, classEndTime: e.target.value})} className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                     </div>
                   </div>
                   <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 px-4 py-3">
                     <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                       This timing will be shown to learners on upcoming classes, dashboard live cards, and live course pages.
                       {!formData.classStartTime ? ' If you leave it blank, users will only see the date.' : ''}
                     </p>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Price (₹)</label>
                       <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Students</label>
                       <input type="number" value={formData.maxStudents} onChange={e => setFormData({...formData, maxStudents: Number(e.target.value)})} className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                     </div>
                   </div>
                   <div>
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Zoom/Meeting URL <span className="text-red-500">*</span></label>
                     <div className="relative mt-1">
                       <FiVideo className="absolute left-3 top-3 text-gray-400" />
                       <input type="url" value={formData.zoomLink} onChange={e => setFormData({...formData, zoomLink: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary-500" />
                     </div>
                   </div>
                   <div>
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp Community Link</label>
                     <div className="relative mt-1">
                       <FiMessageCircle className="absolute left-3 top-3 text-gray-400" />
                       <input type="url" value={formData.whatsappGroup} onChange={e => setFormData({...formData, whatsappGroup: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary-500" />
                     </div>
                   </div>
                 </CardContent>
               </Card>
               
               <Card>
                 <CardHeader><CardTitle>Instructor Profile</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                   <div>
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Instructor Name</label>
                     <input type="text" value={formData.instructorName} onChange={e => setFormData({...formData, instructorName: e.target.value})} className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Dr. Jane Doe" />
                   </div>
                   <div>
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Designation / Role</label>
                     <input type="text" value={formData.instructorDesignation} onChange={e => setFormData({...formData, instructorDesignation: e.target.value})} className="mt-1 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Senior AI Engineer" />
                   </div>
                   <div>
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Instructor Bio</label>
                     <textarea value={formData.instructorBio} onChange={e => setFormData({...formData, instructorBio: e.target.value})} className="mt-1 w-full h-20 resize-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Short biography about the instructor..." />
                   </div>
                   <div>
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Instructor Image</label>
                     <div className="flex items-center space-x-4">
                       {formData.instructorImage ? (
                         <img src={formData.instructorImage} alt="Instructor preview" className="w-16 h-16 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-700" />
                       ) : (
                         <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400">
                           <FiUsers size={20} />
                         </div>
                       )}
                       <div>
                         <input type="file" id="instructor-upload" className="hidden" onChange={handleUploadInstructorImage} accept="image/*" />
                         <label htmlFor="instructor-upload" className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                           <FiUploadCloud className="mr-2" /> Upload Photo
                         </label>
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                 <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                   <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Course Thumbnail</label>
                    <div className="flex items-center space-x-4">
                      {formData.thumbnail && formData.thumbnail !== 'no-photo-live.jpg' ? (
                        <img src={formData.thumbnail} alt="Thumbnail preview" className="w-16 h-16 rounded object-cover shadow-sm" />
                      ) : (
                        <div className="w-16 h-16 rounded bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400">
                          <FiVideo size={20} />
                        </div>
                      )}
                      <div>
                        <input type="file" id="thumbnail-upload" className="hidden" onChange={handleUploadThumbnail} accept="image/*" />
                        <label htmlFor="thumbnail-upload" className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                          <FiUploadCloud className="mr-2" /> Upload Image
                        </label>
                      </div>
                    </div>
                  </div>

                   <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Status</label>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})} 
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                 </CardContent>
              </Card>

              {editingCourse && (
                <Card>
                  <CardHeader><CardTitle>Roster Overview</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center"><FiUsers className="mr-3 text-primary-500"/> <span className="font-bold text-gray-900 dark:text-white">Enrolled</span></div>
                      <span className="font-medium text-sm text-gray-500">{liveCourses.find(c => c._id === editingCourse)?.currentEnrollments || 0} / {formData.maxStudents}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
      {view === 'applications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cohort Applications</h2>
              <p className="text-gray-500">Viewing applications for the selected cohort.</p>
            </div>
            <Button variant="outline" onClick={() => setView('list')}>Back to Cohorts</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {applicationsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading applications...</div>
              ) : applications.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <FiUsers className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={48} />
                  No applications received yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-6 py-4 font-bold">Applicant</th>
                        <th className="px-6 py-4 font-bold">Contact</th>
                        <th className="px-6 py-4 font-bold">Gender</th>
                        <th className="px-6 py-4 font-bold">Background</th>
                        <th className="px-6 py-4 font-bold">Applied On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {applications.map((app) => (
                        <tr key={app._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 dark:text-white">{app.fullName}</div>
                            <div className="text-gray-500 text-xs">{app.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900 dark:text-white">Mob: {app.mobileNumber}</div>
                            <div className="text-gray-500 text-xs">WA: {app.whatsappNumber}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">{app.gender}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900 dark:text-white text-xs">{app.courseDepartment || 'N/A'}</div>
                            <div className="text-gray-500 text-xs">{app.experienceLevel || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs">
                            {new Date(app.createdAt).toLocaleDateString()}
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

export default LiveCourseManager;

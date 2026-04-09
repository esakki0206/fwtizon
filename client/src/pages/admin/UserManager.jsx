import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiUserX,
  FiUserCheck,
  FiUser,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiKey,
  FiBookOpen,
  FiDownload,
  FiUsers,
  FiCheckCircle,
  FiCopy,
  FiExternalLink,
  FiCalendar,
  FiClock,
  FiFileText,
} from 'react-icons/fi';

import { AdminTable } from '../../components/admin/AdminTable';
import AdminDropdown from '../../components/admin/AdminDropdown';
import AdminDrawer from '../../components/admin/AdminDrawer';
import AdminModal, { AdminConfirmDialog } from '../../components/admin/AdminModal';
import AdminBadge from '../../components/admin/AdminBadge';
import { Button } from '../../components/ui/button';
import { studentService } from '../../lib/services/admin';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { cn } from '../../lib/utils';

const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

const formatRelative = (value) => {
  if (!value) return 'Never';
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return 'Never';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
};

const Avatar = ({ name = '', src, size = 'md' }) => {
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-9 w-9 text-sm';
  if (src && !src.includes('default_avatar')) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0',
          sizeClass
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-full bg-linear-to-tr from-primary-500 to-indigo-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm',
        sizeClass
      )}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
};

const StatTile = ({ icon, label, value, tone = 'primary' }) => {
  const tones = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    success: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    neutral: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  };
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5">
      <div className="flex items-center gap-2.5">
        <span className={cn('p-1.5 rounded-lg', tones[tone])}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

const UserManager = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const debouncedSearch = useDebouncedValue(search, 350);

  // Drawer / modal state
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'student' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [confirm, setConfirm] = useState({ open: false, type: null, target: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [tempPasswordModal, setTempPasswordModal] = useState({ open: false, password: '', name: '' });

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await studentService.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        status: statusFilter,
        role: roleFilter,
        sortBy,
        sortOrder,
      });
      setStudents(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, roleFilter, sortBy, sortOrder]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, roleFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ─── Profile drawer ────────────────────────────────────────
  const openProfile = useCallback(async (row) => {
    setProfileOpen(true);
    setProfileLoading(true);
    setProfile(null);
    try {
      const data = await studentService.get(row._id);
      setProfile(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load profile');
      setProfileOpen(false);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ─── Edit modal ────────────────────────────────────────────
  const openEdit = (row) => {
    setEditTarget(row);
    setEditForm({ name: row.name || '', email: row.email || '', role: row.role || 'student' });
    setEditOpen(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      return toast.error('Name and email are required');
    }
    try {
      setEditSubmitting(true);
      const updated = await studentService.update(editTarget._id, editForm);
      setStudents((prev) => prev.map((s) => (s._id === updated._id ? { ...s, ...updated } : s)));
      toast.success('Student updated');
      setEditOpen(false);
      setEditTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ─── Suspend ───────────────────────────────────────────────
  const confirmSuspend = async () => {
    const target = confirm.target;
    if (!target) return;
    try {
      setConfirmLoading(true);
      const data = await studentService.toggleSuspend(target._id);
      setStudents((prev) =>
        prev.map((s) => (s._id === target._id ? { ...s, status: data.status } : s))
      );
      toast.success(data.status === 'suspended' ? 'Student suspended' : 'Student reactivated');
      setConfirm({ open: false, type: null, target: null });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setConfirmLoading(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────
  const confirmDelete = async () => {
    const target = confirm.target;
    if (!target) return;
    try {
      setConfirmLoading(true);
      await studentService.remove(target._id);
      setStudents((prev) => prev.filter((s) => s._id !== target._id));
      setTotal((t) => Math.max(t - 1, 0));
      toast.success('Student permanently deleted');
      setConfirm({ open: false, type: null, target: null });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setConfirmLoading(false);
    }
  };

  // ─── Reset password ────────────────────────────────────────
  const confirmReset = async () => {
    const target = confirm.target;
    if (!target) return;
    try {
      setConfirmLoading(true);
      const data = await studentService.resetPassword(target._id);
      setConfirm({ open: false, type: null, target: null });
      setTempPasswordModal({ open: true, password: data.tempPassword, name: target.name });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setConfirmLoading(false);
    }
  };

  // ─── Export ────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      await studentService.exportCsv();
      toast.success('CSV export started');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export students');
    }
  };

  // ─── Confirm dispatcher ────────────────────────────────────
  const handleConfirm = () => {
    if (confirm.type === 'suspend') return confirmSuspend();
    if (confirm.type === 'delete') return confirmDelete();
    if (confirm.type === 'reset') return confirmReset();
  };

  const confirmCopy = useMemo(() => {
    if (!confirm.target) return { title: '', description: '', label: 'Confirm', destructive: true };
    if (confirm.type === 'delete') {
      return {
        title: `Delete ${confirm.target.name}?`,
        description:
          'This permanently removes the student account, enrollments, quiz attempts, assignment submissions, payments, and certificates. This action cannot be undone.',
        label: 'Delete forever',
        destructive: true,
      };
    }
    if (confirm.type === 'suspend') {
      const isSuspended = confirm.target.status === 'suspended';
      return {
        title: isSuspended ? `Reactivate ${confirm.target.name}?` : `Suspend ${confirm.target.name}?`,
        description: isSuspended
          ? 'The student will regain access to courses and dashboards immediately.'
          : 'The student will be unable to log in or access any course material until reactivated.',
        label: isSuspended ? 'Reactivate' : 'Suspend',
        destructive: !isSuspended,
      };
    }
    if (confirm.type === 'reset') {
      return {
        title: `Reset password for ${confirm.target.name}?`,
        description:
          'A new temporary password will be generated. The student should change it after logging in.',
        label: 'Reset password',
        destructive: false,
      };
    }
    return { title: '', description: '', label: 'Confirm', destructive: true };
  }, [confirm]);

  // ─── Columns ───────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        header: 'Student',
        accessorKey: 'name',
        sortable: true,
        cell: (row) => (
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={row.name} src={row.avatar} />
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white truncate">{row.name}</div>
              <div className="text-xs text-gray-500 truncate">{row.email}</div>
            </div>
          </div>
        ),
      },
      {
        header: 'Role',
        accessorKey: 'role',
        sortable: true,
        cell: (row) => (
          <AdminBadge tone={row.role === 'instructor' ? 'primary' : 'neutral'}>{row.role}</AdminBadge>
        ),
      },
      {
        header: 'Status',
        accessorKey: 'status',
        sortable: true,
        cell: (row) =>
          row.status === 'suspended' ? (
            <AdminBadge tone="danger" dot>
              Suspended
            </AdminBadge>
          ) : (
            <AdminBadge tone="success" dot>
              Active
            </AdminBadge>
          ),
      },
      {
        header: 'Courses',
        accessorKey: 'coursesEnrolled',
        cell: (row) => (
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {row.coursesEnrolled ?? 0}
          </span>
        ),
      },
      {
        header: 'Joined',
        accessorKey: 'createdAt',
        sortable: true,
        cell: (row) => (
          <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {formatDate(row.createdAt)}
          </span>
        ),
      },
      {
        header: 'Last Login',
        accessorKey: 'lastLogin',
        cell: (row) => (
          <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {formatRelative(row.lastLogin || row.updatedAt)}
          </span>
        ),
      },
      {
        header: 'Actions',
        id: 'actions',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        cell: (row) => (
          <div onClick={(e) => e.stopPropagation()} className="inline-block">
            <AdminDropdown
              align="right"
              items={[
                { label: 'View profile', icon: <FiEye size={14} />, onClick: () => openProfile(row) },
                { label: 'Edit student', icon: <FiEdit2 size={14} />, onClick: () => openEdit(row) },
                {
                  label: 'View courses',
                  icon: <FiBookOpen size={14} />,
                  onClick: () => openProfile(row),
                },
                {
                  label: row.status === 'suspended' ? 'Reactivate' : 'Suspend',
                  icon: row.status === 'suspended' ? <FiUserCheck size={14} /> : <FiUserX size={14} />,
                  onClick: () => setConfirm({ open: true, type: 'suspend', target: row }),
                },
                {
                  label: 'Reset password',
                  icon: <FiKey size={14} />,
                  onClick: () => setConfirm({ open: true, type: 'reset', target: row }),
                },
                {
                  label: 'Delete student',
                  icon: <FiTrash2 size={14} />,
                  danger: true,
                  onClick: () => setConfirm({ open: true, type: 'delete', target: row }),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [openProfile]
  );

  // ─── Header stats ──────────────────────────────────────────
  const activeCount = students.filter((s) => s.status !== 'suspended').length;
  const suspendedCount = students.filter((s) => s.status === 'suspended').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Students</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage enrollment, access, and progress for all platform learners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FiDownload className="mr-2" size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile icon={<FiUsers size={16} />} label="Total" value={total} tone="primary" />
        <StatTile icon={<FiCheckCircle size={16} />} label="Active (page)" value={activeCount} tone="success" />
        <StatTile icon={<FiUserX size={16} />} label="Suspended (page)" value={suspendedCount} tone="warning" />
        <StatTile icon={<FiUser size={16} />} label="Page" value={`${page} / ${totalPages}`} tone="neutral" />
      </div>

      {/* Table */}
      <AdminTable
        title="Student Directory"
        description="Search, filter, and manage every student account."
        columns={columns}
        data={students}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(key, order) => {
          setSortBy(key);
          setSortOrder(order);
        }}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        rowKey={(row) => row._id}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
            >
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
            >
              <option value="">All roles</option>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>
        }
      />

      {/* Profile Drawer */}
      <AdminDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={profile?.name || 'Student profile'}
        description={profile?.email}
        width="max-w-2xl"
      >
        {profileLoading || !profile ? (
          <div className="space-y-3">
            <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-shimmer" />
            <div className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-shimmer" />
            <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-shimmer" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Identity card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-5 flex items-center gap-4">
              <Avatar name={profile.name} src={profile.avatar} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {profile.name}
                </h3>
                <p className="text-sm text-gray-500 truncate">{profile.email}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <AdminBadge tone={profile.role === 'instructor' ? 'primary' : 'neutral'}>
                    {profile.role}
                  </AdminBadge>
                  <AdminBadge tone={profile.status === 'suspended' ? 'danger' : 'success'} dot>
                    {profile.status === 'suspended' ? 'Suspended' : 'Active'}
                  </AdminBadge>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile
                icon={<FiBookOpen size={16} />}
                label="Enrollments"
                value={profile.stats?.totalEnrollments ?? 0}
                tone="primary"
              />
              <StatTile
                icon={<FiCheckCircle size={16} />}
                label="Completed"
                value={profile.stats?.completedModules ?? 0}
                tone="success"
              />
              <StatTile
                icon={<FiFileText size={16} />}
                label="Quiz Attempts"
                value={profile.stats?.quizAttempts ?? 0}
                tone="warning"
              />
              <StatTile
                icon={<FiFileText size={16} />}
                label="Submissions"
                value={profile.stats?.assignmentSubmissions ?? 0}
                tone="neutral"
              />
            </div>

            {/* Account meta */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  <FiCalendar className="inline mr-1.5" size={12} /> Joined
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(profile.createdAt)}
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  <FiClock className="inline mr-1.5" size={12} /> Last login
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatRelative(profile.lastLogin || profile.updatedAt)}
                </span>
              </div>
            </div>

            {/* Enrollments list */}
            <section>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                Enrolled Courses ({profile.enrollments?.length || 0})
              </h4>
              {profile.enrollments && profile.enrollments.length > 0 ? (
                <ul className="space-y-2">
                  {profile.enrollments.map((e) => {
                    const course = e.course || e.liveCourse;
                    return (
                      <li
                        key={e._id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                          {course?.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FiBookOpen className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {course?.title || 'Untitled course'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {e.progress?.percentComplete ?? 0}% complete · {e.status}
                          </p>
                        </div>
                        <AdminBadge tone={e.status === 'completed' ? 'success' : 'primary'}>
                          {e.status}
                        </AdminBadge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No enrollments yet.</p>
              )}
            </section>

            {/* Quiz attempts */}
            <section>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                Quiz Attempts ({profile.quizAttempts?.length || 0})
              </h4>
              {profile.quizAttempts && profile.quizAttempts.length > 0 ? (
                <ul className="space-y-2">
                  {profile.quizAttempts.map((q, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {q.course}
                        </p>
                        <p className="text-xs text-gray-500">
                          Score: {q.score ?? '—'} · Attempts: {q.attempts ?? 0}
                        </p>
                      </div>
                      <AdminBadge tone={q.passed ? 'success' : 'warning'}>
                        {q.passed ? 'Passed' : 'In progress'}
                      </AdminBadge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No quiz attempts yet.</p>
              )}
            </section>

            {/* Assignment submissions */}
            <section>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                Assignment Submissions ({profile.submissions?.length || 0})
              </h4>
              {profile.submissions && profile.submissions.length > 0 ? (
                <ul className="space-y-2">
                  {profile.submissions.map((s) => (
                    <li
                      key={s._id}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {s.assignment?.title || 'Assignment'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(s.submittedAt)} ·{' '}
                          {s.grade != null ? `Graded: ${s.grade}` : 'Awaiting grade'}
                        </p>
                      </div>
                      <AdminBadge tone={s.status === 'graded' ? 'success' : 'primary'}>
                        {s.status}
                      </AdminBadge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No submissions yet.</p>
              )}
            </section>
          </div>
        )}
      </AdminDrawer>

      {/* Edit modal */}
      <AdminModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit student"
        description="Update the student's profile information."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-student-form"
              disabled={editSubmitting}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/20 transition disabled:opacity-50"
            >
              {editSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        <form id="edit-student-form" onSubmit={submitEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
              Full name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              required
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
              Role
            </label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>
        </form>
      </AdminModal>

      {/* Confirm modal */}
      <AdminConfirmDialog
        open={confirm.open}
        onClose={() => !confirmLoading && setConfirm({ open: false, type: null, target: null })}
        onConfirm={handleConfirm}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.label}
        destructive={confirmCopy.destructive}
        loading={confirmLoading}
      />

      {/* Temporary password modal */}
      <AdminModal
        open={tempPasswordModal.open}
        onClose={() => setTempPasswordModal({ open: false, password: '', name: '' })}
        title="Temporary password"
        description={`Share this password with ${tempPasswordModal.name} privately. They should change it after logging in.`}
        size="sm"
        footer={
          <button
            type="button"
            onClick={() => setTempPasswordModal({ open: false, password: '', name: '' })}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition"
          >
            Done
          </button>
        }
      >
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 flex items-center justify-between gap-3">
          <code className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate">
            {tempPasswordModal.password}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(tempPasswordModal.password);
              toast.success('Copied to clipboard');
            }}
            className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-white dark:hover:bg-gray-900 transition"
            aria-label="Copy"
          >
            <FiCopy size={16} />
          </button>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-start gap-1.5">
          <FiExternalLink className="mt-0.5 shrink-0" size={12} />
          For security, the password will not be shown again.
        </p>
      </AdminModal>
    </div>
  );
};

export default UserManager;

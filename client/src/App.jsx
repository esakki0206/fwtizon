import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import { GlobalSkeleton } from './components/common/Skeletons';

// Lazy loaded views
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const CourseCatalog = lazy(() => import('./pages/courses/CourseCatalog'));
const CourseDetail = lazy(() => import('./pages/courses/CourseDetail'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const CoursePlayer = lazy(() => import('./pages/learn/CoursePlayer'));
const QuizView = lazy(() => import('./pages/learn/QuizView'));
const CertificateView = lazy(() => import('./pages/certificate/CertificateView'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const CourseManager = lazy(() => import('./pages/admin/CourseManager'));
const LiveCourseManager = lazy(() => import('./pages/admin/LiveCourseManager'));
const UserManager = lazy(() => import('./pages/admin/UserManager'));
const QuizManager = lazy(() => import('./pages/admin/QuizManager'));
const CertificateManager = lazy(() => import('./pages/admin/CertificateManager'));
const PaymentManager = lazy(() => import('./pages/admin/PaymentManager'));
const EnrollmentManager = lazy(() => import('./pages/admin/EnrollmentManager'));
const Announcements = lazy(() => import('./pages/admin/Announcements'));
const AssignmentManager = lazy(() => import('./pages/admin/AssignmentManager'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const FeedbackManager = lazy(() => import('./pages/admin/FeedbackManager'));
const CouponManager = lazy(() => import('./pages/admin/CouponManager'));
const LiveCohorts = lazy(() => import('./pages/live/LiveCohorts'));
const LiveCourseDetail = lazy(() => import('./pages/live/LiveCourseDetail'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const Assignments = lazy(() => import('./pages/dashboard/Assignments'));
const MyCertificates = lazy(() => import('./pages/dashboard/MyCertificates'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <GlobalSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <GlobalSkeleton />;
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Toaster position="top-right" />
      <ErrorBoundary>
        <Suspense fallback={<GlobalSkeleton />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="courses" element={<CourseCatalog />} />
              <Route path="courses/:id" element={<CourseDetail />} />
              <Route path="live-courses" element={<LiveCohorts />} />
              <Route path="live-course/:courseId" element={<LiveCourseDetail />} />

              <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="dashboard/assignments" element={<ProtectedRoute><Assignments /></ProtectedRoute>} />
              <Route path="dashboard/certificates" element={<ProtectedRoute><MyCertificates /></ProtectedRoute>} />
              <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            </Route>

            <Route path="/learn/:id" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />
            <Route path="/learn/:courseId/quiz/:quizId" element={<ProtectedRoute><QuizView /></ProtectedRoute>} />
            <Route path="/certificate/:id" element={<CertificateView />} />

            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="courses" element={<CourseManager />} />
              <Route path="live-courses" element={<LiveCourseManager />} />
              <Route path="students" element={<UserManager />} />
              <Route path="quizzes" element={<QuizManager />} />
              <Route path="assignments" element={<AssignmentManager />} />
              <Route path="certificates" element={<CertificateManager />} />
              <Route path="payments" element={<PaymentManager />} />
              <Route path="enrollments" element={<EnrollmentManager />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="feedback" element={<FeedbackManager />} />
              <Route path="coupons" element={<CouponManager />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="settings" element={<div className="p-8 text-2xl font-bold">Platform Settings</div>} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={
              <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <h1 className="text-6xl font-black text-gray-200 dark:text-gray-700">404</h1>
                <p className="text-xl font-bold text-gray-400">Page Not Found</p>
              </div>
            } />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default App;

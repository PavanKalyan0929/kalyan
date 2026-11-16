import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { AuthProvider, useAuth, type UserRole } from './context/AuthContext.tsx';
import { CompareProvider } from './context/CompareContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { ShortlistProvider } from './context/ShortlistContext.tsx';
import { LoginPage, RegisterPage, SetupAdminPage } from './pages/AuthPages.tsx';
import {
  AboutPage,
  AssistantPage,
  CareerExamsPage,
  FeesInfoPage,
  GovernancePage,
  NptelPage,
} from './pages/CareerExamsNptelAboutPages.tsx';
import { CollegeDetailPage } from './pages/CollegeDetailPage.tsx';
import { CollegesPage } from './pages/CollegesPage.tsx';
import { CollegeAdminDashboardPage } from './pages/CollegeAdminDashboardPage.tsx';
import { DistrictsPage } from './pages/DistrictsPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { PostersPage } from './pages/PostersPage.tsx';
import { ScholarshipsPage } from './pages/ScholarshipsPage.tsx';
import { ServicesPage } from './pages/ServicesPage.tsx';
import { StateAdminDashboardPage } from './pages/StateAdminDashboardPage.tsx';
import { StudentDashboardPage } from './pages/StudentDashboardPage.tsx';
import { UpscCivilServicesPage } from './pages/UpscCivilServicesPage.tsx';

function ProtectedRoute({
  allowedRole,
  children,
}: {
  allowedRole: UserRole;
  children: React.ReactNode;
}) {
  const { loading, user, needsStudentOnboarding } = useAuth();
  if (loading) {
    return <div className="max-w-[1360px] mx-auto px-4 py-12 text-sm text-slate-500">Verifying session...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRole === 'student' && user.role === 'student' && needsStudentOnboarding) {
    return <Navigate to="/register" replace />;
  }
  if (user.role !== allowedRole) {
    const fallback =
      user.role === 'state_admin'
        ? '/state-admin'
        : user.role === 'college_admin'
          ? '/college-admin'
          : '/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ShortlistProvider>
          <CompareProvider>
            <BrowserRouter>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/colleges" element={<CollegesPage />} />
                  <Route path="/colleges/:id" element={<CollegeDetailPage />} />
                  <Route path="/districts" element={<DistrictsPage />} />
                  <Route path="/posters" element={<PostersPage />} />
                  <Route path="/upsc" element={<UpscCivilServicesPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/grievances" element={<ServicesPage />} />
                  <Route path="/fees" element={<FeesInfoPage />} />
                  <Route path="/scholarships" element={<ScholarshipsPage />} />
                  <Route path="/career-exams" element={<CareerExamsPage />} />
                  <Route path="/nptel" element={<NptelPage />} />
                  <Route path="/assistant" element={<AssistantPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/privacy" element={<GovernancePage section="privacy" />} />
                  <Route path="/terms" element={<GovernancePage section="terms" />} />
                  <Route path="/contact" element={<GovernancePage section="contact" />} />
                  <Route path="/help" element={<GovernancePage section="help" />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/setup" element={<SetupAdminPage />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute allowedRole="student">
                        <StudentDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/college-admin"
                    element={
                      <ProtectedRoute allowedRole="college_admin">
                        <CollegeAdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/state-admin"
                    element={
                      <ProtectedRoute allowedRole="state_admin">
                        <StateAdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </CompareProvider>
        </ShortlistProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

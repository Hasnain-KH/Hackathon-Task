import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import api from './api/axios.js';
import AppShell from './components/layout/AppShell.jsx';
import ProtectedRoute, { roleHome } from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import AdminHome from './pages/dashboard/AdminHome.jsx';
import EmployeeHome from './pages/dashboard/EmployeeHome.jsx';
import HRHome from './pages/dashboard/HRHome.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import CompanySettings from './pages/admin/CompanySettings.jsx';
import Departments from './pages/admin/Departments.jsx';
import Designations from './pages/admin/Designations.jsx';
import Holidays from './pages/admin/Holidays.jsx';
import HRUsers from './pages/admin/HRUsers.jsx';
import LeaveTypes from './pages/admin/LeaveTypes.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import Login from './pages/Login.jsx';
import Setup, { PageMessage } from './pages/Setup.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import EmployeeList from './pages/employees/EmployeeList.jsx';
import EmployeeProfile from './pages/employees/EmployeeProfile.jsx';
import CSVImport from './pages/employees/CSVImport.jsx';
import SelfProfile from './pages/employees/SelfProfile.jsx';

function RootRedirect() {
  const { user, loading: authLoading } = useAuth();
  const [initialized, setInitialized] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/setup/status')
      .then(({ data }) => setInitialized(data.initialized))
      .catch((requestError) => setError(requestError.response?.data?.error || 'Unable to connect to HCM Lite.'));
  }, []);

  if (error) return <PageMessage>{error}</PageMessage>;
  if (initialized === null || authLoading) return <PageMessage>Loading HCM Lite…</PageMessage>;
  if (!initialized) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.mustChangePassword ? '/change-password' : roleHome(user.role)} replace />;
}

function PasswordGate() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageMessage>Loading your account…</PageMessage>;
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<PasswordGate />}>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>
        <Route element={<ProtectedRoute allow={['admin']} />}>
          <Route element={<AppShell />}>
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/company" element={<CompanySettings />} />
            <Route path="/admin/departments" element={<Departments />} />
            <Route path="/admin/designations" element={<Designations />} />
            <Route path="/admin/leave-types" element={<LeaveTypes />} />
            <Route path="/admin/holidays" element={<Holidays />} />
            <Route path="/admin/hr-users" element={<HRUsers />} />
            <Route path="/admin/settings" element={<PlaceholderPage title="Settings — coming later" />} />
            <Route path="/admin/employees" element={<EmployeeList />} />
            <Route path="/admin/employees/:id" element={<EmployeeProfile />} />
            <Route path="/admin/employees/import" element={<CSVImport />} />
            <Route path="/admin/payroll" element={<PlaceholderPage title="Payroll — coming later" />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allow={['hr']} />}>
          <Route element={<AppShell />}>
            <Route path="/hr" element={<HRHome />} />
            {[
              ['employees', <EmployeeList />],
              ['attendance', 'Attendance — coming later'],
              ['leave', 'Leave — coming later'],
              ['payroll', 'Payroll — coming later'],
            ].map(([path, element]) => <Route key={path} path={`/hr/${path}`} element={typeof element === 'string' ? <PlaceholderPage title={element} /> : element} />)}
            <Route path="/hr/employees/:id" element={<EmployeeProfile />} />
            <Route path="/hr/employees/import" element={<CSVImport />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allow={['employee']} />}>
          <Route element={<AppShell />}>
            <Route path="/employee" element={<EmployeeHome />} />
            <Route path="/employee/profile" element={<SelfProfile />} />
            {[
              ['attendance', 'My attendance — coming later'],
              ['leave', 'My leave — coming later'],
              ['payslips', 'My payslips — coming later'],
            ].map(([path, title]) => <Route key={path} path={`/employee/${path}`} element={<PlaceholderPage title={title} />} />)}
          </Route>
        </Route>
        <Route path="/dashboard" element={<DashboardRedirect />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}

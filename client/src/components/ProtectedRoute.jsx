import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'hr') return '/hr';
  if (role === 'employee') return '/employee';
  return '/login';
}

export default function ProtectedRoute({ allow }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading your account…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allow && !allow.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return <Outlet />;
}

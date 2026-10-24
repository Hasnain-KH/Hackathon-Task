import PlaceholderPage from '../PlaceholderPage.jsx';
import { Link } from 'react-router-dom';

export default function AdminHome() {
  return (
    <div className="space-y-5">
      <PlaceholderPage title="Admin dashboard" />
      <Link to="/admin/payroll" className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-card">
        <h2 className="font-semibold text-ink">Payroll</h2>
        <p className="mt-1 text-sm text-slate-500">Review monthly drafts and finalize payroll.</p>
      </Link>
    </div>
  );
}

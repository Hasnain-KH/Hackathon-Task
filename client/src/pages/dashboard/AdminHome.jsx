import PlaceholderPage from '../PlaceholderPage.jsx';
import { Link } from 'react-router-dom';
import AiSummaryButton from '../../components/ai/AiSummaryButton.jsx';
import LatestAnnouncements from '../../components/comms/LatestAnnouncements.jsx';
import RecentActivity from '../../components/comms/RecentActivity.jsx';

export default function AdminHome() {
  return (
    <div className="space-y-5">
      <PlaceholderPage title="Admin dashboard" />
      <LatestAnnouncements />
      <RecentActivity />
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div><h2 className="font-semibold text-ink">Dashboard insights</h2><p className="mt-1 text-sm text-slate-500">Summarize current headcount, attendance, leave, attrition, and finalized payroll.</p></div>
        <AiSummaryButton feature="admin" />
      </section>
      <Link to="/admin/payroll" className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-card">
        <h2 className="font-semibold text-ink">Payroll</h2>
        <p className="mt-1 text-sm text-slate-500">Review monthly drafts and finalize payroll.</p>
      </Link>
    </div>
  );
}

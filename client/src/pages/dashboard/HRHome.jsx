import PlaceholderPage from '../PlaceholderPage.jsx';
import { Link } from 'react-router-dom';
import AiSummaryButton from '../../components/ai/AiSummaryButton.jsx';

export default function HRHome() {
  return (
    <div className="space-y-5">
      <PlaceholderPage title="HR dashboard" />
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div><h2 className="font-semibold text-ink">Dashboard insights</h2><p className="mt-1 text-sm text-slate-500">Summarize headcount, attendance, late arrivals, and leave.</p></div>
        <AiSummaryButton feature="hr" />
      </section>
      <Link to="/hr/payroll" className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-card">
        <h2 className="font-semibold text-ink">Payroll</h2>
        <p className="mt-1 text-sm text-slate-500">Generate and review monthly payroll drafts.</p>
      </Link>
    </div>
  );
}

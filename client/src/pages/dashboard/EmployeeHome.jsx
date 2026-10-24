import PlaceholderPage from '../PlaceholderPage.jsx';
import CheckInWidget from '../../components/attendance/CheckInWidget.jsx';
import LeaveBalanceCards from '../../components/leave/LeaveBalanceCards.jsx';
import { Link } from 'react-router-dom';
import { useAiChat } from '../../context/AiChatContext.jsx';
import Button from '../../components/ui/Button.jsx';

export default function EmployeeHome() {
  const { openChat } = useAiChat();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">Employee dashboard</h1>
      <CheckInWidget />
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Leave balance</h2>
          <Link to="/employee/leave" className="text-sm font-semibold text-brand hover:underline">Manage leave</Link>
        </div>
        <LeaveBalanceCards limit={3} />
      </section>
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-white p-5">
          <div><h2 className="font-semibold text-ink">Ask my assistant</h2><p className="mt-1 text-sm text-slate-500">Ask about your leave balance, attendance, or payslips.</p></div>
          <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => openChat()}>Ask assistant</Button><Link to="/employee/leave" className="inline-flex items-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white">Fill leave with AI</Link></div>
        </section>
      <PlaceholderPage title="More employee features — coming later" />
    </div>
  );
}

import PlaceholderPage from '../PlaceholderPage.jsx';
import CheckInWidget from '../../components/attendance/CheckInWidget.jsx';
import LeaveBalanceCards from '../../components/leave/LeaveBalanceCards.jsx';
import { Link } from 'react-router-dom';

export default function EmployeeHome() {
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
      <PlaceholderPage title="More employee features — coming later" />
    </div>
  );
}

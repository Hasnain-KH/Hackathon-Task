import PlaceholderPage from '../PlaceholderPage.jsx';
import CheckInWidget from '../../components/attendance/CheckInWidget.jsx';

export default function EmployeeHome() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">Employee dashboard</h1>
      <CheckInWidget />
      <PlaceholderPage title="More employee features — coming later" />
    </div>
  );
}

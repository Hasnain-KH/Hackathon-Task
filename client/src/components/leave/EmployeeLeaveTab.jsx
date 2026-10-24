import { useEffect, useState } from 'react';
import api from '../../api/axios.js';
import LeaveBalanceCards from './LeaveBalanceCards.jsx';
import LeaveStatusBadge from './LeaveStatusBadge.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Loader from '../ui/Loader.jsx';
import Table from '../ui/Table.jsx';
import { apiErrorMessage } from '../ui/useApiError.js';

export default function EmployeeLeaveTab({ employeeId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/leave/requests/employee/${employeeId}`).then(({ data }) => {
      if (active) setItems(data.items);
    }).catch((requestError) => {
      if (active) setError(apiErrorMessage(requestError, 'Could not load leave history.'));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [employeeId]);

  const columns = [
    { key: 'leaveTypeId', label: 'Type', render: (item) => item.leaveTypeId?.name || '—' },
    { key: 'dates', label: 'Dates', render: (item) => `${item.startDate} – ${item.endDate}` },
    { key: 'days', label: 'Days' },
    { key: 'status', label: 'Status', render: (item) => <LeaveStatusBadge status={item.status} /> },
  ];

  return (
    <div className="space-y-5 pt-5">
      <div><h3 className="mb-3 font-semibold text-ink">Yearly balance</h3><LeaveBalanceCards endpoint={`/leave/balances/${employeeId}`} /></div>
      <div><h3 className="mb-3 font-semibold text-ink">Leave history</h3><ErrorBanner>{error}</ErrorBanner>
        {loading ? <Loader label="Loading employee leave history" /> : items.length ? <Table rows={items} columns={columns} /> : <EmptyState title="No leave history" description="No leave requests have been submitted." />}
      </div>
    </div>
  );
}

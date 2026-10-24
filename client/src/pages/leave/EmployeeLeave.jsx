import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import ApplyLeaveModal from '../../components/leave/ApplyLeaveModal.jsx';
import LeaveBalanceCards from '../../components/leave/LeaveBalanceCards.jsx';
import LeaveStatusBadge from '../../components/leave/LeaveStatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Table from '../../components/ui/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';

export default function EmployeeLeave() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [cancelRequest, setCancelRequest] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/leave/requests/me', { params: { limit: 50 } });
      setItems(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load your leave requests.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`/leave/requests/${cancelRequest._id}/cancel`);
      setCancelRequest(null);
      toast('Leave request cancelled.');
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not cancel leave request.'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'leaveTypeId', label: 'Leave type', render: (item) => item.leaveTypeId?.name || '—' },
    { key: 'dates', label: 'Dates', render: (item) => `${item.startDate} – ${item.endDate}` },
    { key: 'days', label: 'Working days' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (item) => <LeaveStatusBadge status={item.status} /> },
    { key: 'reviewComment', label: 'Review note', render: (item) => item.reviewComment || '—' },
    { key: 'actions', label: 'Actions', render: (item) => ['pending', 'approved'].includes(item.status)
      ? <Button type="button" variant="secondary" className="px-3 py-1.5" onClick={() => setCancelRequest(item)}>Cancel</Button> : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-ink">My leave</h1><p className="mt-1 text-sm text-slate-500">Check your balances and manage leave requests.</p></div>
        <Button type="button" onClick={() => setApplying(true)}>Apply for leave</Button>
      </div>
      <section className="space-y-3"><h2 className="text-lg font-semibold text-ink">Current year balances</h2><LeaveBalanceCards /></section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Request history</h2>
        <ErrorBanner>{error}</ErrorBanner>
        {loading ? <Loader label="Loading leave requests" /> : items.length ? <Table rows={items} columns={columns} /> : <EmptyState title="No leave requests yet" description="Apply for leave to see your request history here." />}
      </section>
      {applying && <ApplyLeaveModal onClose={() => setApplying(false)} onApplied={() => { toast('Leave request submitted.'); load(); }} />}
      {cancelRequest && <Modal title="Cancel leave request?" onClose={() => setCancelRequest(null)} onConfirm={cancel} confirmLabel="Cancel request" loading={saving} danger>
        <p className="text-sm text-slate-600">Cancel {cancelRequest.leaveTypeId?.name || 'leave'} from {cancelRequest.startDate} to {cancelRequest.endDate}?</p>
        <ErrorBanner>{error}</ErrorBanner>
      </Modal>}
    </div>
  );
}

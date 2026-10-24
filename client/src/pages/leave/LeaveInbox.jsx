import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import LeaveStatusBadge from '../../components/leave/LeaveStatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Select from '../../components/ui/Select.jsx';
import Table from '../../components/ui/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';

const statuses = ['pending', 'approved', 'rejected', 'cancelled'];

export default function LeaveInbox() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/leave/inbox', { params: { status, limit: 100 } });
      setItems(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load leave requests.'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const submitReview = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/leave/requests/${review.item._id}/review`, { decision: review.decision, comment });
      toast(`Leave request ${review.decision === 'approve' ? 'approved' : 'rejected'}.`);
      setReview(null);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not review leave request.'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'employeeId', label: 'Employee', render: (item) => `${item.employeeId?.firstName || ''} ${item.employeeId?.lastName || ''} · ${item.employeeId?.employeeCode || ''}` },
    { key: 'department', label: 'Department', render: (item) => item.employeeId?.departmentId?.name || '—' },
    { key: 'leaveTypeId', label: 'Leave type', render: (item) => item.leaveTypeId?.name || '—' },
    { key: 'dates', label: 'Dates', render: (item) => `${item.startDate} – ${item.endDate} (${item.days} days)` },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (item) => <LeaveStatusBadge status={item.status} /> },
    { key: 'actions', label: 'Actions', render: (item) => item.status === 'pending' ? <div className="flex gap-2">
      <Button type="button" className="px-3 py-1.5" onClick={() => { setComment(''); setReview({ item, decision: 'approve' }); }}>Approve</Button>
      <Button type="button" variant="danger" className="px-3 py-1.5" onClick={() => { setComment(''); setReview({ item, decision: 'reject' }); }}>Reject</Button>
    </div> : item.reviewComment || '—' },
  ];

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-ink">Leave requests</h1><p className="mt-1 text-sm text-slate-500">Review employee leave applications.</p></div>
      <div className="max-w-xs">
        <Select label="Request status" value={status} onChange={(event) => setStatus(event.target.value)}>
          {statuses.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
        </Select>
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label={`Loading ${status} leave requests`} /> : items.length ? <Table rows={items} columns={columns} /> : <EmptyState title={`No ${status} leave requests`} description="Leave requests will appear here when employees apply." />}
      {review && <Modal title={`${review.decision === 'approve' ? 'Approve' : 'Reject'} leave request`} onClose={() => setReview(null)} onConfirm={submitReview} confirmLabel={review.decision === 'approve' ? 'Approve request' : 'Reject request'} loading={saving} danger={review.decision === 'reject'}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{review.item.employeeId?.firstName} {review.item.employeeId?.lastName} · {review.item.leaveTypeId?.name} · {review.item.startDate} – {review.item.endDate}</p>
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{review.item.reason}</p>
          <label className="block text-sm font-medium text-slate-700">Comment {review.decision === 'reject' ? '(required)' : '(optional)'}
            <textarea rows="3" maxLength="500" value={comment} onChange={(event) => setComment(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100" />
          </label>
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      </Modal>}
    </div>
  );
}

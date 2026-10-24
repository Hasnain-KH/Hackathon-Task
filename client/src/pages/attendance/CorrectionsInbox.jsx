import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Table from '../../components/ui/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';

const tabs = ['pending', 'approved', 'rejected'];

export default function CorrectionsInbox() {
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
      const { data } = await api.get('/attendance/corrections', { params: { status, limit: 100 } });
      setItems(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load correction requests.'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const openReview = (item, decision) => {
    setComment('');
    setReview({ item, decision });
  };

  const submitReview = async () => {
    if (review.decision === 'reject' && !comment.trim()) {
      setError('A comment is required when rejecting a correction request.');
      toast('A rejection comment is required.', 'error');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.patch(`/attendance/corrections/${review.item._id}`, { decision: review.decision, comment });
      toast(`Correction ${review.decision === 'approve' ? 'approved' : 'rejected'}.`);
      setReview(null);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not review correction request.'));
      toast(apiErrorMessage(requestError, 'Could not review correction request.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'employee', label: 'Employee', render: (item) => `${item.employeeId?.firstName || ''} ${item.employeeId?.lastName || ''} · ${item.employeeId?.employeeCode || ''}` },
    { key: 'date', label: 'Date' },
    { key: 'requestType', label: 'Request', render: (item) => item.requestType.replaceAll('_', ' ') },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (item) => <Badge tone={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'amber'}>{item.status}</Badge> },
    { key: 'actions', label: 'Actions', render: (item) => item.status === 'pending' ? <div className="flex gap-2"><Button className="px-3 py-1.5" type="button" onClick={() => openReview(item, 'approve')}>Approve</Button><Button variant="danger" className="px-3 py-1.5" type="button" onClick={() => openReview(item, 'reject')}>Reject</Button></div> : <span className="text-xs text-slate-500">{item.reviewComment || 'Reviewed'}</span> },
  ];

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-ink">Correction requests</h1><p className="mt-1 text-sm text-slate-500">Review employee attendance correction requests.</p></div>
      <nav className="flex gap-2 border-b border-slate-200" aria-label="Correction status">
        {tabs.map((tab) => <button key={tab} type="button" onClick={() => setStatus(tab)} className={`border-b-2 px-3 py-2 text-sm font-semibold capitalize ${status === tab ? 'border-brand text-brand' : 'border-transparent text-slate-500'}`}>{tab}</button>)}
      </nav>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label={`Loading ${status} requests`} /> : items.length ? <Table rows={items} columns={columns} /> : <EmptyState title={`No ${status} requests`} description="Requests will appear here when employees submit them." />}
      {review && <Modal title={`${review.decision === 'approve' ? 'Approve' : 'Reject'} correction request`} onClose={() => setReview(null)} onConfirm={submitReview} confirmLabel={review.decision === 'approve' ? 'Approve request' : 'Reject request'} loading={saving} danger={review.decision === 'reject'}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{review.item.employeeId?.firstName} {review.item.employeeId?.lastName} · {review.item.date} · {review.item.requestType.replaceAll('_', ' ')}</p>
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{review.item.reason}</p>
          <label className="block text-sm font-medium text-slate-700">Comment {review.decision === 'reject' ? '(required)' : '(optional)'}
            <textarea className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100" rows="3" maxLength="500" required={review.decision === 'reject'} value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      </Modal>}
    </div>
  );
}

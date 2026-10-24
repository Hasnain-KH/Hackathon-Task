import { useEffect, useState } from 'react';
import api from '../../api/axios.js';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Table from '../../components/ui/Table.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';

const readable = (value) => value?.replaceAll('_', ' ') || '—';

export default function MyCorrections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/attendance/me/corrections', { params: { limit: 100 } })
      .then(({ data }) => setItems(data.items))
      .catch((requestError) => setError(apiErrorMessage(requestError, 'Could not load correction requests.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-ink">My correction requests</h1><p className="mt-1 text-sm text-slate-500">Review the status and comments for requests you submitted.</p></div>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label="Loading correction requests" /> : items.length ? <Table rows={items} columns={[
        { key: 'date', label: 'Date' },
        { key: 'requestType', label: 'Request', render: (item) => readable(item.requestType) },
        { key: 'reason', label: 'Reason' },
        { key: 'status', label: 'Status', render: (item) => <Badge tone={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'amber'}>{item.status}</Badge> },
        { key: 'reviewComment', label: 'Review comment', render: (item) => item.reviewComment || '—' },
      ]} /> : <EmptyState title="No correction requests" description="Requests you submit will appear here." />}
    </div>
  );
}

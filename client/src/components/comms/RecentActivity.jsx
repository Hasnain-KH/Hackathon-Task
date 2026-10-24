import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import AuditTable from './AuditTable.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Loader from '../ui/Loader.jsx';
import { apiErrorMessage } from '../ui/useApiError.js';

export default function RecentActivity() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/audit?limit=5');
      setItems(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load recent activity.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="font-semibold text-ink">Recent activity</h2>
    {error && <ErrorBanner>{error} <button type="button" className="ml-2 font-semibold underline" onClick={load}>Retry</button></ErrorBanner>}
    {loading ? <Loader label="Loading recent activity" /> : items.length ? <AuditTable items={items} /> : <EmptyState title="No recent activity" description="Changes will appear here as they happen." />}
  </section>;
}

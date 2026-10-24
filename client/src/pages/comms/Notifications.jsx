import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';
import { formatDateTime } from '../../utils/format.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function Notifications() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications', { params: { page, limit: 20, unreadOnly } });
      setItems(data.items);
      setPages(data.pages);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load notifications.'));
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);
  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not update notification.'));
    }
  };

  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      toast('All notifications marked as read.');
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not update notifications.'));
    }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-ink">Notifications</h1>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unreadOnly} onChange={(event) => { setPage(1); setUnreadOnly(event.target.checked); }} /> Unread only</label>
        <Button type="button" variant="secondary" onClick={markAll}>Mark all read</Button>
      </div>
    </div>
    {error && <ErrorBanner>{error} <button type="button" className="ml-2 font-semibold underline" onClick={load}>Retry</button></ErrorBanner>}
    {loading ? <Loader label="Loading notifications" /> : items.length ? <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {items.map((item) => <article key={item._id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${item.read ? '' : 'bg-indigo-50/50'}`}>
        <div><h2 className="font-semibold text-ink">{item.title}</h2>{item.body && <p className="mt-1 text-sm text-slate-600">{item.body}</p>}<time className="mt-2 block text-xs text-slate-400">{formatDateTime(item.createdAt)}</time></div>
        <div className="flex items-center gap-3">{item.link && <Link className="text-sm font-semibold text-brand hover:underline" to={item.link}>Open</Link>}{!item.read && <Button type="button" variant="secondary" onClick={() => markRead(item._id)}>Mark read</Button>}</div>
      </article>)}
    </div> : <EmptyState title="No notifications" description={unreadOnly ? 'There are no unread notifications.' : 'Notifications will appear here.'} />}
    {pages > 1 && <div className="flex items-center justify-between"><Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm text-slate-500">Page {page} of {pages}</span><Button type="button" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div>}
  </div>;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios.js';
import { apiErrorMessage } from '../ui/useApiError.js';
import { formatDateTime } from '../../utils/format.js';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef(null);
  const navigate = useNavigate();

  const refreshCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setCount(data.count);
      setError('');
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load notifications.'));
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?page=1&limit=10');
      setItems(data.items);
      setError('');
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load notifications.'));
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, 30000);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    loadNotifications();
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [open, loadNotifications]);

  const openNotification = async (notification) => {
    try {
      if (!notification.read) await api.patch(`/notifications/${notification._id}/read`);
      setItems((current) => current.map((item) => item._id === notification._id ? { ...item, read: true } : item));
      await refreshCount();
      setOpen(false);
      if (notification.link) navigate(notification.link);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not open this notification.'));
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button type="button" aria-label={`Notifications${count ? `, ${count} unread` : ''}`} aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {count > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-5 text-white">{count > 99 ? '99+' : count}</span>}
      </button>
      {open && <section className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white shadow-xl" aria-label="Notifications">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-ink">Notifications</h2>
          <Link className="text-xs font-semibold text-brand hover:underline" to="/notifications" onClick={() => setOpen(false)}>View all</Link>
        </div>
        {error && <p role="alert" className="px-4 py-2 text-xs text-red-700">{error}</p>}
        <div className="max-h-96 overflow-y-auto">
          {items.length ? items.map((item) => <button key={item._id} type="button" onClick={() => openNotification(item)}
            className={`block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${item.read ? '' : 'bg-indigo-50/60'}`}>
            <span className="block text-sm font-medium text-ink">{item.title}</span>
            {item.body && <span className="mt-1 block text-xs text-slate-600">{item.body}</span>}
            <time className="mt-2 block text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</time>
          </button>) : <p className="p-5 text-sm text-slate-500">You’re all caught up.</p>}
        </div>
      </section>}
    </div>
  );
}

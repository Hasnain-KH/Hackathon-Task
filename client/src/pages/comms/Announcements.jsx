import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import AnnouncementCard from '../../components/comms/AnnouncementCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage, apiFieldErrors } from '../../components/ui/useApiError.js';

const initialForm = { title: '', body: '', audience: 'all', pinned: false };

export default function Announcements() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/announcements?page=1&limit=100');
      setItems(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load announcements.'));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setSaving(true);
    setFieldErrors({});
    try {
      await api.post('/announcements', form);
      toast('Announcement posted.');
      setOpen(false);
      setForm(initialForm);
      await load();
    } catch (requestError) {
      setFieldErrors(apiFieldErrors(requestError));
      setError(apiErrorMessage(requestError, 'Could not post announcement.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.delete(`/announcements/${deleteId}`);
      toast('Announcement deleted.');
      setDeleteId('');
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not delete announcement.'));
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-ink">Announcements</h1><p className="mt-1 text-sm text-slate-500">Company updates for your role.</p></div>
      {user?.role === 'admin' && <Button type="button" onClick={() => { setError(''); setOpen(true); }}>New announcement</Button>}
    </div>
    {error && <ErrorBanner>{error} <button type="button" className="ml-2 font-semibold underline" onClick={load}>Retry</button></ErrorBanner>}
    {loading ? <Loader label="Loading announcements" /> : items.length ? <div className="space-y-3">
      {items.map((item) => <div key={item._id} className="relative">
        <AnnouncementCard items={[item]} title="" />
        {user?.role === 'admin' && <button type="button" aria-label={`Delete announcement ${item.title}`} className="absolute right-3 top-3 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => setDeleteId(item._id)}>Delete</button>}
      </div>)}
    </div> : <EmptyState title="No announcements yet" description="Company announcements will appear here." />}
    {open && <Modal title="New announcement" onClose={() => setOpen(false)} onConfirm={create} confirmLabel="Post announcement" loading={saving}>
      <div className="space-y-4">
        <ErrorBanner>{error}</ErrorBanner>
        <Input label="Title" value={form.title} error={fieldErrors.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <label className="block text-sm font-medium text-slate-700">Message
          <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" aria-label="Announcement message" />
          {fieldErrors.body && <span className="mt-1 block text-xs text-red-600">{fieldErrors.body}</span>}
        </label>
        <Select label="Audience" value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} options={[
          { value: 'all', label: 'Everyone' }, { value: 'hr', label: 'HR' }, { value: 'admin', label: 'Admins' }, { value: 'employee', label: 'Employees' },
        ]} />
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.pinned} onChange={(event) => setForm({ ...form, pinned: event.target.checked })} /> Pin this announcement</label>
      </div>
    </Modal>}
    {deleteId && <Modal title="Delete announcement?" onClose={() => setDeleteId('')} onConfirm={remove} confirmLabel="Delete" loading={saving} danger>
      <div className="space-y-3"><ErrorBanner>{error}</ErrorBanner><p className="text-sm text-slate-600">This announcement will be permanently removed. Existing notifications will remain.</p></div>
    </Modal>}
  </div>;
}

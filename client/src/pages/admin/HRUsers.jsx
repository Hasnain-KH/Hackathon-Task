import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Input from '../../components/ui/Input.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Table from '../../components/ui/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage, apiFieldErrors } from '../../components/ui/useApiError.js';

const password = () => {
  const bytes = new Uint32Array(18);
  const characters = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#';
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => characters[value % characters.length]).join('');
};

export default function HRUsers() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [modal, setModal] = useState('');
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', tempPassword: '' });
  const [pending, setPending] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users', { params: { role: 'hr', limit: 100, ...(query ? { q: query } : {}) } });
      setItems(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load HR users.'));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setForm({ name: '', email: '', tempPassword: '' });
    setFieldErrors({});
    setModal('create');
  };
  const openReset = (user) => {
    setTarget(user);
    setForm({ tempPassword: '' });
    setFieldErrors({});
    setModal('reset');
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      if (modal === 'create') {
        await api.post('/users/hr', form);
        toast('HR login created.');
      } else {
        await api.patch(`/users/${target._id}/reset-password`, { tempPassword: form.tempPassword });
        toast('Temporary password reset.');
      }
      setModal('');
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not save HR user.'));
      setFieldErrors(apiFieldErrors(requestError));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    setSaving(true);
    try {
      await api.patch(`/users/${pending._id}/toggle-active`);
      toast(`${pending.name} ${pending.isActive ? 'deactivated' : 'activated'}.`);
      setPending(null);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not update account status.'));
      setPending(null);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'passwordStatus', label: 'Password', render: (user) => user.mustChangePassword ? <Badge tone="amber">Must change</Badge> : <Badge tone="green">Set</Badge> },
    { key: 'status', label: 'Status', render: (user) => <Badge tone={user.isActive ? 'green' : 'slate'}>{user.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', label: 'Actions', render: (user) => <div className="flex flex-wrap gap-2">
      <Button variant="secondary" className="px-3 py-1.5" type="button" onClick={() => openReset(user)}>Reset password</Button>
      <Button variant={user.isActive ? 'danger' : 'secondary'} className="px-3 py-1.5" type="button" onClick={() => user.isActive ? setPending(user) : toggleFor(user)}>{user.isActive ? 'Deactivate' : 'Activate'}</Button>
    </div> },
  ];

  const toggleFor = async (user) => {
    try {
      await api.patch(`/users/${user._id}/toggle-active`);
      toast(`${user.name} activated.`);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not update account status.'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-bold text-ink">HR users</h1><p className="mt-1 text-sm text-slate-500">Create and manage HR account access.</p></div>
        <Button type="button" onClick={openCreate}>Add HR user</Button>
      </div>
      <div className="max-w-md"><Input label="Search HR users" placeholder="Name or email…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label="Loading HR users" /> : items.length ? <Table rows={items} columns={columns} /> : <EmptyState title="No HR users yet" description="Add an HR login to grant HR access." />}

      {modal && <Modal title={modal === 'create' ? 'Create HR login' : `Reset password for ${target?.name}`} onClose={() => setModal('')} onConfirm={() => document.getElementById('hr-user-form')?.requestSubmit()} confirmLabel={modal === 'create' ? 'Create HR user' : 'Reset password'} loading={saving}>
        <form id="hr-user-form" onSubmit={submit} className="space-y-4">
          {modal === 'create' && <>
            <Input label="Name" value={form.name} error={fieldErrors.name} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Input label="Email" type="email" value={form.email} error={fieldErrors.email} required onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </>}
          <div className="flex items-end gap-2">
            <Input label="Temporary password" type="text" minLength={8} value={form.tempPassword} error={fieldErrors.tempPassword} required onChange={(event) => setForm({ ...form, tempPassword: event.target.value })} />
            <Button type="button" variant="secondary" className="shrink-0" onClick={() => setForm({ ...form, tempPassword: password() })}>Generate</Button>
          </div>
          <p className="text-xs text-slate-500">The HR user will be required to change this password at sign-in.</p>
          <ErrorBanner>{error}</ErrorBanner>
        </form>
      </Modal>}
      {pending && <Modal title={`Deactivate ${pending.name}?`} onClose={() => setPending(null)} onConfirm={toggleActive} confirmLabel="Deactivate" loading={saving} danger><p className="text-sm text-slate-600">This user will no longer be able to sign in. Their account can be reactivated later.</p></Modal>}
    </div>
  );
}

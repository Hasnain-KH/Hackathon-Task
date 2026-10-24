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

const emptyForm = { name: '', date: '', isOptional: false };

export default function Holidays() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, setPending] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/holidays', { params: year ? { year, limit: 100 } : { limit: 100 } });
      setItems(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load holidays.'));
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const open = (item = null) => {
    setEditing(item);
    setFieldErrors({});
    setError('');
    setForm(item ? { name: item.name, date: item.date.slice(0, 10), isOptional: item.isOptional } : emptyForm);
    setModal(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      if (editing) await api.patch(`/holidays/${editing._id}`, form);
      else await api.post('/holidays', form);
      toast(`Holiday ${editing ? 'updated' : 'added'}.`);
      setModal(false);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not save holiday.'));
      setFieldErrors(apiFieldErrors(requestError));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.delete(`/holidays/${pending._id}`);
      toast('Holiday deleted.');
      setPending(null);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not delete holiday.'));
      setPending(null);
    } finally {
      setSaving(false);
    }
  };

  const groups = items.reduce((result, item) => {
    const groupYear = new Date(item.date).getUTCFullYear();
    result[groupYear] = [...(result[groupYear] || []), item];
    return result;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-bold text-ink">Public holidays</h1><p className="mt-1 text-sm text-slate-500">Maintain the company holiday calendar.</p></div>
        <Button type="button" onClick={() => open()}>Add holiday</Button>
      </div>
      <div className="max-w-xs"><Input label="Filter by year" type="number" min="1900" max="9999" placeholder="All years" value={year} onChange={(event) => setYear(event.target.value)} /></div>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label="Loading holidays" /> : !items.length ? <EmptyState title="No holidays found" description="Add a holiday or choose another year." /> : (
        <div className="space-y-7">
          {Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b)).map(([groupYear, holidays]) => (
            <section key={groupYear} className="space-y-3">
              <h2 className="text-lg font-semibold text-ink">{groupYear}</h2>
              <Table rows={holidays} columns={[
                { key: 'date', label: 'Date', render: (item) => new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }) },
                { key: 'name', label: 'Holiday' },
                { key: 'optional', label: 'Type', render: (item) => item.isOptional ? <Badge tone="amber">Optional</Badge> : <Badge tone="blue">Public</Badge> },
                { key: 'actions', label: 'Actions', render: (item) => <div className="flex gap-2"><Button variant="secondary" className="px-3 py-1.5" type="button" onClick={() => open(item)}>Edit</Button><Button variant="danger" className="px-3 py-1.5" type="button" onClick={() => setPending(item)}>Delete</Button></div> },
              ]} />
            </section>
          ))}
        </div>
      )}

      {modal && <Modal title={`${editing ? 'Edit' : 'Add'} holiday`} onClose={() => setModal(false)} onConfirm={() => document.getElementById('holiday-form')?.requestSubmit()} confirmLabel={editing ? 'Save changes' : 'Add holiday'} loading={saving}>
        <form id="holiday-form" className="space-y-4" onSubmit={save}>
          <Input label="Holiday name" value={form.name} error={fieldErrors.name} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Date" type="date" value={form.date} error={fieldErrors.date} required onChange={(event) => setForm({ ...form, date: event.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.isOptional} onChange={(event) => setForm({ ...form, isOptional: event.target.checked })} />Optional holiday</label>
          <ErrorBanner>{error}</ErrorBanner>
        </form>
      </Modal>}
      {pending && <Modal title={`Delete ${pending.name}?`} onClose={() => setPending(null)} onConfirm={remove} confirmLabel="Delete" loading={saving} danger><p className="text-sm text-slate-600">This holiday will be permanently removed from the calendar.</p></Modal>}
    </div>
  );
}

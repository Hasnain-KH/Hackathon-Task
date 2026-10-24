import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Input from '../../components/ui/Input.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Select from '../../components/ui/Select.jsx';
import Table from '../../components/ui/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage, apiFieldErrors } from '../../components/ui/useApiError.js';

function initialValues(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue ?? (field.type === 'checkbox' ? false : '')]));
}

export default function OrgResourcePage({ title, endpoint, fields, columns, searchLabel = 'Search', description, preloadError }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialValues(fields));
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(endpoint, { params: query ? { q: query } : {} });
      setItems(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, `Could not load ${title.toLowerCase()}.`));
    } finally {
      setLoading(false);
    }
  }, [endpoint, query, title]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openForm = (item = null) => {
    setEditing(item);
    setFieldErrors({});
    setError('');
    setForm(item
      ? Object.fromEntries(fields.map((field) => [field.name, field.read ? field.read(item) : item[field.name] ?? '']))
      : initialValues(fields));
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = Object.fromEntries(fields.map((field) => [field.name, field.serialize ? field.serialize(form[field.name]) : form[field.name]]));
      if (editing) await api.patch(`${endpoint}/${editing._id}`, payload);
      else await api.post(endpoint, payload);
      toast(`${title.slice(0, -1)} ${editing ? 'updated' : 'created'}.`);
      setModalOpen(false);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, `Could not save ${title.toLowerCase()}.`));
      setFieldErrors(apiFieldErrors(requestError));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await api.patch(`${endpoint}/${pending._id}`, { isActive: !pending.isActive });
      toast(`${pending.name} ${pending.isActive ? 'deactivated' : 'activated'}.`);
      setPending(null);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not update status.'));
      setPending(null);
    } finally {
      setSaving(false);
    }
  };

  const tableColumns = [
    ...columns,
    { key: 'status', label: 'Status', render: (item) => <Badge tone={item.isActive ? 'green' : 'slate'}>{item.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="px-3 py-1.5" type="button" onClick={() => openForm(item)}>Edit</Button>
          <Button variant={item.isActive ? 'danger' : 'secondary'} className="px-3 py-1.5" type="button" onClick={() => item.isActive ? setPending(item) : toggleRow(item)}>
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  const toggleRow = async (item) => {
    try {
      await api.patch(`${endpoint}/${item._id}`, { isActive: !item.isActive });
      toast(`${item.name} activated.`);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not update status.'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        <Button type="button" onClick={() => openForm()}>Add {title.replace(/s$/, '')}</Button>
      </div>
      <ErrorBanner>{preloadError}</ErrorBanner>
      <div className="max-w-md"><Input label={searchLabel} placeholder="Type to search…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label={`Loading ${title.toLowerCase()}`} /> : items.length ? (
        <Table columns={tableColumns} rows={items} />
      ) : <EmptyState title={`No ${title.toLowerCase()} found`} description="Add an item or adjust your search." />}

      {modalOpen && (
        <Modal title={`${editing ? 'Edit' : 'Add'} ${title.replace(/s$/, '')}`} onClose={() => setModalOpen(false)} onConfirm={() => document.getElementById('resource-form')?.requestSubmit()} confirmLabel={editing ? 'Save changes' : 'Create'} loading={saving}>
          <form id="resource-form" onSubmit={save} className="space-y-4">
            {fields.map((field) => field.type === 'select' ? (
              <Select
                key={field.name}
                label={field.label}
                value={form[field.name]}
                error={fieldErrors[field.name]}
                required={field.required}
                onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
              >
                <option value="">Select {field.label.toLowerCase()}</option>
                {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            ) : field.type === 'checkbox' ? (
              <label key={field.name} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={Boolean(form[field.name])} onChange={(event) => setForm({ ...form, [field.name]: event.target.checked })} />
                {field.label}
              </label>
            ) : (
              <Input
                key={field.name}
                label={field.label}
                type={field.type || 'text'}
                min={field.min}
                max={field.max}
                step={field.step}
                required={field.required}
                error={fieldErrors[field.name]}
                value={form[field.name]}
                onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
              />
            ))}
            <ErrorBanner>{error}</ErrorBanner>
          </form>
        </Modal>
      )}
      {pending && (
        <Modal title={`Deactivate ${pending.name}?`} onClose={() => setPending(null)} onConfirm={toggleActive} confirmLabel="Deactivate" loading={saving} danger>
          <p className="text-sm text-slate-600">This will mark this record inactive. It can be activated again later.</p>
        </Modal>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import AuditTable from '../../components/comms/AuditTable.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Input from '../../components/ui/Input.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Select from '../../components/ui/Select.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';

const actionOptions = ['', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'FINALIZE', 'LOGIN', 'RESET_PASSWORD', 'DEACTIVATE'];
const entityOptions = ['', 'Employee', 'LeaveRequest', 'AttendanceCorrection', 'PayrollRun', 'Department', 'Designation', 'LeaveType', 'Holiday', 'CompanySettings', 'User', 'Announcement'];

export default function AuditLog() {
  const [filters, setFilters] = useState({ action: '', entity: '', from: '', to: '', actorUserId: '' });
  const [applied, setApplied] = useState({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/audit', { params: { page, limit: 20, ...applied } });
      setItems(data.items);
      setPages(data.pages);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load the audit log.'));
    } finally {
      setLoading(false);
    }
  }, [applied, page]);
  useEffect(() => { load(); }, [load]);

  const apply = (event) => {
    event.preventDefault();
    setPage(1);
    setApplied(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
  };

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold text-ink">Audit log</h1><p className="mt-1 text-sm text-slate-500">Review administrative and workflow changes.</p></div>
    <form onSubmit={apply} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
      <Select label="Action" value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} options={actionOptions.map((value) => ({ value, label: value || 'All actions' }))} />
      <Select label="Entity" value={filters.entity} onChange={(event) => setFilters({ ...filters, entity: event.target.value })} options={entityOptions.map((value) => ({ value, label: value || 'All entities' }))} />
      <Input label="From" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
      <Input label="To" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
      <Input label="Actor user ID" value={filters.actorUserId} onChange={(event) => setFilters({ ...filters, actorUserId: event.target.value })} />
      <div className="sm:col-span-2 lg:col-span-5"><Button type="submit">Apply filters</Button></div>
    </form>
    {error && <ErrorBanner>{error} <button type="button" className="ml-2 font-semibold underline" onClick={load}>Retry</button></ErrorBanner>}
    {loading ? <Loader label="Loading audit history" /> : items.length ? <AuditTable items={items} /> : <EmptyState title="No audit events" description="There are no audit records matching these filters." />}
    {pages > 1 && <div className="flex items-center justify-between"><Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm text-slate-500">Page {page} of {pages}</span><Button type="button" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div>}
  </div>;
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';
import EmployeeForm from './EmployeeForm.jsx';

const employmentTypes = ['full_time', 'part_time', 'contract', 'intern'];

function statusTone(status) {
  if (status === 'active') return 'green';
  if (status === 'probation') return 'amber';
  return 'slate';
}

export default function EmployeeList() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const basePath = user?.role === 'admin' ? '/admin/employees' : '/hr/employees';
  const canCreate = user?.role === 'hr';
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [query, setQuery] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get('/departments', { params: { limit: 100, isActive: true } })
      .then(({ data }) => setDepartments(data.items))
      .catch((requestError) => setError(apiErrorMessage(requestError, 'Could not load departments.')));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/employees', {
        params: {
          q: query || undefined,
          departmentId: departmentId || undefined,
          status: status || undefined,
          employmentType: employmentType || undefined,
          page,
          limit: 10,
        },
      });
      setItems(data.items);
      setTotal(data.total);
      setPages(Math.max(1, data.pages));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load employees.'));
    } finally {
      setLoading(false);
    }
  }, [departmentId, employmentType, page, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const exportCsv = async () => {
    try {
      const { data } = await api.get('/employees/export', {
        params: { q: query || undefined, departmentId: departmentId || undefined, status: status || undefined, employmentType: employmentType || undefined },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'employees.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not export employees.'));
    }
  };

  const terminate = async () => {
    setDeleting(true);
    try {
      await api.delete(`/employees/${pending._id}`);
      toast(`${pending.firstName} ${pending.lastName} terminated.`);
      setPending(null);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not terminate employee.'));
      setPending(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'employeeCode', label: 'Code' },
    { key: 'name', label: 'Name', render: (item) => `${item.firstName} ${item.lastName}` },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department', render: (item) => item.departmentId?.name || '—' },
    { key: 'designation', label: 'Designation', render: (item) => item.designationId?.name || '—' },
    { key: 'status', label: 'Status', render: (item) => <Badge tone={statusTone(item.status)}>{item.status}</Badge> },
    { key: 'actions', label: 'Actions', render: (item) => <div className="flex gap-2">
      <Link to={`${basePath}/${item._id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">View</Link>
      <Button variant="secondary" className="px-3 py-1.5 text-xs" type="button" onClick={() => { setEditing(item); setFormOpen(true); }}>Edit</Button>
      {canCreate && item.status !== 'terminated' && <Button variant="danger" className="px-3 py-1.5 text-xs" type="button" onClick={() => setPending(item)}>Terminate</Button>}
    </div> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-bold text-ink">Employees</h1><p className="mt-1 text-sm text-slate-500">{total} employee{total === 1 ? '' : 's'} in the directory</p></div>
        <div className="flex flex-wrap gap-2">
          {canCreate && <>
            <Button variant="secondary" type="button" onClick={() => navigate(`${basePath}/import`)}>Import CSV</Button>
            <Button variant="secondary" type="button" onClick={exportCsv}>Export CSV</Button>
            <Button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>Add Employee</Button>
          </>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Search" placeholder="Name, code, or email…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        <Select label="Department" value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setPage(1); }}>
          <option value="">All departments</option>
          {departments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </Select>
        <Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['active', 'probation', 'resigned', 'terminated'].map((value) => <option key={value} value={value}>{value}</option>)}
        </Select>
        <Select label="Employment type" value={employmentType} onChange={(event) => { setEmploymentType(event.target.value); setPage(1); }}>
          <option value="">All types</option>
          {employmentTypes.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
        </Select>
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label="Loading employee directory" /> : items.length ? <>
        <div className="hidden md:block"><Table rows={items} columns={columns} /></div>
        <div className="space-y-3 md:hidden">
          {items.map((item) => <article key={item._id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold text-ink">{item.firstName} {item.lastName}</p><p className="text-xs text-slate-500">{item.employeeCode} · {item.email}</p></div>
              <Badge tone={statusTone(item.status)}>{item.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-600">{item.departmentId?.name || '—'} · {item.designationId?.name || '—'}</p>
            <div className="mt-3 flex gap-2">
              <Link to={`${basePath}/${item._id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">View</Link>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" type="button" onClick={() => { setEditing(item); setFormOpen(true); }}>Edit</Button>
              {canCreate && item.status !== 'terminated' && <Button variant="danger" className="px-3 py-1.5 text-xs" type="button" onClick={() => setPending(item)}>Terminate</Button>}
            </div>
          </article>)}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <Button variant="secondary" type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      </> : <EmptyState title="No employees found" description={query || departmentId || status || employmentType ? 'Try changing or clearing your filters.' : 'Employees registered by HR will appear here.'} />}

      {formOpen && <EmployeeForm employee={editing} onClose={() => setFormOpen(false)} onSaved={load} />}
      {pending && <Modal title="Terminate employee?" onClose={() => setPending(null)} onConfirm={terminate} confirmLabel="Terminate employee" loading={deleting} danger>
        <p className="text-sm leading-6 text-slate-600">Terminate {pending.firstName} {pending.lastName}? Their login will be disabled.</p>
      </Modal>}
    </div>
  );
}

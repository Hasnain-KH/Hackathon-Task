import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import AttendanceTable from '../../components/attendance/AttendanceTable.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Input from '../../components/ui/Input.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Select from '../../components/ui/Select.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';

function dateToday() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function Summary({ label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-ink">{value}</p></div>;
}

function exportCurrentPage(items, date) {
  const headers = ['employeeCode', 'name', 'departmentName', 'designationName', 'status', 'checkInAt', 'checkOutAt', 'lateMinutes', 'workedMinutes'];
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = items.map((item) => [
    item.employeeCode,
    item.name,
    item.departmentName,
    item.designationName,
    item.status,
    item.checkInAt || '',
    item.checkOutAt || '',
    item.lateMinutes,
    item.workedMinutes,
  ].map(quote).join(','));
  const url = URL.createObjectURL(new Blob([[headers.join(','), ...rows].join('\r\n')], { type: 'text/csv' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `attendance-${date}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceBoard() {
  const [departments, setDepartments] = useState([]);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({});
  const [date, setDate] = useState(dateToday);
  const [departmentId, setDepartmentId] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/departments', { params: { limit: 100, isActive: true } })
      .then(({ data }) => setDepartments(data.items))
      .catch((requestError) => setError(apiErrorMessage(requestError, 'Could not load departments.')));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/attendance/board', {
        params: { date, departmentId: departmentId || undefined, q: query || undefined, status: status || undefined, page, limit: 25 },
      });
      setItems(data.items);
      setTotals(data.totals);
      setPages(Math.max(1, data.pages));
      setTotal(data.total);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load attendance board.'));
    } finally {
      setLoading(false);
    }
  }, [date, departmentId, page, query, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-bold text-ink">Attendance board</h1><p className="mt-1 text-sm text-slate-500">{total} employee{total === 1 ? '' : 's'} · {date}</p></div>
        <Button type="button" variant="secondary" disabled={!items.length} onClick={() => exportCurrentPage(items, date)}>Export current page CSV</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} />
        <Select label="Department" value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setPage(1); }}>
          <option value="">All departments</option>{departments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </Select>
        <Input label="Search" placeholder="Name, code, email…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        <Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['present', 'late', 'half_day', 'absent', 'missing_checkout', 'not_checked_in', 'scheduled', 'on_leave'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Summary label="Present" value={totals.present || 0} />
        <Summary label="Late" value={totals.late || 0} />
        <Summary label="Half day" value={totals.halfDay || 0} />
        <Summary label="Absent" value={totals.absent || 0} />
        <Summary label="Missing checkout" value={totals.missingCheckout || 0} />
        <Summary label="Not checked in" value={totals.notCheckedIn || 0} />
        <Summary label="On leave" value={totals.onLeave || 0} />
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label="Loading attendance board" /> : items.length ? <>
        <AttendanceTable items={items} />
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {pages}</p>
          <div className="flex gap-2"><Button variant="secondary" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="secondary" type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
        </div>
      </> : <EmptyState title="No employees found" description="Employees that are active or on probation appear here." />}
    </div>
  );
}

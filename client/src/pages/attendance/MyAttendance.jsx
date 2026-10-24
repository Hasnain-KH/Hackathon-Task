import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import CheckInWidget from '../../components/attendance/CheckInWidget.jsx';
import StatusBadge from '../../components/attendance/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';
import CorrectionModal from './CorrectionModal.jsx';

const statusColors = {
  present: 'bg-emerald-100 text-emerald-800',
  late: 'bg-amber-100 text-amber-800',
  half_day: 'bg-indigo-100 text-indigo-800',
  missing_checkout: 'bg-orange-100 text-orange-800',
  absent: 'bg-red-100 text-red-800',
  on_leave: 'bg-purple-100 text-purple-800',
};

function currentMonth(date) {
  return date.slice(0, 7);
}

function monthRange(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
    year,
    monthNumber,
    lastDay,
  };
}

function SummaryCard({ label, value, tone }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-2 text-2xl font-bold ${tone || 'text-ink'}`}>{value}</p></div>;
}

export default function MyAttendance() {
  const [today, setToday] = useState('');
  const [month, setMonth] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [correctionDate, setCorrectionDate] = useState(null);
  const [pendingDays, setPendingDays] = useState(new Set());

  useEffect(() => {
    api.get('/attendance/me/today')
      .then(({ data }) => {
        const date = data.data.date;
        setToday(date);
        setMonth(currentMonth(date));
      })
      .catch((requestError) => {
        setError(apiErrorMessage(requestError, 'Could not determine today’s date.'));
        setLoading(false);
      });
  }, []);

  const range = useMemo(() => month ? monthRange(month) : null, [month]);
  const load = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    setError('');
    try {
      const [attendanceResponse, correctionResponse] = await Promise.all([
        api.get('/attendance/me', { params: { from: range.from, to: range.to } }),
        api.get('/attendance/me/corrections', { params: { limit: 100 } }),
      ]);
      setResult(attendanceResponse.data.data);
      setPendingDays(new Set(correctionResponse.data.items.filter((item) => item.status === 'pending').map((item) => item.date)));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load attendance history.'));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const recordMap = useMemo(() => new Map((result?.records || []).map((record) => [record.date, record])), [result]);
  const firstWeekday = range ? new Date(Date.UTC(range.year, range.monthNumber - 1, 1)).getUTCDay() : 0;
  const dates = range ? Array.from({ length: firstWeekday + range.lastDay }, (_, index) => {
    if (index < firstWeekday) return null;
    return `${month}-${String(index - firstWeekday + 1).padStart(2, '0')}`;
  }) : [];
  const summary = result?.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-bold text-ink">My attendance</h1><p className="mt-1 text-sm text-slate-500">Check-in status and attendance history.</p></div>
        <Link to="/employee/attendance/corrections" className="text-sm font-semibold text-brand hover:underline">My correction requests</Link>
      </div>
      <CheckInWidget />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-xs"><label className="block text-sm font-medium text-slate-700">Attendance month<input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" type="month" value={month} max={today.slice(0, 7)} onChange={(event) => setMonth(event.target.value)} /></label></div>
        <Button variant="secondary" type="button" onClick={() => setMonth(currentMonth(today))}>Current month</Button>
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label="Loading attendance calendar" /> : <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard label="Present" value={summary.present || 0} tone="text-emerald-700" />
          <SummaryCard label="Late" value={summary.late || 0} tone="text-amber-700" />
          <SummaryCard label="Half day" value={summary.halfDay || 0} tone="text-indigo-700" />
          <SummaryCard label="Absent" value={summary.absent || 0} tone="text-red-700" />
          <SummaryCard label="Missing out" value={summary.missingCheckout || 0} tone="text-orange-700" />
          <SummaryCard label="On leave" value={summary.onLeave || 0} tone="text-purple-700" />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink">Calendar</h2>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2 text-center text-xs font-semibold text-slate-400">{day}</div>)}
            {dates.map((date, index) => {
              const record = date ? recordMap.get(date) : null;
              const isFuture = date > today;
              const dayStatus = record?.status || (date < today && !isFuture ? 'absent' : null);
              return <div key={date || `blank-${index}`} className={`min-h-14 rounded-lg border p-1 sm:min-h-20 sm:p-2 ${date ? 'border-slate-100' : 'border-transparent'}`}>
                {date && <button
                  type="button"
                  disabled={isFuture}
                  onClick={() => !record && !pendingDays.has(date) && setCorrectionDate(date)}
                  className={`flex h-full w-full flex-col items-center justify-start gap-1 rounded-md p-1 text-xs disabled:cursor-not-allowed sm:items-start sm:p-2 ${dayStatus ? statusColors[dayStatus] || 'bg-slate-100' : 'text-slate-600 hover:bg-slate-50'} ${pendingDays.has(date) ? 'ring-2 ring-amber-300' : ''}`}
                  aria-label={`${date}${dayStatus ? ` ${dayStatus}` : ' request correction'}`}
                >
                  <span className="font-semibold">{Number(date.slice(-2))}</span>
                  {dayStatus ? <span className="hidden truncate text-[10px] capitalize sm:block">{dayStatus.replaceAll('_', ' ')}</span> : pendingDays.has(date) ? <span className="hidden text-[10px] sm:block">Pending</span> : null}
                </button>}
              </div>;
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">Select a day without a record to request a correction. Dates with a pending request are highlighted.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Daily records</h2>
          {result?.records.length ? <div className="space-y-3">
            {result.records.map((record) => <article key={record._id} className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{record.date}</p><StatusBadge status={record.status} /></div>
                <p className="mt-2 text-sm text-slate-600">
                  In {record.checkInAt ? new Date(record.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {' · '}Out {record.checkOutAt ? new Date(record.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {' · '}Worked {Math.floor(record.workedMinutes / 60)}h {record.workedMinutes % 60}m
                </p>
              </div>
              <Button type="button" variant="secondary" disabled={pendingDays.has(record.date)} onClick={() => setCorrectionDate(record.date)}>
                {pendingDays.has(record.date) ? 'Request pending' : 'Request correction'}
              </Button>
            </article>)}
          </div> : <EmptyState title="No attendance records" description="Your check-in and check-out records will appear here." />}
        </section>
      </>}
      {correctionDate && <CorrectionModal date={correctionDate} onClose={() => setCorrectionDate(null)} onSubmitted={load} />}
    </div>
  );
}

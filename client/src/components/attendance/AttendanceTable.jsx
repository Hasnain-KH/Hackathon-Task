import StatusBadge from './StatusBadge.jsx';

function time(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
}

function duration(value) {
  if (!value) return '—';
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

export default function AttendanceTable({ items, onAction, actionLabel = 'View' }) {
  const rowContent = (item) => (
    <>
      <p className="font-semibold text-ink">{item.name || item.employee?.name || 'Employee'}</p>
      {item.employeeCode && <p className="text-xs text-slate-500">{item.employeeCode}</p>}
    </>
  );

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{['Employee', 'Department', 'Status', 'In', 'Out', 'Late', 'Worked', ...(onAction ? ['Actions'] : [])].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((item) => <tr key={item.employeeId || item._id} className="hover:bg-slate-50">
              <td className="px-4 py-3">{rowContent(item)}</td>
              <td className="px-4 py-3 text-slate-600">{item.departmentName || '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
              <td className="px-4 py-3">{time(item.checkInAt)}</td>
              <td className="px-4 py-3">{time(item.checkOutAt)}</td>
              <td className="px-4 py-3">{item.lateMinutes ? `${item.lateMinutes}m` : '—'}</td>
              <td className="px-4 py-3">{duration(item.workedMinutes)}</td>
              {onAction && <td className="px-4 py-3"><button type="button" className="font-semibold text-brand hover:underline" onClick={() => onAction(item)}>{actionLabel}</button></td>}
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {items.map((item) => <article key={item.employeeId || item._id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">{rowContent(item)}<StatusBadge status={item.status} /></div>
          <p className="mt-2 text-sm text-slate-500">{item.departmentName || '—'}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-slate-400">In</dt><dd>{time(item.checkInAt)}</dd></div>
            <div><dt className="text-slate-400">Out</dt><dd>{time(item.checkOutAt)}</dd></div>
            <div><dt className="text-slate-400">Late</dt><dd>{item.lateMinutes ? `${item.lateMinutes}m` : '—'}</dd></div>
            <div><dt className="text-slate-400">Worked</dt><dd>{duration(item.workedMinutes)}</dd></div>
          </dl>
          {onAction && <button className="mt-3 text-sm font-semibold text-brand" type="button" onClick={() => onAction(item)}>{actionLabel}</button>}
        </article>)}
      </div>
    </>
  );
}

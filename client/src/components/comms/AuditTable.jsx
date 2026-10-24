import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Table from '../ui/Table.jsx';
import { formatDateTime } from '../../utils/format.js';

function jsonText(value) {
  return JSON.stringify(value ?? null, null, 2);
}

export default function AuditTable({ items }) {
  const [selected, setSelected] = useState(null);
  const columns = [
    { key: 'createdAt', label: 'Time', render: (row) => formatDateTime(row.createdAt) },
    { key: 'actorUserId', label: 'Actor', render: (row) => row.actorUserId?.name || 'System' },
    { key: 'action', label: 'Action' },
    { key: 'entity', label: 'Entity' },
    { key: 'entityId', label: 'Record', render: (row) => row.entityId ? String(row.entityId).slice(-8) : '—' },
    { key: 'details', label: 'Details', render: (row) => <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setSelected(row)}>View changes</button> },
  ];
  return <>
    <div className="hidden md:block"><Table columns={columns} rows={items} /></div>
    <div className="space-y-3 md:hidden">{items.map((item) => <article key={item._id} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-ink">{item.action} · {item.entity}</p><p className="mt-1 text-sm text-slate-600">{item.actorUserId?.name || 'System'}</p></div><time className="text-right text-xs text-slate-500">{formatDateTime(item.createdAt)}</time></div>
      <button type="button" className="mt-3 text-sm font-semibold text-brand hover:underline" onClick={() => setSelected(item)}>View changes</button>
    </article>)}</div>
    {selected && <Modal title={`${selected.entity} · ${selected.action}`} onClose={() => setSelected(null)}>
      <div className="grid gap-4 md:grid-cols-2">
        <div><h3 className="mb-2 text-sm font-semibold">Before</h3><pre className="max-h-80 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{jsonText(selected.before)}</pre></div>
        <div><h3 className="mb-2 text-sm font-semibold">After</h3><pre className="max-h-80 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{jsonText(selected.after)}</pre></div>
      </div>
      <p className="mt-3 break-all text-xs text-slate-500">IP: {selected.ip || '—'} · {selected.userAgent || '—'}</p>
    </Modal>}
  </>;
}

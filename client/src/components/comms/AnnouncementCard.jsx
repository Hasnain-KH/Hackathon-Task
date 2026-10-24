import { formatDateTime } from '../../utils/format.js';

export default function AnnouncementCard({ items = [], title = 'Announcements' }) {
  return (
    <section className="space-y-3">
      {title && <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-ink">{title}</h2></div>}
      {!items.length ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No announcements yet.</p>
      ) : items.map((item) => (
        <article key={item._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-semibold text-ink">{item.title}</h3>
            <div className="flex items-center gap-2">
              {item.pinned && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Pinned</span>}
              <time className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</time>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.body}</p>
          {item.postedByUserId?.name && <p className="mt-3 text-xs text-slate-400">Posted by {item.postedByUserId.name}</p>}
        </article>
      ))}
    </section>
  );
}

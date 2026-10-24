export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="animate-pulse space-y-3 rounded-xl border border-slate-200 bg-white p-5" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-100" />
      <div className="h-4 w-4/5 rounded bg-slate-100" />
    </div>
  );
}

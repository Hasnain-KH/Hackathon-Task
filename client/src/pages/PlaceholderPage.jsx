export default function PlaceholderPage({ title }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-slate-500">Coming in later steps.</p>
    </div>
  );
}

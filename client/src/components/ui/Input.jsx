export default function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-indigo-100 ${error ? 'border-red-400' : 'border-slate-300'} ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export default function Toast({ message, type = 'success' }) {
  return (
    <div role="status" className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
      {message}
    </div>
  );
}

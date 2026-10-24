export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const style = variant === 'danger'
    ? 'bg-red-600 text-white hover:bg-red-700'
    : variant === 'secondary'
      ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      : 'bg-brand text-white hover:bg-indigo-700';
  return (
    <button className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${style} ${className}`} {...props}>
      {children}
    </button>
  );
}

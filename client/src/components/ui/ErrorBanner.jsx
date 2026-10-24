export default function ErrorBanner({ children }) {
  return children ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{children}</div> : null;
}

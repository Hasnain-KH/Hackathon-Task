import { useState } from 'react';
import { Brand } from '../pages/Setup.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardShell({ title, children }) {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');

  const signOut = async () => {
    setError('');
    try {
      await logout();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not contact the server; your local session was cleared.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Brand />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink">{user?.name}</p>
              <p className="text-xs capitalize text-slate-500">{user?.role}</p>
            </div>
            <button onClick={signOut} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" type="button">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-slate-500">Your workspace is ready for the next steps.</p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          {children}
        </section>
      </main>
    </div>
  );
}

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';
import Button from '../ui/Button.jsx';

export default function AppShell() {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const signOut = async () => {
    setLogoutError('');
    try {
      await logout();
    } catch (error) {
      setLogoutError(error.response?.data?.error || 'Could not contact server; local session was cleared.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={user?.role} open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />
      {drawerOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/40 md:hidden" onClick={() => setDrawerOpen(false)} />}
      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" type="button" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}>☰</button>
            <span className="text-sm font-semibold capitalize text-ink">{user?.role} workspace</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">{user?.name}</span>
            <Button variant="secondary" className="px-3 py-2" type="button" onClick={signOut}>Log out</Button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {logoutError && <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{logoutError}</p>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

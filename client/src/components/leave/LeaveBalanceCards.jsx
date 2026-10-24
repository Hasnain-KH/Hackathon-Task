import { useEffect, useState } from 'react';
import api from '../../api/axios.js';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Loader from '../ui/Loader.jsx';
import { apiErrorMessage } from '../ui/useApiError.js';

export default function LeaveBalanceCards({ endpoint = '/leave/balances/me', limit }) {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(endpoint).then(({ data }) => {
      if (active) setBalances(data.data.items);
    }).catch((requestError) => {
      if (active) setError(apiErrorMessage(requestError, 'Could not load leave balances.'));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [endpoint]);

  if (loading) return <Loader label="Loading leave balances" />;
  if (error) return <ErrorBanner>{error}</ErrorBanner>;
  const shownBalances = typeof limit === 'number' ? balances.slice(0, limit) : balances;
  if (!shownBalances.length) {
    return <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No active leave types are configured.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {shownBalances.map((balance) => (
        <article key={balance.leaveTypeId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-ink">{balance.name}</h3>
            <span className="text-xs font-medium text-slate-500">{balance.isPaid ? 'Paid' : 'Unpaid'}</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-brand">{balance.unlimited ? 'Unlimited' : balance.remaining}</p>
          <p className="mt-1 text-xs text-slate-500">
            {balance.used} used · {balance.pending} pending{balance.unlimited ? ' · no annual limit' : ` · ${balance.quotaPerYear} days/year`}
          </p>
        </article>
      ))}
    </div>
  );
}

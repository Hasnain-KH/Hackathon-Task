import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios.js';
import MonthPicker from '../../components/payroll/MonthPicker.jsx';
import PayrollRunBadge from '../../components/payroll/PayrollRunBadge.jsx';
import { formatCurrency } from '../../components/payroll/currency.js';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}`;
}

export default function PayrollRuns() {
  const { user } = useAuth();
  const toast = useToast();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [monthModal, setMonthModal] = useState(false);
  const basePath = user?.role === 'admin' ? '/admin/payroll' : '/hr/payroll';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/payroll/runs', { params: { limit: 100 } });
      setRuns(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load payroll runs.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      const { data } = await api.post(`/payroll/runs/${month}/generate`);
      toast(`Draft payroll generated for ${month}.`);
      setMonthModal(false);
      await load();
      window.location.assign(`${basePath}/${data.data.run.month}`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not generate payroll.'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-ink">Payroll runs</h1><p className="mt-1 text-sm text-slate-500">Generate monthly payroll drafts from attendance and leave records.</p></div>
        <Button type="button" onClick={() => setMonthModal(true)}>Generate for month</Button>
      </div>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label="Loading payroll runs" /> : runs.length ? (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Month', 'Status', 'Employees', 'Gross', 'Deductions', 'Tax', 'Net', ''].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 bg-white">{runs.map((run) => <tr key={run._id}>
                <td className="px-4 py-3 font-semibold">{run.month}</td><td className="px-4 py-3"><PayrollRunBadge status={run.status} /></td>
                <td className="px-4 py-3">{run.totals.employees}</td><td className="px-4 py-3">{formatCurrency(run.totals.gross)}</td>
                <td className="px-4 py-3">{formatCurrency(run.totals.deductions)}</td><td className="px-4 py-3">{formatCurrency(run.totals.tax)}</td><td className="px-4 py-3 font-semibold">{formatCurrency(run.totals.net)}</td>
                <td className="px-4 py-3"><Link className="font-semibold text-brand hover:underline" to={`${basePath}/${run.month}`}>View run</Link></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">{runs.map((run) => <Link key={run._id} to={`${basePath}/${run.month}`} className="block rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex justify-between"><span className="font-semibold text-ink">{run.month}</span><PayrollRunBadge status={run.status} /></div>
            <p className="mt-2 text-sm text-slate-500">{run.totals.employees} employees · Net {formatCurrency(run.totals.net)}</p>
            <p className="mt-1 text-xs text-slate-500">Gross {formatCurrency(run.totals.gross)} · Deductions {formatCurrency(run.totals.deductions)} · Tax {formatCurrency(run.totals.tax)}</p>
          </Link>)}</div>
        </>
      ) : <EmptyState title="No payroll runs yet" description="Generate one for this month to prepare a draft payroll." />}
      {monthModal && <Modal title="Generate payroll draft" onClose={() => setMonthModal(false)} onConfirm={generate} confirmLabel="Generate draft" loading={generating}>
        <div className="space-y-3"><MonthPicker value={month} onChange={setMonth} /><ErrorBanner>{error}</ErrorBanner><p className="text-xs text-slate-500">Existing drafts for the selected month will be refreshed. Finalized runs cannot be changed.</p></div>
      </Modal>}
    </div>
  );
}

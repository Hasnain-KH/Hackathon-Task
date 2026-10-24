import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios.js';
import PayslipModal from '../../components/payroll/PayslipModal.jsx';
import PayslipRow from '../../components/payroll/PayslipRow.jsx';
import PayrollRunBadge from '../../components/payroll/PayrollRunBadge.jsx';
import { formatCurrency } from '../../components/payroll/currency.js';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Input from '../../components/ui/Input.jsx';
import Loader from '../../components/ui/Loader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';

function TotalCard({ label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-ink">{value}</p></div>;
}

export default function PayrollRunDetail() {
  const { month } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [runData, setRunData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const basePath = user?.role === 'admin' ? '/admin/payroll' : '/hr/payroll';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/payroll/runs/${month}`);
      setRunData(data.data);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load payroll run.'));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const regenerate = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/payroll/runs/${month}/generate`);
      toast(`Payroll draft refreshed for ${month}.`);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not regenerate payroll.'));
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (confirmation !== 'FINALIZE') {
      setError('Type FINALIZE exactly to lock payroll.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post(`/payroll/runs/${month}/finalize`);
      toast(`Payroll for ${month} finalized.`);
      setFinalizeOpen(false);
      setConfirmation('');
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not finalize payroll.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader label={`Loading payroll for ${month}`} />;
  if (!runData) return <div className="space-y-4"><ErrorBanner>{error}</ErrorBanner><Link to={basePath} className="text-sm font-semibold text-brand">Back to payroll runs</Link></div>;
  const { run, payslips, totals } = runData;

  return (
    <div className="space-y-5">
      <Link to={basePath} className="text-sm font-semibold text-brand hover:underline">← Payroll runs</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-ink">Payroll — {run.month}</h1><PayrollRunBadge status={run.status} /></div><p className="mt-1 text-sm text-slate-500">{run.workingDays} working days</p></div>
        <div className="flex gap-2">
          {run.status === 'draft' && <Button type="button" variant="secondary" disabled={busy} onClick={regenerate}>{busy ? 'Refreshing…' : 'Regenerate draft'}</Button>}
          {run.status === 'draft' && user?.role === 'admin' && <Button type="button" disabled={busy} onClick={() => { setConfirmation(''); setFinalizeOpen(true); }}>Finalize</Button>}
        </div>
      </div>
      {run.status === 'finalized' && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">This payroll is locked.</div>}
      <ErrorBanner>{error}</ErrorBanner>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <TotalCard label="Employees" value={totals.employees} /><TotalCard label="Gross" value={formatCurrency(totals.gross)} /><TotalCard label="Deductions" value={formatCurrency(totals.deductions)} /><TotalCard label="Tax" value={formatCurrency(totals.tax)} /><TotalCard label="Net" value={formatCurrency(totals.net)} />
      </section>
      <section className="space-y-3"><h2 className="text-lg font-semibold text-ink">Employee payslips</h2>
        {payslips.length ? <div className="space-y-3">{payslips.map((payslip) => <PayslipRow key={payslip._id} payslip={payslip} onView={setSelected} />)}</div> : <EmptyState title="No employees included" description="No employees were eligible for this month’s payroll." />}
      </section>
      {selected && <PayslipModal payslip={selected} endpoint={`/payroll/payslips/${selected._id}/pdf`} onClose={() => setSelected(null)} />}
      {finalizeOpen && <Modal title={`Finalize ${month}?`} onClose={() => setFinalizeOpen(false)} onConfirm={finalize} confirmLabel="Finalize and lock" loading={busy} danger confirmDisabled={confirmation !== 'FINALIZE'}>
        <div className="space-y-3"><p className="text-sm text-slate-600">This will lock payroll and cannot be undone.</p><Input label="Type FINALIZE to confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /><ErrorBanner>{error}</ErrorBanner></div>
      </Modal>}
    </div>
  );
}

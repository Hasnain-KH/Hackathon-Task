import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import PayslipModal from '../../components/payroll/PayslipModal.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorBanner from '../../components/ui/ErrorBanner.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../../components/ui/useApiError.js';
import { downloadPayslip, formatCurrency } from '../../components/payroll/currency.js';

export default function MyPayslips() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/payroll/payslips/me');
      setItems(data.items);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not load payslips.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const download = async (payslip) => {
    toast('Downloading payslip…');
    setError('');
    setDownloadingId(payslip._id);
    try {
      await downloadPayslip(api, payslip, `/payroll/payslips/me/${payslip._id}/pdf`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not download payslip.'));
      toast(apiErrorMessage(requestError, 'Could not download payslip.'), 'error');
    } finally {
      setDownloadingId('');
    }
  };

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-ink">My payslips</h1><p className="mt-1 text-sm text-slate-500">Download finalized monthly payslips.</p></div>
      <ErrorBanner>{error}</ErrorBanner>
      {loading ? <Loader label="Loading payslips" /> : items.length ? (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block"><table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Month', 'Gross', 'Net pay', 'Actions'].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100 bg-white">{items.map((item) => <tr key={item._id}><td className="px-4 py-3 font-semibold">{item.month}</td><td className="px-4 py-3">{formatCurrency(item.earnings.proratedGross)}</td><td className="px-4 py-3 font-semibold">{formatCurrency(item.netPay)}</td><td className="px-4 py-3"><div className="flex gap-2"><Button type="button" variant="secondary" className="px-3 py-1.5" onClick={() => setSelected(item)}>View</Button><Button type="button" className="px-3 py-1.5" disabled={downloadingId === item._id} onClick={() => download(item)}>{downloadingId === item._id ? 'Downloading…' : 'Download PDF'}</Button></div></td></tr>)}</tbody>
          </table></div>
          <div className="space-y-3 md:hidden">{items.map((item) => <article key={item._id} className="rounded-xl border border-slate-200 bg-white p-4"><p className="font-semibold text-ink">{item.month}</p><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">Gross</dt><dd>{formatCurrency(item.earnings.proratedGross)}</dd></div><div><dt className="text-xs text-slate-500">Net pay</dt><dd className="font-semibold">{formatCurrency(item.netPay)}</dd></div></dl><div className="mt-3 flex gap-2"><Button type="button" variant="secondary" onClick={() => setSelected(item)}>View</Button><Button type="button" disabled={downloadingId === item._id} onClick={() => download(item)}>{downloadingId === item._id ? 'Downloading…' : 'Download PDF'}</Button></div></article>)}</div>
        </>
      ) : <EmptyState title="No payslips yet" description="Your employer hasn't finalized any payroll." />}
      {selected && <PayslipModal payslip={selected} endpoint={`/payroll/payslips/me/${selected._id}/pdf`} onClose={() => setSelected(null)} />}
    </div>
  );
}

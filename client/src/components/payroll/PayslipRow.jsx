import { useState } from 'react';
import api from '../../api/axios.js';
import Button from '../ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../ui/useApiError.js';
import { downloadPayslip, formatCurrency } from './currency.js';

export default function PayslipRow({ payslip, onView }) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setError('');
    toast('Downloading payslip…');
    try {
      const endpoint = `/payroll/payslips/${payslip._id}/pdf`;
      await downloadPayslip(api, payslip, endpoint, setDownloading);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not download payslip.'));
      toast(apiErrorMessage(requestError, 'Could not download payslip.'), 'error');
    }
  };

  const name = `${payslip.employeeSnapshot.firstName} ${payslip.employeeSnapshot.lastName}`;
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{['Employee', 'Working days', 'Gross', 'Deductions', 'Tax', 'Net', 'Actions'].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            <tr>
              <td className="px-4 py-3"><p className="font-semibold text-ink">{name}</p><p className="text-xs text-slate-500">{payslip.employeeSnapshot.employeeCode}</p></td>
              <td className="px-4 py-3">{payslip.attendance.activeDays} / {payslip.attendance.workingDays}</td>
              <td className="px-4 py-3">{formatCurrency(payslip.earnings.proratedGross)}</td>
              <td className="px-4 py-3">{formatCurrency(payslip.deductions.totalDeductions)}</td>
              <td className="px-4 py-3">{formatCurrency(payslip.tax.monthlyTax)}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(payslip.netPay)}</td>
              <td className="px-4 py-3"><div className="flex gap-2"><Button type="button" variant="secondary" className="px-3 py-1.5" onClick={() => onView(payslip)}>View</Button><Button type="button" className="px-3 py-1.5" disabled={downloading} onClick={download}>{downloading ? 'Downloading…' : 'PDF'}</Button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 md:hidden">
        <div><p className="font-semibold text-ink">{name}</p><p className="text-xs text-slate-500">{payslip.employeeSnapshot.employeeCode}</p></div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-slate-500">Active days</dt><dd>{payslip.attendance.activeDays} / {payslip.attendance.workingDays}</dd></div>
          <div><dt className="text-xs text-slate-500">Gross</dt><dd>{formatCurrency(payslip.earnings.proratedGross)}</dd></div>
          <div><dt className="text-xs text-slate-500">Deductions</dt><dd>{formatCurrency(payslip.deductions.totalDeductions)}</dd></div>
          <div><dt className="text-xs text-slate-500">Tax</dt><dd>{formatCurrency(payslip.tax.monthlyTax)}</dd></div>
          <div><dt className="text-xs text-slate-500">Net</dt><dd className="font-semibold">{formatCurrency(payslip.netPay)}</dd></div>
        </dl>
        <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => onView(payslip)}>View</Button><Button type="button" disabled={downloading} onClick={download}>{downloading ? 'Downloading…' : 'Download PDF'}</Button></div>
      </article>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </>
  );
}

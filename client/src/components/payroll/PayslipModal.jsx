import { useState } from 'react';
import api from '../../api/axios.js';
import Button from '../ui/Button.jsx';
import ErrorBanner from '../ui/ErrorBanner.jsx';
import Modal from '../ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../ui/useApiError.js';
import { downloadPayslip, formatCurrency } from './currency.js';

function Value({ label, value }) {
  return <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-medium text-ink">{value}</span></div>;
}

export default function PayslipModal({ payslip, endpoint, onClose }) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const { employeeSnapshot: employee, salaryStructure: salary, attendance, earnings, deductions, tax } = payslip;
  const name = `${employee.firstName} ${employee.lastName}`;

  const download = async () => {
    toast('Downloading payslip…');
    setError('');
    try {
      await downloadPayslip(api, payslip, endpoint, setDownloading);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not download payslip.'));
      toast(apiErrorMessage(requestError, 'Could not download payslip.'), 'error');
    }
  };

  return (
    <Modal title={`Payslip — ${payslip.month}`} onClose={onClose}>
      <div className="space-y-5">
        <ErrorBanner>{error}</ErrorBanner>
        <div><p className="font-semibold text-ink">{name} · {employee.employeeCode}</p><p className="text-sm text-slate-500">{employee.departmentName || '—'} · {employee.designationName || '—'}</p></div>
        <section><h3 className="mb-2 font-semibold text-ink">Salary structure</h3>
          <Value label="Basic" value={formatCurrency(salary.basic)} /><Value label="HRA" value={formatCurrency(salary.hra)} /><Value label="Medical" value={formatCurrency(salary.medical)} /><Value label="Transport" value={formatCurrency(salary.transport)} /><Value label="Other" value={formatCurrency(salary.other)} /><Value label="Gross monthly salary" value={formatCurrency(salary.gross)} />
        </section>
        <section><h3 className="mb-2 font-semibold text-ink">Attendance and deductions</h3>
          <Value label="Active / working days" value={`${attendance.activeDays} / ${attendance.workingDays}`} /><Value label="Present days (late included)" value={`${attendance.presentDays} (${attendance.lateDays} late)`} /><Value label="Half days" value={attendance.halfDays} /><Value label="Absent days" value={attendance.absentDays} /><Value label="Paid / unpaid leave days" value={`${attendance.paidLeaveDays} / ${attendance.unpaidLeaveDays}`} /><Value label="Prorated gross" value={formatCurrency(earnings.proratedGross)} /><Value label="Absent deduction" value={formatCurrency(deductions.absentAmount)} /><Value label="Unpaid leave deduction" value={formatCurrency(deductions.unpaidLeaveAmount)} /><Value label="Half-day deduction" value={formatCurrency(deductions.halfDayAmount)} /><Value label="Total deductions" value={formatCurrency(deductions.totalDeductions)} />
        </section>
        <section><h3 className="mb-2 font-semibold text-ink">Tax and net</h3>
          <Value label={`Tax · ${tax.slabLabel}`} value={formatCurrency(tax.monthlyTax)} /><Value label="Net pay" value={formatCurrency(payslip.netPay)} />
        </section>
        <div className="flex justify-end"><Button type="button" disabled={downloading} onClick={download}>{downloading ? 'Downloading…' : 'Download PDF'}</Button></div>
      </div>
    </Modal>
  );
}

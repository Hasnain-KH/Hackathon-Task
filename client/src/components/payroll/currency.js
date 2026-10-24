export { formatCurrency } from '../../utils/format.js';

export async function downloadPayslip(api, payslip, endpoint, onDownloading) {
  onDownloading?.(true);
  try {
    const { data } = await api.get(endpoint, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `payslip-${payslip.employeeSnapshot.employeeCode}-${payslip.month}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } finally {
    onDownloading?.(false);
  }
}

const formatter = new Intl.NumberFormat('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  return `PKR ${formatter.format(Number(value) || 0)}`;
}

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

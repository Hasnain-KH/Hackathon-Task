import PDFDocument from 'pdfkit';

const currency = (value) => `PKR ${new Intl.NumberFormat('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value) || 0)}`;

function row(doc, label, value) {
  const y = doc.y;
  doc.font('Helvetica').fontSize(10).text(label, 60, y, { width: 250 });
  doc.text(String(value), 320, y, { width: 210, align: 'right' });
  doc.y = y + 16;
}

function section(doc, title) {
  doc.moveDown(0.4).font('Helvetica-Bold').fontSize(12).fillColor('#24324a').text(title);
  doc.moveDown(0.4).fillColor('#111827');
}

export default function streamPayslipPdf(res, payslip, companyName) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  doc.pipe(res);
  const { employeeSnapshot: person, salaryStructure: salary, attendance, earnings, deductions, tax } = payslip;
  const name = `${person.firstName} ${person.lastName}`;
  const finalizedAt = payslip.payrollRun?.finalizedAt;

  doc.font('Helvetica-Bold').fontSize(20).fillColor('#172554').text(companyName);
  doc.moveDown(0.35).font('Helvetica-Bold').fontSize(15).fillColor('#111827').text(`Payslip — ${payslip.month}`);
  doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor('#475569')
    .text(`${name} · ${person.employeeCode}`)
    .text(person.email)
    .text(`${person.departmentName || '—'} · ${person.designationName || '—'}`);
  doc.moveDown(0.7).fillColor('#111827');

  section(doc, 'Salary structure');
  row(doc, 'Basic', currency(salary.basic));
  row(doc, 'HRA', currency(salary.hra));
  row(doc, 'Medical', currency(salary.medical));
  row(doc, 'Transport', currency(salary.transport));
  row(doc, 'Other', currency(salary.other));
  row(doc, 'Gross monthly salary', currency(salary.gross));

  section(doc, 'Attendance summary');
  row(doc, 'Working days', attendance.workingDays);
  row(doc, 'Active days', attendance.activeDays);
  row(doc, 'Present days', attendance.presentDays);
  row(doc, 'Late days', attendance.lateDays);
  row(doc, 'Half days', attendance.halfDays);
  row(doc, 'Absent days', attendance.absentDays);
  row(doc, 'Unpaid leave days', attendance.unpaidLeaveDays);
  row(doc, 'Paid leave days', attendance.paidLeaveDays);
  if (attendance.missingCheckoutDays) row(doc, 'Missing checkout days (paid as present)', attendance.missingCheckoutDays);

  section(doc, 'Earnings and deductions');
  row(doc, 'Prorated gross', currency(earnings.proratedGross));
  row(doc, 'Daily rate', currency(earnings.perDay));
  row(doc, 'Absent deduction', currency(deductions.absentAmount));
  row(doc, 'Unpaid leave deduction', currency(deductions.unpaidLeaveAmount));
  row(doc, 'Half-day deduction', currency(deductions.halfDayAmount));
  row(doc, 'Total deductions', currency(deductions.totalDeductions));
  row(doc, `Tax (${tax.slabLabel})`, currency(tax.monthlyTax));

  doc.moveDown(0.7).font('Helvetica-Bold').fontSize(15).fillColor('#172554')
    .text(`Net pay: ${currency(payslip.netPay)}`);
  if (payslip.netPay === 0 && earnings.proratedGross - deductions.totalDeductions - tax.monthlyTax < 0) {
    doc.moveDown(0.25).font('Helvetica').fontSize(9).fillColor('#64748b')
      .text('Net pay is shown as zero because deductions and tax exceeded earnings.');
  }
  const footer = payslip.payrollRun?.status === 'finalized'
    ? `System-generated. Finalized on ${finalizedAt ? new Date(finalizedAt).toLocaleDateString('en-PK') : 'date unavailable'}.`
    : 'Draft preview — this payroll has not been finalized.';
  doc.moveDown(1.2).font('Helvetica').fontSize(8).fillColor('#64748b').text(footer);
  doc.end();
  return doc;
}

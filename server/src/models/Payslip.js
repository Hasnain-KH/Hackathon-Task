import mongoose from 'mongoose';

const payslipSchema = new mongoose.Schema(
  {
    payrollRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    employeeSnapshot: {
      employeeCode: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      departmentName: { type: String, default: '' },
      designationName: { type: String, default: '' },
      dateOfJoining: { type: Date, required: true },
      dateOfLeaving: { type: Date },
    },
    salaryStructure: {
      basic: { type: Number, required: true },
      hra: { type: Number, required: true },
      medical: { type: Number, required: true },
      transport: { type: Number, required: true },
      other: { type: Number, required: true },
      gross: { type: Number, required: true },
    },
    attendance: {
      workingDays: { type: Number, required: true },
      activeDays: { type: Number, required: true },
      presentDays: { type: Number, required: true },
      lateDays: { type: Number, required: true },
      halfDays: { type: Number, required: true },
      absentDays: { type: Number, required: true },
      unpaidLeaveDays: { type: Number, required: true },
      paidLeaveDays: { type: Number, required: true },
      missingCheckoutDays: { type: Number, default: 0 },
    },
    earnings: {
      proratedGross: { type: Number, required: true },
      perDay: { type: Number, required: true },
    },
    deductions: {
      absentAmount: { type: Number, required: true },
      unpaidLeaveAmount: { type: Number, required: true },
      halfDayAmount: { type: Number, required: true },
      totalDeductions: { type: Number, required: true },
    },
    tax: {
      annualGross: { type: Number, required: true },
      annualTax: { type: Number, required: true },
      monthlyTax: { type: Number, required: true },
      slabLabel: { type: String, required: true },
    },
    netPay: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { transform: (_, result) => { delete result.__v; return result; } },
  },
);

payslipSchema.index({ payrollRunId: 1, employeeId: 1 }, { unique: true });

export default mongoose.model('Payslip', payslipSchema);

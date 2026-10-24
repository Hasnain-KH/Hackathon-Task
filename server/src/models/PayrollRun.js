import mongoose from 'mongoose';

const payrollRunSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft', required: true },
    workingDays: { type: Number, required: true, min: 0 },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    finalizedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalizedAt: { type: Date },
    totals: {
      employees: { type: Number, default: 0 },
      gross: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      net: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_, result) => { delete result.__v; return result; } },
  },
);

payrollRunSchema.index({ status: 1 });

export default mongoose.model('PayrollRun', payrollRunSchema);

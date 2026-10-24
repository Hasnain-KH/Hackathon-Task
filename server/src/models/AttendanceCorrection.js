import mongoose from 'mongoose';

const correctionSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true },
    requestType: {
      type: String,
      enum: ['fix_missing_checkin', 'fix_missing_checkout', 'mark_half_day', 'mark_present', 'mark_on_leave', 'mark_absent'],
      required: true,
    },
    reason: { type: String, required: true, minlength: 5 },
    requestedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewComment: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { transform: (_, result) => { delete result.__v; return result; } },
  },
);

correctionSchema.index({ status: 1, employeeId: 1 });

export default mongoose.model('AttendanceCorrection', correctionSchema);

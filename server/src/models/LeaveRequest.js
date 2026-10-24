import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    days: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, minlength: 5, maxlength: 500 },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    appliedAt: { type: Date, default: Date.now },
    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewComment: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { transform: (_, result) => { delete result.__v; return result; } },
  },
);

leaveRequestSchema.index({ employeeId:  1, startDate: 1, endDate: 1 });
leaveRequestSchema.index({ status: 1, startDate: 1 });
leaveRequestSchema.index({ leaveTypeId: 1, status: 1 });

export default mongoose.model('LeaveRequest', leaveRequestSchema);

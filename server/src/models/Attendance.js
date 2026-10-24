import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true },
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    status: {
      type: String,
      enum: ['present', 'late', 'half_day', 'missing_checkout', 'absent', 'on_leave'],
      default: 'present',
    },
    lateMinutes: { type: Number, default: 0 },
    workedMinutes: { type: Number, default: 0 },
    source: { type: String, enum: ['web', 'camera', 'correction'], default: 'web' },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number },
    },
    faceDetected: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    corrections: [{
      at: { type: Date, required: true },
      byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      reason: { type: String, required: true },
    }],
  },
  {
    timestamps: true,
    toJSON: { transform: (_, result) => { delete result.__v; return result; } },
  },
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);

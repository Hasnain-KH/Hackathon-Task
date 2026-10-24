import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    level: { type: String, enum: ['junior', 'mid', 'senior', 'lead', 'manager'], default: 'mid' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

designationSchema.index({ name: 1, departmentId: 1 }, { unique: true });

export default mongoose.model('Designation', designationSchema);

import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    dateOfBirth: { type: Date },
    dateOfJoining: { type: Date, required: true },
    employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'intern'], default: 'full_time' },
    status: { type: String, enum: ['active', 'probation', 'resigned', 'terminated'], default: 'active' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', required: true },
    reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    salary: {
      basic: { type: Number, required: true, min: 1 },
      hra: { type: Number, default: 0, min: 0 },
      medical: { type: Number, default: 0, min: 0 },
      transport: { type: Number, default: 0, min: 0 },
      other: { type: Number, default: 0, min: 0 },
    },
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { transform: (_, result) => { delete result.__v; return result; } },
  },
);

export default mongoose.model('Employee', employeeSchema);

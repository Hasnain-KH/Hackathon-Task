import mongoose from 'mongoose';

const companySettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'company_settings' },
  companyName: { type: String, required: true, trim: true },
  officeStart: { type: String, default: '09:00' },
  graceMinutes: { type: Number, default: 15 },
  halfDayThresholdHours: { type: Number, default: 5 },
  weekendDays: { type: [Number], default: [0, 6] },
  officeLat: { type: Number },
  officeLng: { type: Number },
  officeRadiusMeters: { type: Number, default: 150 },
  initializedAt: { type: Date, default: Date.now },
}, { timestamps: true });

companySettingsSchema.statics.getSingleton = function getSingleton() {
  return this.findById('company_settings');
};

const CompanySettings = mongoose.model('CompanySettings', companySettingsSchema);

export default CompanySettings;

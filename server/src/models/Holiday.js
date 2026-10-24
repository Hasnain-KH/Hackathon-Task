import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true, unique: true },
    isOptional: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model('Holiday', holidaySchema);

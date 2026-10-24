import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, minlength: 3, maxlength: 120, trim: true },
    body: { type: String, required: true, minlength: 3, maxlength: 2000, trim: true },
    audience: { type: String, enum: ['all', 'hr', 'admin', 'employee'], default: 'all' },
    pinned: { type: Boolean, default: false },
    postedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { transform: (_, result) => { delete result.__v; return result; } },
  },
);

announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ audience: 1 });

export default mongoose.model('Announcement', announcementSchema);

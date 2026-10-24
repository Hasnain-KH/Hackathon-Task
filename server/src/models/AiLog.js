import mongoose from 'mongoose';

const aiLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'hr', 'employee'], required: true },
    feature: { type: String, enum: ['chat', 'summary', 'smart_leave', 'policy'], required: true },
    prompt: { type: String, maxlength: 4000, default: '' },
    toolCalls: [{
      name: { type: String },
      args: { type: mongoose.Schema.Types.Mixed },
      ok: { type: Boolean },
      errorMsg: { type: String },
      durationMs: { type: Number },
    }],
    response: { type: String, maxlength: 8000, default: '' },
    model: { type: String, default: '' },
    tokensIn: { type: Number, default: 0 },
    tokensOut: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    status: { type: String, enum: ['ok', 'error', 'timeout', 'rate_limited', 'provider_unavailable'], required: true },
    error: { type: String, default: '' },
  },
  { timestamps: true },
);

aiLogSchema.index({ userId: 1, createdAt: -1 });
aiLogSchema.index({ createdAt: -1 });

export default mongoose.model('AiLog', aiLogSchema);

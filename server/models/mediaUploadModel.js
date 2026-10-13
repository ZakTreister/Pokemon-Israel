import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    purpose: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadKey: { type: String, required: true },
    storageKey: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'verifying', 'verified'],
      default: 'pending',
    },
    consumed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('MediaUpload', schema);

import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: { type: String, enum: ['all-stars', 'rankings'] },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  subtitle: { type: String, default: '', maxlength: 5000 },
  bodyHtml: { type: String, default: '', maxlength: 50000 },
}, { timestamps: true });

export default mongoose.model('StaticPageText', schema);

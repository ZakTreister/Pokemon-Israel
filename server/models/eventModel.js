import mongoose from 'mongoose';
import { mediaSchema, publicMediaUrl } from '../services/storage/mediaMetadata.js';
import { mediaAssetSchema, publicAssets } from './mediaAssetSchema.js';
const fixtureSchema = new mongoose.Schema({
  firstTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  secondTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  date: { type: Date, required: true },
  location: { type: String, maxlength: 200, default: '' },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
}, { _id: true });
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, default: '', maxlength: 5000 },
  category: { type: String, enum: ['club', 'all_stars'], required: true },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  featured: { type: Boolean, default: false },
  openingRound: { type: Boolean, default: false },
  coverMedia: { type: mediaSchema, default: null },
  mediaItems: { type: [mediaAssetSchema], default: [] },
  fixtures: { type: [fixtureSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
eventSchema.index({ status: 1, category: 1, startDate: 1 });
eventSchema.set('toJSON', { transform: (doc, ret) => {
  ret.id = String(doc._id);
  ret.coverUrl = publicMediaUrl(doc.coverMedia);
  ret.mediaItems = publicAssets(doc.mediaItems || []);
  ret.fixtures = (doc.fixtures || []).map(f => ({
    id: String(f._id), firstTeam: String(f.firstTeam),
    secondTeam: String(f.secondTeam), date: f.date, location: f.location,
    tournamentId: f.tournament ? String(f.tournament) : null,
  }));
  delete ret._id; delete ret.__v; delete ret.createdBy; delete ret.coverMedia;
  return ret;
}});
export default mongoose.model('Event', eventSchema);

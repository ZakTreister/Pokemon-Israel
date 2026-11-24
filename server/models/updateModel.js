import {
  mediaSchema,
  publicMediaUrl,
} from '../services/storage/mediaMetadata.js';
import mongoose from 'mongoose';
import { mediaAssetSchema, publicAssets } from './mediaAssetSchema.js';

const updateSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null, index: true },
    mediaItems: { type:[mediaAssetSchema], default:[] },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    imageMedia: { type: mediaSchema, default: null },
    ctaText: { type: String, default: '', trim: true },
    ctaUrl: { type: String, default: '', trim: true },
    content: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Transform _id to id and remove __v when converting to JSON
updateSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    ret.eventId = ret.eventId ? String(ret.eventId) : null;
    ret.description = ret.content || '';
    ret.image = publicMediaUrl(doc.imageMedia);
    ret.mediaItems = publicAssets(doc.mediaItems || []);
    delete ret.imageMedia;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Update = mongoose.model('Update', updateSchema);
export default Update;

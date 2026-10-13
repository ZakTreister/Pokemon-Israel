import {
  mediaSchema,
  publicMediaUrl,
} from '../services/storage/mediaMetadata.js';
import mongoose from 'mongoose';

const updateSchema = new mongoose.Schema(
  {
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
    ret.description = ret.content || '';
    ret.image = publicMediaUrl(doc.imageMedia);
    delete ret.imageMedia;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Update = mongoose.model('Update', updateSchema);
export default Update;

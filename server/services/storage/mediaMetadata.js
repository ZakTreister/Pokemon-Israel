import mongoose from 'mongoose';
export const mediaSchema = new mongoose.Schema(
  {
    storageKey: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);
export function publicMediaUrl(media) {
  if (!media?.storageKey?.startsWith('public/')) return '';
  const base =
    process.env.MEDIA_BASE_URL || 'https://d1grgd8g6bpbb7.cloudfront.net';
  return `${base.replace(/\/$/, '')}/${media.storageKey.slice(7).split('/').map(encodeURIComponent).join('/')}`;
}

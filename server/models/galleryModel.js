import mongoose from 'mongoose';
import {mediaAssetSchema,publicAssets} from './mediaAssetSchema.js';
export const galleryId='000000000000000000000001';
export const galleryDefaults={title:'גלריה',subtitle:'תמונות וסרטונים מהאירועים ומהליגה'};
const schema=new mongoose.Schema({title:{type:String,default:galleryDefaults.title,maxlength:180},subtitle:{type:String,default:galleryDefaults.subtitle,maxlength:5000},mediaItems:{type:[mediaAssetSchema],default:[]}}, {timestamps:true});
schema.set('toJSON',{transform(doc,ret){ret.id=String(doc._id);ret.mediaItems=publicAssets(doc.mediaItems);delete ret._id;delete ret.__v;return ret;}});
export default mongoose.model('Gallery',schema);

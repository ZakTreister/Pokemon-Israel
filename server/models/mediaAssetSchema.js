import mongoose from 'mongoose';
import { mediaSchema, publicMediaUrl } from '../services/storage/mediaMetadata.js';
export const mediaAssetSchema = new mongoose.Schema({
  kind: {type:String,enum:['image','video','youtube'],required:true},
  media: {type:mediaSchema,default:null},
  youtubeId: {type:String,default:''},
  caption: {type:String,maxlength:240,default:''},
}, {_id:true});
export function publicAssets(items=[]){
  return items.map(a=>({
    id:String(a._id),kind:a.kind,caption:a.caption||'',
    url:a.kind==='youtube'?`https://www.youtube-nocookie.com/embed/${a.youtubeId}`:publicMediaUrl(a.media),
    ...(a.kind==='youtube'?{youtubeId:a.youtubeId}:{})
  }));
}

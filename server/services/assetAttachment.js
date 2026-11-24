import MediaUpload from '../models/mediaUploadModel.js';
import { fail } from '../utils/httpError.js';
const idOK=x=>typeof x==='string'&&/^[a-f0-9]{24}$/i.test(x);
export function youtubeId(url){
 if(typeof url!=='string') fail(400,'קישור YouTube לא תקין');
 let u;try{u=new URL(url)}catch{fail(400,'קישור YouTube לא תקין')}
 if(u.protocol!=='https:' || u.username || u.password || u.port) fail(400,'יש להזין קישור YouTube מאובטח');
 const h=u.hostname.toLowerCase();
 let id='';
 if(h==='youtu.be') id=u.pathname.split('/')[1]||'';
 else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(h)){
  if(u.pathname==='/watch') id=u.searchParams.get('v')||'';
  else if(/^\/(shorts|embed)\//.test(u.pathname)) id=u.pathname.split('/')[2]||'';
 } else fail(400,'ניתן לקשר לסרטוני YouTube בלבד');
 if(!/^[A-Za-z0-9_-]{11}$/.test(id)) fail(400,'מזהה הסרטון אינו תקין');
 return id;
}
export async function attachAsset(req,owner,purpose){
 const {uploadId,youtubeUrl,caption='',cover=false}=req.body;
 if(typeof caption!=='string'||caption.length>240) fail(400,'כיתוב ארוך מדי');
 if(cover!==false&&cover!==true) fail(400,'סימון תמונת שער לא חוקי');
 if(Boolean(uploadId)===Boolean(youtubeUrl)) fail(400,'יש לבחור סרטון YouTube או קובץ אחד');
 let item,grant;
 if(youtubeUrl){if(cover) fail(400,'תמונת שער חייבת להיות תמונה');item={kind:'youtube',youtubeId:youtubeId(youtubeUrl),caption};}
 else {
  if(!idOK(uploadId)) fail(400,'מזהה העלאה לא חוקי');
  grant=await MediaUpload.findOne({_id:uploadId,entityId:owner._id,createdBy:req.user._id,
   purpose,status:'verified',consumed:false,expiresAt:{$gt:new Date()}});
  if(!grant || !grant.storageKey.startsWith((purpose==='event-media'?'public/events/':'public/updates/')+owner.id+'/'))
    fail(400,'קובץ לא אומת עבור הרשומה הזו');
  // Prevent attaching video grants created before image-only upload enforcement.
  if (!['image/jpeg','image/png','image/webp'].includes(grant.contentType)) fail(400,'ניתן להעלות תמונות בלבד. לסרטון הוסיפו קישור YouTube');
  item={kind:'image',media:{storageKey:grant.storageKey,contentType:grant.contentType,size:grant.size},caption};
 }
 owner.mediaItems.push(item);
 if(cover) owner.coverMedia=item.media;
 await owner.save();
 if(grant) await MediaUpload.updateOne({_id:grant._id},{$set:{consumed:true}});
 return owner;
}
export async function removeAsset(owner,assetId){
 if(!idOK(assetId)) fail(404,'פריט המדיה לא נמצא');
 const item=owner.mediaItems.id(assetId);
 if(!item) fail(404,'פריט המדיה לא נמצא');
 const key=item.media?.storageKey;
 item.deleteOne();
 if(owner.coverMedia?.storageKey===key) owner.coverMedia=null;
 await owner.save();
 return owner;
}

import { useState } from 'react';
import api from '../../services/api';
import { uploadImage } from '../../services/media';
import type { EventMedia } from '../../types/event';
import { MediaGallery } from './MediaGallery';
import Button from '../ui/Button';
import { requestError } from '../../utils/requestError';
export default function MediaManager({owner,id,items,onChanged}:{owner:'event'|'update'|'content-page'|'gallery';id:string;items:EventMedia[];onChanged:()=>Promise<void>}){
 const [local,setLocal]=useState(items),[file,setFile]=useState<File|null>(null),[youtubeUrl,setYoutubeUrl]=useState(''),[caption,setCaption]=useState(''),[cover,setCover]=useState(false),[showInGallery,setShowInGallery]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState(0);
 const path=owner==='event'?'events':owner==='update'?'updates':owner==='gallery'?'gallery':'content-pages';
 const add=async()=>{if(!file&&!youtubeUrl)return;setBusy(true);setError('');
 try{
 let uploadId:string|undefined;
 if(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024||file.size===0) throw new Error('יש לבחור תמונה מסוג JPEG, PNG או WebP עד 5MB');
  const uploaded=await uploadImage(file,{purpose:owner==='event'?'event-media':owner==='update'?'update-media':owner==='gallery'?'gallery-media':'content-page-media',entityId:id},setProgress);
  uploadId=uploaded.uploadId;
 }
 const {data}=await api.post<{mediaItems:EventMedia[]}>(`/api/${path}/${id}/media`,{uploadId,youtubeUrl:youtubeUrl||undefined,caption,showInGallery:owner==='gallery'||showInGallery,cover:owner==='event'&&cover});
 setLocal(data.mediaItems);setFile(null);setYoutubeUrl('');setCaption('');setCover(false);setShowInGallery(false);await onChanged();
 }catch(e){setError(requestError(e));}finally{setBusy(false);setProgress(0);}};
 const remove=async(assetId:string)=>{setBusy(true);setError('');try{const {data}=await api.delete<{mediaItems:EventMedia[]}>(`/api/${path}/${id}/media/${assetId}`);setLocal(data.mediaItems);await onChanged();}catch(e){setError(requestError(e));}finally{setBusy(false);}};
 const changeVisibility=async(assetId:string,value:boolean)=>{setBusy(true);setError('');try{const {data}=await api.put<{mediaItems:EventMedia[]}>(`/api/${path}/${id}/media/${assetId}`,{showInGallery:value});setLocal(data.mediaItems);await onChanged();}catch(e){setError(requestError(e));}finally{setBusy(false);}};
 return <div className="space-y-3">
 <MediaGallery items={local}/>
 <label className="block">בחר תמונה (עד 5MB)<input type="file" accept="image/png,image/jpeg,image/webp" className="block w-full mt-1" disabled={busy} onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
 <label className="block">או הוסף קישור לסרטון YouTube<input type="url" placeholder="https://www.youtube.com/watch?v=..." className="block border p-2 rounded-md w-full" value={youtubeUrl} disabled={busy||!!file} onChange={e=>setYoutubeUrl(e.target.value)}/></label>
 <label className="block">כיתוב<input maxLength={240} className="block border p-2 rounded-md w-full" value={caption} onChange={e=>setCaption(e.target.value)}/></label>
 {owner==='event'&&<label className="flex gap-2"><input type="checkbox" checked={cover} disabled={busy} onChange={e=>setCover(e.target.checked)}/> השתמש בתמונה כתמונת שער</label>}
 {owner!=='gallery'&&<label className="flex gap-2"><input type="checkbox" checked={showInGallery} disabled={busy} onChange={e=>setShowInGallery(e.target.checked)}/> הצג בגלריה</label>}
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 <p role="status" className="text-sm">{busy?`מעלה ושומר... ${progress}%`:''}</p>
 <Button type="button" disabled={busy||(!file&&!youtubeUrl)||Boolean(file&&youtubeUrl)} onClick={()=>void add()}>הוסף למדיה</Button>
 {local.map(item=><div key={item.id} className="flex justify-between items-center gap-2"><span className="text-sm truncate">{item.caption||item.kind}</span>{owner!=='gallery'&&<label className="flex gap-2 text-sm"><input type="checkbox" checked={!!item.showInGallery} disabled={busy} onChange={e=>void changeVisibility(item.id,e.target.checked)}/> בגלריה</label>}<Button type="button" disabled={busy} size="sm" variant="outline" onClick={()=>void remove(item.id)}>הסר</Button></div>)}
 </div>;
}

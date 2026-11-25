import {useEffect,useState} from 'react';
import api from '../../services/api';
import type {Gallery} from '../../types/gallery';
import MediaManager from '../../components/media/MediaManager';
import Button from '../../components/ui/Button';
import {requestError} from '../../utils/requestError';
export default function ManageGallery(){const [gallery,setGallery]=useState<Gallery|null>(null),[title,setTitle]=useState(''),[subtitle,setSubtitle]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
const reload=async()=>{const {data}=await api.get<Gallery>('/api/gallery/management');setGallery(data);};
useEffect(()=>{api.get<Gallery>('/api/gallery/management').then(({data})=>{setGallery(data);setTitle(data.title);setSubtitle(data.subtitle)}).catch(e=>setError(requestError(e)));},[]);
const save=async()=>{setBusy(true);setError('');setMessage('');try{const {data}=await api.put<Gallery>('/api/gallery/management',{title,subtitle});setGallery(data);setMessage('הכותרות נשמרו');}catch(e){setError(requestError(e));}finally{setBusy(false);}};
return <div className="space-y-5"><h2 className="text-2xl font-bold">ניהול הגלריה</h2>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}{gallery&&<><form className="space-y-3" onSubmit={e=>{e.preventDefault();void save()}}><label className="block">כותרת<input required maxLength={180} className="block w-full border rounded p-2" value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="block">כותרת משנה<textarea maxLength={5000} className="block w-full border rounded p-2" value={subtitle} onChange={e=>setSubtitle(e.target.value)}/></label><Button type="submit" disabled={busy}>שמור כותרות</Button></form><h3 className="font-bold">מדיה שהועלתה ישירות לגלריה</h3><p className="text-sm text-muted-foreground">מדיה מאירועים, עדכונים ועמודי תוכן תופיע לפי הסימון ברשומת המקור.</p><MediaManager owner="gallery" id={gallery.id} items={gallery.mediaItems} onChanged={reload}/></>}</div>}

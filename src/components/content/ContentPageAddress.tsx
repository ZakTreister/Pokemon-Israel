import { useState } from 'react';
import { Copy } from 'lucide-react';
import Button from '../ui/Button';

export default function ContentPageAddress({id,published}:{id:string;published:boolean}){
 const url=(typeof window==='undefined'?'https://cardschool.co.il':window.location.origin)+'/content/'+encodeURIComponent(id);
 const [message,setMessage]=useState('');
 const copy=async()=>{
  try {
   await navigator.clipboard.writeText(url);
   setMessage('הכתובת הועתקה');
  } catch {
   setMessage('לא ניתן להעתיק אוטומטית. אפשר לסמן ולהעתיק את הכתובת המוצגת.');
  }
 };
 return <div className="min-w-0 space-y-1">
  <div className="flex flex-wrap items-center gap-2">
   <label className="min-w-0 flex-1 text-sm">כתובת העמוד<input readOnly dir="ltr" className="block w-full min-w-0 border rounded bg-card p-2 text-sm" value={url} onFocus={e=>e.currentTarget.select()}/></label>
   <Button type="button" variant="outline" size="sm" className="self-end" onClick={()=>void copy()}><Copy size={16} className="me-1"/>העתק כתובת</Button>
  </div>
  {!published&&<p className="text-xs text-muted-foreground">הכתובת תהיה נגישה לציבור לאחר פרסום העמוד.</p>}
  <p role="status" className="text-xs">{message}</p>
 </div>;
}

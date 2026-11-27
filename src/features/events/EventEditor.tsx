import { useState } from 'react';
import RichHtmlField from '../../components/content/RichHtmlField';
import type { FormEvent } from 'react';
import type { EventInput,EventSummary } from '../../types/event';
import Button from '../../components/ui/Button';
export default function EventEditor({initial,onSave,busy}:{initial?:EventSummary;onSave:(data:EventInput)=>Promise<void>;busy:boolean}){
 const [data,setData]=useState<EventInput>({title:initial?.title||'',description:initial?.description||'',bodyHtml:initial?.bodyHtml||'',showInFieldNews:!!initial?.showInFieldNews,category:initial?.category||'club',status:initial?.status||'draft',featured:initial?.featured||false,openingRound:initial?.openingRound||false,startDate:initial?.startDate||null,endDate:initial?.endDate||null});
 const [error,setError]=useState('');
 const save=async(e:FormEvent)=>{e.preventDefault();setError('');try{await onSave(data);}catch(e){setError(e instanceof Error?e.message:'לא ניתן לשמור את האירוע');}};
 return <form onSubmit={e=>void save(e)} className="grid gap-3 w-full">
 <label>שם האירוע<input required maxLength={180} className="block w-full p-3 border rounded-md bg-card" value={data.title} onChange={e=>setData({...data,title:e.target.value})}/></label>
 <label>כותרת משנה (להירו)<textarea maxLength={5000} rows={4} className="block w-full p-3 border rounded-md bg-card" value={data.description} onChange={e=>setData({...data,description:e.target.value})}/></label>
 <RichHtmlField label="תוכן עשיר של האירוע" value={data.bodyHtml||''} onChange={bodyHtml=>setData({...data,bodyHtml})}/>
 <p className="text-sm text-muted-foreground">תוכן זה יוצג בעמוד האירוע הציבורי מיד מתחת להירו ולפני העדכונים.</p>
 <label className="flex gap-2"><input type="checkbox" checked={!!data.showInFieldNews} onChange={e=>setData({...data,showInFieldNews:e.target.checked})}/> הצג בחדשות מהשטח</label>
 <label>סוג<select disabled={!!initial} className="block w-full p-3 border rounded-md bg-card" value={data.category} onChange={e=>setData({...data,category:e.target.value as EventInput['category'],openingRound:false})}><option value="club">חוגים</option><option value="all_stars">אולסטארז</option></select></label>
 {(['startDate','endDate'] as const).map(key=><label key={key}>{key==='startDate'?'תאריך התחלה':'תאריך סיום'}<input type="date" className="block w-full p-3 border rounded-md bg-card" value={data[key]?.slice(0,10)||''} onChange={e=>setData({...data,[key]:e.target.value||null})}/></label>)}
 <label>פרסום<select className="block w-full p-3 border rounded-md bg-card" value={data.status} onChange={e=>setData({...data,status:e.target.value as EventInput['status']})}><option value="draft">טיוטה</option><option value="published">מפורסם</option></select></label>
 <label className="flex gap-2 items-center"><input type="checkbox" checked={data.featured} onChange={e=>setData({...data,featured:e.target.checked})}/> הבלט בדף הבית</label>
 {data.category==='all_stars'&&<label className="flex gap-2 items-center"><input type="checkbox" checked={!!data.openingRound} onChange={e=>setData({...data,openingRound:e.target.checked})}/> מחזור פתיחת הליגה</label>}
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 <Button type="submit" disabled={busy}>{busy?'שומר...':'שמור אירוע'}</Button></form>;
}

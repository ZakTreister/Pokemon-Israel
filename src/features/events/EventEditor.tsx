import { useEffect,useState } from 'react';
import RichHtmlField from '../../components/content/RichHtmlField';
import {contentPagesService} from '../../services/contentPages';
import type {ContentPage} from '../../types/contentPage';
import type { FormEvent } from 'react';
import type { EventInput,EventSummary } from '../../types/event';
import Button from '../../components/ui/Button';
export default function EventEditor({initial,onSave,busy}:{initial?:EventSummary;onSave:(data:EventInput)=>Promise<void>;busy:boolean}){
 const [data,setData]=useState<EventInput>({title:initial?.title||'',description:initial?.description||'',bodyHtml:initial?.bodyHtml||'',contentPageIds:initial?.contentPageIds||[],showInFieldNews:!!initial?.showInFieldNews,category:initial?.category||'club',status:initial?.status||'draft',featured:initial?.featured||false,openingRound:initial?.openingRound||false,startDate:initial?.startDate||null,endDate:initial?.endDate||null});
 const [error,setError]=useState('');
 const [pages,setPages]=useState<ContentPage[]>([]);
 useEffect(()=>{let active=true;contentPagesService.manage().then(rows=>{if(active)setPages(Array.isArray(rows)?rows:[])}).catch(()=>{});return()=>{active=false};},[]);
 const save=async(e:FormEvent)=>{e.preventDefault();setError('');try{await onSave(data);}catch(e){setError(e instanceof Error?e.message:'לא ניתן לשמור את האירוע');}};
 return <form onSubmit={e=>void save(e)} className="grid gap-3 max-w-xl">
 <label>שם האירוע<input required maxLength={180} className="block w-full p-3 border rounded-md bg-card" value={data.title} onChange={e=>setData({...data,title:e.target.value})}/></label>
 <label>כותרת משנה (להירו)<textarea maxLength={5000} rows={4} className="block w-full p-3 border rounded-md bg-card" value={data.description} onChange={e=>setData({...data,description:e.target.value})}/></label>
 <RichHtmlField value={data.bodyHtml||''} onChange={bodyHtml=>setData({...data,bodyHtml})}/>
 <fieldset className="space-y-2 border rounded-md p-3"><legend className="font-bold">עמודי תוכן משויכים</legend>{pages.map(page=><label key={page.id} className="flex gap-2"><input type="checkbox" checked={data.contentPageIds?.includes(page.id)||false} onChange={e=>setData({...data,contentPageIds:e.target.checked?[...(data.contentPageIds||[]),page.id]:(data.contentPageIds||[]).filter(id=>id!==page.id)})}/>{page.title}{page.status==='draft'?' (טיוטה)':''}</label>)}{!pages.length&&<p className="text-sm">אין עמודים לבחירה.</p>}</fieldset>
 <label className="flex gap-2"><input type="checkbox" checked={!!data.showInFieldNews} onChange={e=>setData({...data,showInFieldNews:e.target.checked})}/> הצג בחדשות מהשטח</label>
 <label>סוג<select disabled={!!initial} className="block w-full p-3 border rounded-md bg-card" value={data.category} onChange={e=>setData({...data,category:e.target.value as EventInput['category'],openingRound:false})}><option value="club">חוגים</option><option value="all_stars">אולסטארז</option></select></label>
 {(['startDate','endDate'] as const).map(key=><label key={key}>{key==='startDate'?'תאריך התחלה':'תאריך סיום'}<input type="date" className="block w-full p-3 border rounded-md bg-card" value={data[key]?.slice(0,10)||''} onChange={e=>setData({...data,[key]:e.target.value||null})}/></label>)}
 <label>פרסום<select className="block w-full p-3 border rounded-md bg-card" value={data.status} onChange={e=>setData({...data,status:e.target.value as EventInput['status']})}><option value="draft">טיוטה</option><option value="published">מפורסם</option></select></label>
 <label className="flex gap-2 items-center"><input type="checkbox" checked={data.featured} onChange={e=>setData({...data,featured:e.target.checked})}/> הבלט בדף הבית</label>
 {data.category==='all_stars'&&<label className="flex gap-2 items-center"><input type="checkbox" checked={!!data.openingRound} onChange={e=>setData({...data,openingRound:e.target.checked})}/> מחזור פתיחת הליגה</label>}
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 <Button type="submit" disabled={busy}>{busy?'שומר...':'שמור אירוע'}</Button></form>;
}

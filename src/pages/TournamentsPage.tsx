import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsService } from '../services/events';
import type { EventSummary,EventCategory } from '../types/event';
import { PageHero } from '../components/ui/PageHero';
import Pagination from '../components/ui/Pagination';
import Button from '../components/ui/Button';
import { requestError } from '../utils/requestError';
export default function TournamentsPage(){
 const [category,setCategory]=useState<EventCategory|'all'>('all'),[page,setPage]=useState(1);
 const [items,setItems]=useState<EventSummary[]>([]),[total,setTotal]=useState(0),[pages,setPages]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setError('');
 eventsService.list({page,pageSize:12,...(category==='all'?{}:{category})}).then(data=>{if(active){setItems(data.items);setTotal(data.total);setPages(data.totalPages);}}).catch(e=>{if(active)setError(requestError(e));}).finally(()=>{if(active)setLoading(false);});
 return ()=>{active=false};},[category,page]);
 return <div><PageHero title="אירועים" highlightWord="אירועים" subtitle="כל האירועים, המשחקים, התמונות והסיפורים של הליגה"/>
 <div className="container py-10 space-y-6">
 <nav aria-label="סינון אירועים" className="flex flex-wrap gap-2">{([['all','הכול'],['club','אירועי הליגה הישראלית'],['all_stars','אירועי האולסטארז']] as const).map(([key,label])=><Button key={key} variant={category===key?'secondary':'outline'} onClick={()=>{setCategory(key);setPage(1);}}>{label}</Button>)}</nav>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {loading?<p role="status">טוען אירועים...</p>:<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
 {items.map(ev=><article key={ev.id} className="cs-public-card overflow-hidden flex flex-col">
 {ev.coverUrl?<img src={ev.coverUrl} alt="" className="w-full aspect-video object-cover" loading="lazy"/>:<div className="bg-navy-700 text-gold aspect-video grid place-items-center font-black text-3xl" aria-hidden="true">CardSchool</div>}
 <div className="p-5 flex-1 flex flex-col gap-3">
 <p className="text-blue-500 font-bold text-sm">{ev.category==='club'?'חוגים':'אולסטארז'}{ev.startDate?' · '+new Date(ev.startDate).toLocaleDateString('he-IL'):''}</p>
 <h2 className="font-black text-xl">{ev.title}</h2>
 <p className="text-muted-foreground line-clamp-3">{ev.description}</p>
 <Button asChild variant="outline" className="mt-auto"><Link to={'/events/'+ev.id}>{ev.category==='all_stars'?'למשחקים ולעדכונים':/מחנ[הו]/.test(ev.title)?'לפרטי המחנה ולהרשמה':/טורניר/.test(ev.title)?'לפרטי הטורניר ולהרשמה':'לפרטי האירוע'}</Link></Button>
 </div></article>)}</div>}
 {!loading&&!items.length&&!error&&<p>עדיין אין אירועים בסינון זה.</p>}
 <Pagination page={page} totalPages={pages} total={total} onChange={setPage} busy={loading}/>
 </div></div>;
}

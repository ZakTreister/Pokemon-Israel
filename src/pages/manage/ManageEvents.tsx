import { useEffect,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import EventEditor from '../../features/events/EventEditor';
import { eventsService } from '../../services/events';
import type { EventSummary,EventInput } from '../../types/event';
import { requestError } from '../../utils/requestError';
export default function ManageEvents(){
 const [list,setList]=useState<EventSummary[]>([]),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const navigate=useNavigate();
 useEffect(()=>{eventsService.manage().then(setList).catch(e=>setError(requestError(e)))},[]);
 const create=async(data:EventInput)=>{setBusy(true);try{const r=await eventsService.create(data);navigate('/manage/events/'+r.id);}catch(e){setError(requestError(e));throw e;}finally{setBusy(false);}};
 return <div className="space-y-4"><header className="flex justify-between gap-3 flex-wrap"><h2 className="text-2xl font-bold">ניהול אירועים</h2><Button onClick={()=>setCreating(!creating)}>{creating?'ביטול':'אירוע חדש'}</Button></header>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {creating&&<EventEditor onSave={create} busy={busy}/>}
 {list.map(ev=><article key={ev.id} className="flex justify-between items-center border rounded-lg p-4 gap-3"><div><strong>{ev.title}</strong><p className="text-sm text-muted-foreground">{ev.category==='club'?'חוגים':'אולסטארז'} · {ev.status==='published'?'מפורסם':'טיוטה'}</p></div><Button asChild variant="outline" size="sm"><Link to={'/manage/events/'+ev.id}>ניהול האירוע</Link></Button></article>)}
 {!list.length&&!error&&<p>אין אירועים.</p>}</div>;
}

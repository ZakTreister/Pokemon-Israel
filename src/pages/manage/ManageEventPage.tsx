import { useCallback,useEffect,useState } from 'react';
import { Link,useNavigate,useParams } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import EventEditor from '../../features/events/EventEditor';
import FixtureEditor from '../../features/events/FixtureEditor';
import MediaManager from '../../components/media/MediaManager';
import UpdateEditDialog from '../../features/updates/components/UpdateEditDialog';
import { eventsService } from '../../services/events';
import type { EventDetails,EventInput } from '../../types/event';
import type { Update } from '../../types/update';
import type { PublicTournamentSummary } from '../../services/publicTournaments';
import { requestError } from '../../utils/requestError';
export default function ManageEventPage(){
 const {id=''}=useParams(),navigate=useNavigate();
 const [event,setEvent]=useState<EventDetails|null>(null),[available,setAvailable]=useState<PublicTournamentSummary[]>([]),[selected,setSelected]=useState('');
 const [editing,setEditing]=useState<Update|null|undefined>(undefined),[showEdit,setShowEdit]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const reload=useCallback(async()=>setEvent(await eventsService.getManaged(id)),[id]);
 useEffect(()=>{reload().catch(e=>setError(requestError(e)));api.get<{items:PublicTournamentSummary[]}>('/api/tournaments/management',{params:{pageSize:100}}).then(r=>setAvailable(r.data.items)).catch(()=>{});},[reload]);
 const save=async(data:EventInput)=>{setBusy(true);try{await eventsService.update(id,data);await reload();setShowEdit(false);}catch(e){setError(requestError(e));throw e;}finally{setBusy(false);}};
 const link=async()=>{if(!selected)return;setBusy(true);try{await eventsService.link(id,selected);await reload();setSelected('');}catch(e){setError(requestError(e));}finally{setBusy(false);}};
 const unlink=async(tid:string)=>{setBusy(true);try{await eventsService.unlink(id,tid);await reload();}catch(e){setError(requestError(e));}finally{setBusy(false);}};
 const remove=async()=>{if(!window.confirm('למחוק אירוע? יש להסיר קודם שיוכי טורנירים ועדכונים.'))return;setBusy(true);try{await eventsService.remove(id);navigate('/manage/events');}catch(e){setError(requestError(e));setBusy(false);}};
 if(!event)return <p role="status">{error||'טוען אירוע...'}</p>;
 const eligible=available.filter(t=>t.type!=='team_internal'&&(!t.eventId||t.eventId===id)&&(event.category==='club'?t.type==='quarterly':t.type==='inter_team'));
 return <div className="space-y-6">
 <header className="flex justify-between items-center flex-wrap gap-3"><div><h2 className="text-2xl font-bold">{event.title}</h2><p>{event.status==='draft'?'טיוטה':'מפורסם'}</p></div><Button variant="outline" onClick={()=>setShowEdit(!showEdit)}>ערוך פרטי אירוע</Button></header>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {showEdit&&<EventEditor initial={event} busy={busy} onSave={save}/>}
 {event.status==='published'&&<Link className="text-blue-500" to={'/events/'+id}>צפייה באתר הציבורי ←</Link>}
 <section className="border rounded-lg p-4 space-y-3"><h3 className="text-xl font-bold">טורנירי האירוע</h3>
 {event.tournaments.map(t=><div key={t.id} className="flex gap-3 justify-between items-center"><Link className="text-blue-500" to={'/tournaments/'+t.id}>{t.title}</Link><Button size="sm" variant="outline" disabled={busy} onClick={()=>void unlink(t.id)}>הסר שיוך</Button></div>)}
 <div className="flex gap-2 flex-wrap"><select aria-label="בחר טורניר" className="border rounded p-2 bg-card" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">בחר טורניר קיים</option>{eligible.map(t=><option value={t.id} key={t.id}>{t.title}</option>)}</select>
 <Button disabled={!selected||busy} onClick={()=>void link()}>שייך</Button>
 <Button asChild variant="outline"><Link to={event.category==='club'?'/manage/tournaments/regular?eventId='+id:'/manage/tournaments'}>צור טורניר</Link></Button></div>
 </section>
 {event.category === "all_stars" && <section className="border rounded-lg p-4 space-y-3"><h3 className="text-xl font-bold">תכנון מפגשים</h3><FixtureEditor eventId={id} fixtures={event.fixtures} onSaved={reload}/></section>}
 <section className="border rounded-lg p-4 space-y-3"><div className="flex justify-between items-center"><h3 className="text-xl font-bold">עדכוני האירוע</h3><Button onClick={()=>setEditing(null)}>עדכון חדש</Button></div>
 {event.updates.map(u=><div key={u.id} className="flex justify-between items-center"><span>{u.title}</span><Button variant="outline" size="sm" onClick={()=>setEditing(u)}>ערוך</Button></div>)}
 {editing!==undefined&&<UpdateEditDialog update={editing||undefined} defaultEventId={id} onSaved={reload} onClose={()=>setEditing(undefined)}/>}
 </section>
 <section className="border rounded-lg p-4 space-y-3"><h3 className="text-xl font-bold">תמונות וסרטונים</h3><MediaManager owner="event" id={id} items={event.mediaItems} onChanged={reload}/></section>
 <Button disabled={busy} variant="destructive" onClick={()=>void remove()}>מחק אירוע</Button>
 </div>;
}

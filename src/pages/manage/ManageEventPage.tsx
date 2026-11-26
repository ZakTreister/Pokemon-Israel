import { useCallback,useEffect,useState } from 'react';
import { Link,useNavigate,useParams } from 'react-router-dom';
import api from '../../services/api';
import AdminTournaments from '../admin/AdminTournaments';
import Modal from '../../components/ui/Modal';
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
 const [createDialog,setCreateDialog]=useState(false);
 const reload=useCallback(async()=>setEvent(await eventsService.getManaged(id)),[id]);
 useEffect(()=>{reload().catch(e=>setError(requestError(e)));api.get<{items:PublicTournamentSummary[]}>('/api/tournaments/management',{params:{pageSize:100}}).then(r=>setAvailable(r.data.items)).catch(()=>{});},[reload]);
 const competitionSaved=async()=>{setCreateDialog(false);try{await reload();}catch(e){setError(requestError(e));}};
 const save=async(data:EventInput)=>{setBusy(true);try{await eventsService.update(id,data);await reload();setShowEdit(false);}catch(e){setError(requestError(e));throw e;}finally{setBusy(false);}};
 const link=async()=>{if(!selected)return;setBusy(true);try{await eventsService.link(id,selected);await reload();setSelected('');}catch(e){setError(requestError(e));}finally{setBusy(false);}};
 const unlink=async(tid:string)=>{setBusy(true);try{await eventsService.unlink(id,tid);await reload();}catch(e){setError(requestError(e));}finally{setBusy(false);}};
 const convertLegacyFixture=async(f:{id:string;firstTeam:string;secondTeam:string})=>{
   setBusy(true);setError('');try{
     const {data}=await api.post<{id:string}>('/api/inter-team',{teamIds:[f.firstTeam,f.secondTeam],eventId:id,fixtureId:f.id});
     if(data.id)await reload();
   }catch(e){setError(requestError(e));}finally{setBusy(false);}
 };
 const remove=async()=>{if(!window.confirm('למחוק אירוע? יש להסיר קודם שיוכי טורנירים ועדכונים.'))return;setBusy(true);try{await eventsService.remove(id);navigate('/manage/events');}catch(e){setError(requestError(e));setBusy(false);}};
 if(!event)return <p role="status">{error||'טוען אירוע...'}</p>;
 const eligible=available.filter(t=>t.type!=='team_internal'&&(!t.eventId||t.eventId===id)&&(event.category==='club'?t.type==='quarterly':t.type==='inter_team'));
 return <div className="space-y-6">
 <header className="flex justify-between items-center flex-wrap gap-3"><div><h2 className="text-2xl font-bold">{event.title}</h2><p>{event.status==='draft'?'טיוטה':'מפורסם'}</p></div><Button variant="outline" onClick={()=>setShowEdit(!showEdit)}>ערוך פרטי אירוע</Button></header>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {showEdit&&<EventEditor initial={event} busy={busy} onSave={save}/>}
 {event.status==='published'&&<Link className="text-blue-500" to={'/events/'+id}>צפייה באתר הציבורי ←</Link>}
 <section className="border rounded-lg p-4 space-y-3"><h3 className="text-xl font-bold">טורנירי האירוע</h3>
 {event.tournaments.map(t=><div key={t.id} className="flex gap-3 justify-between items-center"><Link className="text-blue-500" to={'/tournaments/'+t.id}>{t.title}</Link><div className="flex gap-2">{t.type==='inter_team'&&<Button asChild size="sm" variant="outline"><Link to={'/manage/inter-team/'+t.id}>פתח ניהול מפגש</Link></Button>}<Button size="sm" variant="outline" disabled={busy} onClick={()=>void unlink(t.id)}>הסר שיוך</Button></div></div>)}
 <div className="flex gap-2 flex-wrap"><select aria-label="בחר טורניר" className="border rounded p-2 bg-card" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">בחר טורניר קיים</option>{eligible.map(t=><option value={t.id} key={t.id}>{t.title}</option>)}</select>
 <Button disabled={!selected||busy} onClick={()=>void link()}>שייך</Button>
 <Button variant="outline" onClick={()=>setCreateDialog(true)}>{event.category==='club'?'יצירת טורניר חוגים':'יצירת מפגש נבחרות'}</Button></div>
 </section>
 {event.category==='all_stars'&&event.fixtures.some(f=>!f.tournamentId)&&<section className="border rounded-lg p-4 space-y-3"><h3 className="font-bold">הסבת מפגשים ישנים לטורנירים</h3><p className="text-sm">מפגשים שתוכננו לפני איחוד המערכת. יש להסב כל מפגש פעם אחת, בלי לאבד את התאריך והנבחרות.</p>
 {event.fixtures.filter(f=>!f.tournamentId).map(f=><div key={f.id} className="flex flex-wrap justify-between items-center gap-2"><span>{new Date(f.date).toLocaleString('he-IL')} · {f.location}</span><Button size="sm" disabled={busy} onClick={()=>void convertLegacyFixture(f)}>הסב לטורניר</Button></div>)}</section>}
 {createDialog&&(event.category==='club'?<AdminTournaments embeddedCreate eventContext={{id,onClose:()=>setCreateDialog(false),onSaved:()=>void competitionSaved()}}/>:<Modal title="יצירת מפגש נבחרות עתידי" onClose={()=>setCreateDialog(false)} panelClassName="max-w-2xl"><FixtureEditor eventId={id} onSaved={competitionSaved}/></Modal>)}
 <section className="border rounded-lg p-4 space-y-3"><div className="flex justify-between items-center"><h3 className="text-xl font-bold">עדכוני האירוע</h3><Button onClick={()=>setEditing(null)}>עדכון חדש</Button></div>
 {event.updates.map(u=><div key={u.id} className="flex justify-between items-center"><span>{u.title} · {u.published===false?'טיוטה':u.showInNews===false?'מפורסם באירוע בלבד':'מפורסם'}</span><Button variant="outline" size="sm" onClick={()=>setEditing(u)}>ערוך</Button></div>)}
 {editing!==undefined&&<UpdateEditDialog update={editing||undefined} defaultEventId={id} onSaved={reload} onClose={()=>setEditing(undefined)}/>}
 </section>
 <section className="border rounded-lg p-4 space-y-3"><h3 className="text-xl font-bold">תמונות וסרטונים</h3><MediaManager owner="event" id={id} items={event.mediaItems} onChanged={reload}/></section>
 <Button disabled={busy} variant="destructive" onClick={()=>void remove()}>מחק אירוע</Button>
 </div>;
}

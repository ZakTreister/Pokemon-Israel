import { useEffect,useState } from 'react';
import Button from '../../components/ui/Button';
import UpdateEditDialog from '../../features/updates/components/UpdateEditDialog';
import updatesService from '../../features/updates/updatesService';
import { eventsService } from '../../services/events';
import type { Update } from '../../types/update';
import type { EventSummary } from '../../types/event';
import { requestError } from '../../utils/requestError';
import { useConfirm } from '../../components/ui/ConfirmProvider';
export default function AdminUpdates(){
 const [updates,setUpdates]=useState<Update[]>([]),[events,setEvents]=useState<EventSummary[]>([]),[selected,setSelected]=useState('all');
 const [editing,setEditing]=useState<Update|null|undefined>(undefined),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const {showConfirm}=useConfirm();
 const reload=async()=>setUpdates(await updatesService.getManagedUpdates());
 useEffect(()=>{reload().catch(e=>setError(requestError(e)));eventsService.manage().then(setEvents).catch(()=>{});},[]);
 const remove=async(u:Update)=>{if(!await showConfirm({title:'מחיקת עדכון',message:'למחוק את '+u.title+'?',confirmText:'מחק',variant:'destructive'}))return;
 setBusy(true);try{await updatesService.deleteUpdate(u.id);await reload();}catch(e){setError(requestError(e));}finally{setBusy(false);}};
 const displayed=updates.filter(u=>selected==='all'||(selected==='regular'?!u.eventId:u.eventId===selected));
 return <div className="space-y-4"><header className="flex justify-between items-center flex-wrap gap-2"><h2 className="text-2xl font-bold">ניהול עדכונים</h2><Button onClick={()=>setEditing(null)}>עדכון חדש</Button></header>
 <label>סינון לפי אירוע <select className="border rounded-md p-2 bg-card ms-2" value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">כל העדכונים</option><option value="regular">עדכונים רגילים</option>{events.map(ev=><option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></label>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {displayed.map(u=><article key={u.id} className="border rounded-lg p-4"><h3 className="font-bold">{u.title}</h3><p className="text-muted-foreground whitespace-pre-wrap">{u.description||u.content}</p><div className="flex gap-2 mt-3"><Button variant="outline" size="sm" onClick={()=>setEditing(u)}>עריכה</Button><Button disabled={busy} variant="destructive" size="sm" onClick={()=>void remove(u)}>מחק</Button></div></article>)}
 {editing!==undefined&&<UpdateEditDialog update={editing||undefined} defaultEventId={selected!=='all'&&selected!=='regular'?selected:undefined} onClose={()=>setEditing(undefined)} onSaved={reload}/>}
 </div>;
}

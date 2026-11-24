import { useEffect,useState } from 'react';
import { publicTeams } from '../../services/publicTeams';
import { eventsService } from '../../services/events';
import type { EventFixture } from '../../types/event';
import type { Team } from '../../types/team';
import Button from '../../components/ui/Button';
import { requestError } from '../../utils/requestError';
export default function FixtureEditor({eventId,fixtures,onSaved}:{eventId:string;fixtures:EventFixture[];onSaved:()=>Promise<void>}){
 const [teams,setTeams]=useState<Team[]>([]),[rows,setRows]=useState(fixtures.map(f=>({...f,date:f.date.slice(0,16)}))),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{publicTeams.list().then(setTeams).catch(()=>{});},[]);
 useEffect(()=>setRows(fixtures.map(f=>({...f,date:f.date.slice(0,16)}))),[fixtures]);
 const save=async()=>{setBusy(true);setError('');try{await eventsService.fixtures(eventId,rows.map(r=>({firstTeam:r.firstTeam,secondTeam:r.secondTeam,date:r.date,location:r.location,tournamentId:r.tournamentId})));await onSaved();}catch(e){setError(requestError(e));}finally{setBusy(false);}};
 return <div className="space-y-3"><p className="text-sm text-muted-foreground">אפשר לתכנן מפגש אחד או כמה מפגשים מראש. הם לא מוסיפים ניקוד.</p>
 {rows.map((r,i)=><div className="grid gap-2 sm:grid-cols-4 items-center" key={r.id||i}>{(['firstTeam','secondTeam'] as const).map(key=><select aria-label={key==='firstTeam'?'נבחרת א':'נבחרת ב'} key={key} className="border rounded-md p-2 bg-card" value={r[key]} onChange={e=>setRows(rows.map((x,j)=>j===i?{...x,[key]:e.target.value}:x))}><option value="">בחר נבחרת</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>)}
 <input type="datetime-local" aria-label="מועד המפגש" className="border rounded-md p-2 bg-card" value={r.date} onChange={e=>setRows(rows.map((x,j)=>j===i?{...x,date:e.target.value}:x))}/><Button variant="outline" size="sm" onClick={()=>setRows(rows.filter((_,j)=>i!==j))}>הסר</Button></div>)}
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setRows([...rows,{id:'',firstTeam:'',secondTeam:'',date:'',location:'',tournamentId:null}])}>הוסף מפגש</Button><Button disabled={busy} onClick={()=>void save()}>שמור לוח מפגשים</Button></div></div>;
}

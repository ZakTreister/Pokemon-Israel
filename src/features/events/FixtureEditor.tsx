import { useEffect,useState } from 'react';
import { publicTeams } from '../../services/publicTeams';
import api from '../../services/api';
import type { Team } from '../../types/team';
import Button from '../../components/ui/Button';
import { requestError } from '../../utils/requestError';

export default function FixtureEditor({eventId,onSaved}:{eventId:string;onSaved:()=>Promise<void>}){
 const [teams,setTeams]=useState<Team[]>([]),[firstTeam,setFirstTeam]=useState(''),[secondTeam,setSecondTeam]=useState(''),[date,setDate]=useState(''),[location,setLocation]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;publicTeams.list().then(rows=>{if(active)setTeams(rows)}).catch(e=>{if(active)setError(requestError(e))});return()=>{active=false};},[]);
 const valid=!!firstTeam&&!!secondTeam&&firstTeam!==secondTeam&&!!date;
 const save=async()=>{if(!valid||busy)return;setBusy(true);setError('');try{
  await api.post('/api/inter-team',{eventId,teamIds:[firstTeam,secondTeam],scheduledDate:new Date(date).toISOString(),location});
  await onSaved();
 }catch(e){setError(requestError(e));}finally{setBusy(false);}};
 return <form className="space-y-3" onSubmit={e=>{e.preventDefault();void save()}}>
 <p className="text-sm text-muted-foreground">המפגש יישמר כטורניר מתוכנן ללא סבבים או ניקוד.</p>
 <div className="grid gap-3 sm:grid-cols-2">
 {([{label:'נבחרת א',value:firstTeam,set:setFirstTeam},{label:'נבחרת ב',value:secondTeam,set:setSecondTeam}]).map(field=><label key={field.label}>{field.label}<select required className="block w-full border rounded-md p-2 bg-card" value={field.value} onChange={e=>field.set(e.target.value)}><option value="">בחר נבחרת</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>)}
 <label>מועד המפגש<input required type="datetime-local" className="block w-full border rounded-md p-2 bg-card" value={date} onChange={e=>setDate(e.target.value)}/></label>
 <label>מיקום (אופציונלי)<input maxLength={200} className="block w-full border rounded-md p-2 bg-card" value={location} onChange={e=>setLocation(e.target.value)}/></label>
 </div>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 <Button type="submit" disabled={busy||!valid}>{busy?'יוצר…':'צור מפגש עתידי'}</Button></form>;
}

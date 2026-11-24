import { useEffect,useState } from 'react';
import { publicTeams } from '../../services/publicTeams';
import api from '../../services/api';
import { eventsService } from '../../services/events';
import type { EventFixture } from '../../types/event';
import type { Team } from '../../types/team';
import type { PublicTournamentSummary } from '../../services/publicTournaments';
import Button from '../../components/ui/Button';
import { requestError } from '../../utils/requestError';
const emptyFixture=():EventFixture=>({id:'',firstTeam:'',secondTeam:'',date:'',location:'',tournamentId:null});
const toLocalInput=(value:string)=>{const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export default function FixtureEditor({eventId,fixtures,tournaments,onSaved,createOnly=false}:{eventId:string;fixtures:EventFixture[];tournaments:PublicTournamentSummary[];onSaved:()=>Promise<void>;createOnly?:boolean}){
 const [teams,setTeams]=useState<Team[]>([]),[rows,setRows]=useState(createOnly?[emptyFixture()]:fixtures.map(f=>({...f,date:toLocalInput(f.date)}))),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{publicTeams.list().then(setTeams).catch(()=>{});},[]);
 useEffect(()=>{if(!createOnly)setRows(fixtures.map(f=>({...f,date:toLocalInput(f.date)})));},[fixtures,createOnly]);
 const save=async()=>{setBusy(true);setError('');try{const payload=rows.map(r=>({...r,date:new Date(r.date).toISOString()}));if(createOnly)await api.post('/api/inter-team',{eventId,teamIds:[payload[0].firstTeam,payload[0].secondTeam],scheduledDate:payload[0].date,location:payload[0].location});else await eventsService.fixtures(eventId,payload);await onSaved();}catch(e){setError(requestError(e));}finally{setBusy(false);}};
 return <div className="space-y-3"><p className="text-sm text-muted-foreground">אפשר לתכנן מפגש אחד או כמה מפגשים מראש. הם לא מוסיפים ניקוד.</p>
 {rows.map((r,i)=><div className="grid gap-2 sm:grid-cols-4 items-center" key={r.id||i}>{(['firstTeam','secondTeam'] as const).map(key=><select aria-label={key==='firstTeam'?'נבחרת א':'נבחרת ב'} key={key} className="border rounded-md p-2 bg-card" value={r[key]} onChange={e=>setRows(rows.map((x,j)=>j===i?{...x,[key]:e.target.value}:x))}><option value="">בחר נבחרת</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>)}
 <input type="datetime-local" aria-label="מועד המפגש" className="border rounded-md p-2 bg-card" value={r.date} onChange={e=>setRows(rows.map((x,j)=>j===i?{...x,date:e.target.value}:x))}/>
 {createOnly?<input aria-label="מיקום המפגש" placeholder="מיקום (אופציונלי)" maxLength={200} className="border rounded-md p-2 bg-card" value={r.location} onChange={e=>setRows(rows.map((x,j)=>j===i?{...x,location:e.target.value}:x))}/>:<><label className="sm:col-span-3 text-sm">טורניר רשמי משויך (אופציונלי)<select aria-label="קישור למפגש רשמי" className="block border rounded-md p-2 bg-card w-full" value={r.tournamentId||''} onChange={e=>setRows(rows.map((x,j)=>j===i?{...x,tournamentId:e.target.value||null}:x))}><option value="">לא שויך טורניר</option>{tournaments.filter(t=>t.type==='inter_team').map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><Button variant="outline" size="sm" onClick={()=>setRows(rows.filter((_,j)=>i!==j))}>הסר</Button></>}</div>)}
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 <div className="flex flex-wrap gap-2">{!createOnly&&<Button variant="outline" onClick={()=>setRows([...rows,emptyFixture()])}>הוסף מפגש</Button>}<Button disabled={busy|| (createOnly&&(!rows[0]?.firstTeam||!rows[0]?.secondTeam||rows[0].firstTeam===rows[0].secondTeam||!rows[0]?.date))} onClick={()=>void save()}>{createOnly?'צור מפגש עתידי':'שמור לוח מפגשים'}</Button></div></div>;
}

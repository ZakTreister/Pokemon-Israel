import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import teamsService from '../../features/teams/teamsService';
import type { TeamRosterPlayer } from '../../types/team';
import { subscribeTournament } from '../../services/tournamentLive';
import { requestError } from '../../utils/requestError';
import Button from '../../components/ui/Button';

interface Participant {player:string;team:string;nameSnapshot:string}
interface Match { _id:string; table:number;player1:string;player2:string; result?:{winner:string;score1:number;score2:number;drawnGames:number}|null }
interface Round {number:number;benchPlayerIds:string[];matches:Match[]}
interface Meeting {
 id:string;title:string;phase:string;status:string;revision:number;
 interTeamSides:{team:string;nameSnapshot:string;logoSnapshot:string}[];
 playerParticipants:Participant[];nextRoundParticipantIds:string[];
 rounds:Round[]; standings:{player:string;points:number;position:number}[];
}
const getId=(v:string|{_id:string})=>typeof v==='string'?v:v._id;
export default function InterTeamManagePage(){
 const {id=''}=useParams();
 const [data,setData]=useState<Meeting|null>(null);
 const [selected,setSelected]=useState<string[]>([]);
 const [rosters,setRosters]=useState<Record<string,TeamRosterPlayer[]>>({});
 const [draft,setDraft]=useState<Match[]>([]);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const reload=useCallback(async()=>{const response=await api.get<Meeting>(`/api/inter-team/${id}`);setData(response.data);setSelected((response.data.nextRoundParticipantIds||[]).map(getId));},[id]);
 useEffect(()=>{void reload().catch(e=>setError(requestError(e)));},[reload]);
 useEffect(()=>{
   if (!data?.interTeamSides?.length) return;
   let active=true;
   Promise.all(data.interTeamSides.map(async side=>[getId(side.team),(await teamsService.getTeam(getId(side.team))).players] as const))
     .then(rows=>{if(active)setRosters(Object.fromEntries(rows));})
     .catch(e=>{if(active)setError(requestError(e));});
   return()=>{active=false;};
 },[data?.id]);
 useEffect(()=>{if(!data||data.phase==='completed')return;
   return subscribeTournament(id,()=>void reload().catch(e=>setError(requestError(e))),()=>{});
 },[id,data?.phase,reload]);
 const round=data?.rounds.at(-1);
 useEffect(()=>{setDraft(round?.matches.map(m=>({...m,player1:getId(m.player1),player2:getId(m.player2)}))??[]);},[data?.revision]);
 const byId=useMemo(()=>new Map(data?.playerParticipants.map(p=>[getId(p.player),p])||[]),[data]);
 const name=(id:string)=>byId.get(getId(id))?.nameSnapshot??'לא ידוע';
 const sides=data?.interTeamSides??[];
 const side=(id:string)=>byId.get(getId(id))?.team;
 const save=async(path:string,body:object={})=>{
   if(!data||busy)return;setBusy(true);setError('');
   try{const response=await api.post<Meeting>(path,{...body,expectedRevision:data.revision});setData(response.data);}
   catch(e){setError(requestError(e));}finally{setBusy(false);}
 };
 const update=async(path:string,body:object)=>{
   if(!data||busy)return;setBusy(true);setError('');
   try{const response=await api.put<Meeting>(path,{...body,expectedRevision:data.revision});setData(response.data);}
   catch(e){setError(requestError(e));}finally{setBusy(false);}
 };
 if(!data)return <p role="status">{error||'טוען מפגש…'}</p>;
 const canEdit=data.phase!=='completed'&&!round?.matches.some(m=>m.result);
 return <section className="space-y-5" dir="rtl">
   <header className="flex flex-wrap items-center justify-between gap-3">
     <div><h2 className="text-2xl font-extrabold">{data.title}</h2><p>{data.phase==='completed'?'הסתיים':data.phase==='running'?'🔴 LIVE':'בהכנה'}</p></div>
     <Button asChild variant="outline"><Link to={`/inter-team/${id}`}>צפייה בלייב</Link></Button>
   </header>
   {error&&<p role="alert" className="text-destructive">{error}</p>}
   {data.phase!=='completed'&&<section className="border rounded-lg p-4 space-y-3">
     <h3 className="font-bold">משתתפים בסבב הבא</h3>
     <p className="text-sm text-muted-foreground">שינוי המשתתפים משפיע רק על הסבבים הבאים. התוצאות הקודמות נשמרות.</p>
     <div className="grid md:grid-cols-2 gap-4">
       {sides.map(team=><div key={getId(team.team)} className="space-y-2">
         <h4 className="font-bold">{team.nameSnapshot}</h4>
         {(rosters[getId(team.team)]||data.playerParticipants.filter(p=>getId(p.team)===getId(team.team)).map(p=>({id:getId(p.player),firstName:p.nameSnapshot,lastName:''}))).filter(p=>p.isActive!==false&&p.teamMembershipStatus!=='dismissed').map(p=><label key={p.id} className="flex gap-2 items-center">
           <input type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,p.id]:current.filter(x=>x!==p.id))}/>
           {p.firstName} {p.lastName}
         </label>)}
       </div>)}
     </div>
     <Button variant="outline" disabled={busy} onClick={()=>void update(`/api/inter-team/${id}/participants`,{playerIds:selected})}>שמור הרכב לסבב הבא</Button>
     <Button disabled={busy} onClick={()=>void save(`/api/inter-team/${id}/rounds`)}>הגרל סבב חדש</Button>
   </section>}
   {round&&<section className="space-y-3">
     <h3 className="text-xl font-bold">סבב {round.number}</h3>
     <p className="text-sm">בספסל: {round.benchPlayerIds.length?round.benchPlayerIds.map(name).join(' · '):'אין'}</p>
     <p className="text-sm text-muted-foreground">ניתן להחליף שחקנים בין השולחנות לפני הזנת התוצאות.</p>
     {draft.map((m,i)=><article key={m._id} className="border rounded-lg p-3 space-y-2">
       <p className="font-bold">שולחן {m.table}</p>
       <div className="grid grid-cols-2 gap-2">
         {[0,1].map(slot=><select key={slot} disabled={!canEdit} className="rounded-md border p-2 bg-background"
           value={slot===0?m.player1:m.player2}
           onChange={e=>setDraft(rows=>rows.map((row,j)=>j===i?{...row,[slot===0?'player1':'player2']:e.target.value}:row))}>
           {draft.flatMap(row=>[row.player1,row.player2]).filter(pid=>getId(side(pid)??'')===getId(sides[slot]?.team??'')).filter((pid,j,a)=>a.indexOf(pid)===j).map(pid=><option key={pid} value={pid}>{name(pid)}</option>)}
         </select>)}
       </div>
       <div className="flex flex-wrap gap-2 items-center">
         <span>{m.result?`${m.result.score1} - ${m.result.score2}`:'ממתין לתוצאה'}</span>
         {!m.result&&data.phase!=='completed'&&<>{(['player1','player2','draw'] as const).map(winner=><Button key={winner} size="sm" variant="outline" disabled={busy}
           onClick={()=>{const score=winner==='draw'?[1,1]:winner==='player1'?[1,0]:[0,1];void update(`/api/inter-team/${id}/rounds/${round.number}/matches/${m._id}`,{result:{winner,score1:score[0],score2:score[1],drawnGames:0}});}}>
           {winner==='draw'?'תיקו':winner==='player1'?'ניצחון '+name(m.player1):'ניצחון '+name(m.player2)}
         </Button>)}</>}
       </div>
     </article>)}
     {canEdit&&<Button variant="outline" disabled={busy} onClick={()=>void update(`/api/inter-team/${id}/rounds/${round.number}/pairings`,{
       matches:draft.map(m=>({matchId:m._id,table:m.table,player1:m.player1,player2:m.player2}))
     })}>שמור צימודים ידניים</Button>}
   </section>}
   {data.phase!=='completed'&&round&&<Button disabled={busy} onClick={()=>void save(`/api/inter-team/${id}/close`)}>סיים מפגש</Button>}
 </section>;
}

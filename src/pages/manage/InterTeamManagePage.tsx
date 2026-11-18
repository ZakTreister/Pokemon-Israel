import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import api from '../../services/api';
import teamsService from '../../features/teams/teamsService';
import type { TeamRosterPlayer } from '../../types/team';
import { subscribeTournament } from '../../services/tournamentLive';
import { requestError } from '../../utils/requestError';
import Button from '../../components/ui/Button';
import MatchEditor from '../../components/MatchEditor';
import type { MatchResult } from '../../types/internalTournament';

interface Participant {player:string;team:string;nameSnapshot:string}
interface Match { _id:string; table:number;player1:string;player2:string; result:MatchResult|null; resultRevision?:number }
interface Round {number:number;benchPlayerIds:string[];matches:Match[]}
interface Meeting {
 id:string;title:string;phase:string;status:string;revision:number;
 interTeamSides:{team:string;nameSnapshot:string;logoSnapshot:string}[];
 playerParticipants:Participant[];nextRoundParticipantIds:string[];
 rounds:Round[]; standings:{player:string;points:number;position:number}[];
 teamScore:{team:string;matchWins:number;matchDraws:number;gameWins:number}[];
}
const getId=(v:string|{_id:string}|null|undefined):string=>v==null?'':typeof v==='string'?v:v._id;
export default function InterTeamManagePage(){
 const {id=''}=useParams();
 const {user}=useAppSelector(state=>state.auth);
 const isAdmin=user?.role==='admin';
 const [data,setData]=useState<Meeting|null>(null);
 const revisionRef=useRef(-1);
 const rosterDirtyRef=useRef(false);
 const [selected,setSelected]=useState<string[]>([]);
 const [rosters,setRosters]=useState<Record<string,TeamRosterPlayer[]>>({});
 const [draft,setDraft]=useState<Match[]>([]);
 const [draftBench,setDraftBench]=useState<string[]>([]);
 const [participantsEditing,setParticipantsEditing]=useState(false);
 const [pairingsEditing,setPairingsEditing]=useState(false);
 const [pairingsBaseRevision,setPairingsBaseRevision]=useState<number|null>(null);
 const [pairingsError,setPairingsError]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const accept=useCallback((incoming:Meeting)=>{
   if(incoming.revision<revisionRef.current)return;
   revisionRef.current=incoming.revision;
   setData(incoming);
   if(!rosterDirtyRef.current)
     setSelected((incoming.nextRoundParticipantIds||[]).map(getId));
 },[]);
 const reload=useCallback(async()=>{
   const response=await api.get<Meeting>(`/api/inter-team/${id}`);
   accept(response.data);
 },[id,accept]);
 useEffect(()=>{
   revisionRef.current=-1;
   rosterDirtyRef.current=false;
   void reload().catch(e=>setError(requestError(e)));
 },[reload]);
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
 useEffect(()=>{
   // Preserve an open manual edit during unrelated live updates. A stale edit
   // cannot be saved until the operator cancels and reloads the round.
   if (!pairingsEditing){
     setDraft(round?.matches.map(m=>({...m,player1:getId(m.player1),player2:getId(m.player2)}))??[]);
     setDraftBench(round?.benchPlayerIds.map(getId)??[]);
   }
 },[data?.revision,pairingsEditing]);
 const byId=useMemo(()=>new Map(data?.playerParticipants.map(p=>[getId(p.player),p])||[]),[data]);
 const name=(id:string|null)=>id?byId.get(getId(id))?.nameSnapshot??'לא ידוע':'—';
 const sides=data?.interTeamSides??[];
 const side=(id:string)=>byId.get(getId(id))?.team;
 const swapPlayer=(matchIndex:number,field:'player1'|'player2',newPlayer:string)=>{
   const current=draft[matchIndex]?.[field];
   if(!current||current===newPlayer||side(current)!==side(newPlayer))return;
   const benchIndex=draftBench.indexOf(newPlayer);
   if(benchIndex!==-1){
     if(!isAdmin)return;
     // The player leaving the table takes the newly activated player's bench
     // place. This keeps the complete round roster and all tables unchanged.
     setDraft(previous=>previous.map((match,index)=>
       index===matchIndex?{...match,[field]:newPlayer}:match));
     setDraftBench(previous=>previous.map(id=>id===newPlayer?current:id));
     return;
   }
   const otherIndex=draft.findIndex(match=>match.player1===newPlayer||match.player2===newPlayer);
   if(otherIndex<0||otherIndex===matchIndex)return;
   const otherField=draft[otherIndex].player1===newPlayer?'player1':'player2';
   setDraft(previous=>previous.map((match,index)=>{
     if(index===matchIndex)return {...match,[field]:newPlayer};
     if(index===otherIndex)return {...match,[otherField]:current};
     return match;
   }));
 };
 const save=async(path:string,body:object={})=>{
   if(!data||busy)return;setBusy(true);setError('');
   try{const response=await api.post<Meeting>(path,{...body,expectedRevision:data.revision});accept(response.data);
     if(path.endsWith('/rounds')){setParticipantsEditing(false);setPairingsEditing(false);setPairingsBaseRevision(null);}
   }
   catch(e){setError(requestError(e));}finally{setBusy(false);}
 };
 const update=async(path:string,body:object)=>{
   if(!data||busy)return false;
   setBusy(true);setError('');
   try{
     const response=await api.put<Meeting>(path,{...body,expectedRevision:data.revision});
     if(path.endsWith('/participants'))rosterDirtyRef.current=false;
     accept(response.data);
     return true;
   }catch(e){setError(requestError(e));return false;}
   finally{setBusy(false);}
 };
 if(!data)return <p role="status">{error||'טוען מפגש…'}</p>;
 const canEdit=data.phase!=='completed'&&!round?.matches.some(m=>m.result);
 const rosterDirty=selected.length!==(data.nextRoundParticipantIds??[]).length ||
   selected.some(value=>!(data.nextRoundParticipantIds??[]).map(getId).includes(value));
 const originalBench=round?.benchPlayerIds.map(getId)??[];
 const benchChanged=[...draftBench].sort().join('|')!==[...originalBench].sort().join('|');
 const pairingDirty=benchChanged||draft.some(m=>{
   const original=round?.matches.find(row=>row._id===m._id);
   return original && (getId(original.player1)!==m.player1 || getId(original.player2)!==m.player2);
 });
 const roundComplete=!round || round.matches.every(match=>Boolean(match.result));
 const benchGroups=sides.map(team=>({
   team:team.nameSnapshot,
   players:(pairingsEditing?draftBench:(round?.benchPlayerIds??[]).map(getId))
     .filter(player=>getId(side(getId(player)))===getId(team.team)).map(player=>name(getId(player))),
 })).filter(group=>group.players.length>0);
 const cancelParticipants=()=>{
   rosterDirtyRef.current=false;
   setSelected((data.nextRoundParticipantIds||[]).map(getId));
   setParticipantsEditing(false);
 };
 const saveParticipants=async()=>{
   if(rosterDirty){
     if(!(await update(`/api/inter-team/${id}/participants`,{playerIds:selected})))return;
   }else{
     rosterDirtyRef.current=false;
   }
   setParticipantsEditing(false);
 };
 const startPairingsEdit=()=>{
   setDraft(round?.matches.map(m=>({...m,player1:getId(m.player1),player2:getId(m.player2)}))??[]);
   setDraftBench(round?.benchPlayerIds.map(getId)??[]);
   setPairingsBaseRevision(data.revision);
   setPairingsError('');
   setPairingsEditing(true);
 };
 const cancelPairingsEdit=()=>{
   setDraft(round?.matches.map(m=>({...m,player1:getId(m.player1),player2:getId(m.player2)}))??[]);
   setDraftBench(round?.benchPlayerIds.map(getId)??[]);
   setPairingsEditing(false);
   setPairingsBaseRevision(null);
   setPairingsError('');
 };
 const savePairings=async()=>{
   if(!round||!pairingsEditing||!pairingDirty||busy)return;
   if(pairingsBaseRevision!==data.revision){
     setPairingsError('הסבב עודכן ממכשיר אחר. בטל את העריכה ופתח אותה מחדש כדי לראות את הצימודים המעודכנים.');
     return;
   }
   const saved=await update(`/api/inter-team/${id}/rounds/${round.number}/pairings`,{
     matches:draft.map(m=>({matchId:m._id,table:m.table,player1:m.player1,player2:m.player2})),
     benchPlayerIds:draftBench,
   });
   if(saved){
     setPairingsEditing(false);
     setPairingsBaseRevision(null);
     setPairingsError('');
   }
 };
 const pairingActions = (position: 'top' | 'bottom') => (
   <div className="flex flex-wrap items-center gap-2" aria-label={position==='top'?'סיום עריכת צימודים — למעלה':'סיום עריכת צימודים — למטה'}>
     {pairingsBaseRevision!==data.revision&&<p role="alert" className="basis-full text-sm text-amber-700">הסבב עודכן ממכשיר אחר. בטל ופתח מחדש את העריכה.</p>}
     {pairingsError&&<p role="alert" className="basis-full text-sm text-destructive">{pairingsError}</p>}
     <Button disabled={busy||!pairingDirty||pairingsBaseRevision!==data.revision} onClick={()=>void savePairings()}>שמור צימודים</Button>
     <Button variant="outline" disabled={busy} onClick={cancelPairingsEdit}>ביטול</Button>
   </div>
 );
 return <section className="space-y-5" dir="rtl">
   <header className="flex flex-wrap items-center justify-between gap-3">
     <div><h2 className="text-2xl font-extrabold">{data.title}</h2><p>{data.phase==='completed'?'הסתיים':data.phase==='running'?'🔴 LIVE':'בהכנה'}</p></div>
   </header>
   {error&&<p role="alert" className="text-destructive">{error}</p>}
   <div className="grid grid-cols-2 gap-3">{sides.map(team=>{
     const result=data.teamScore.find(row=>getId(row.team)===getId(team.team));
     return <div key={getId(team.team)} className="rounded-xl border bg-white text-slate-900 p-3 text-center">
       <img src={team.logoSnapshot||'/pokemon_kids_logo.png'} alt="" className="mx-auto h-14 w-14 object-contain"/>
       <strong>{team.nameSnapshot}</strong>
       <p className="text-xl font-extrabold">{result?.matchWins??0} ניצחונות</p>
       <p className="text-xs">{result?.matchDraws??0} תיקו · {result?.gameWins??0} ניצחונות במשחקונים</p>
     </div>;
   })}</div>
   {data.phase!=='completed'&&<section className="border rounded-lg bg-white text-slate-900 p-4 space-y-3">
     <div className="flex flex-wrap justify-between items-center gap-2">
       <h3 className="font-bold">משתתפים בסבב הבא</h3>
       {data.rounds.length>0&&!participantsEditing&&
         <Button variant="outline" disabled={busy} onClick={()=>setParticipantsEditing(true)}>עריכת משתתפים</Button>}
     </div>
     {(data.rounds.length===0||participantsEditing)&&<>
       <p className="text-sm text-muted-foreground">שינוי המשתתפים משפיע רק על הסבבים הבאים. התוצאות הקודמות נשמרות.</p>
       <div className="grid md:grid-cols-2 gap-4">
         {sides.map(team=><div key={getId(team.team)} className="space-y-2">
           <h4 className="font-bold">{team.nameSnapshot}</h4>
           {(rosters[getId(team.team)]||data.playerParticipants.filter(p=>getId(p.team)===getId(team.team)).map(p=>({id:getId(p.player),firstName:p.nameSnapshot,lastName:''} as TeamRosterPlayer))).filter(p=>p.isActive!==false&&p.teamMembershipStatus!=='dismissed').map(p=><label key={p.id} className="flex gap-2 items-center">
             <input type="checkbox" checked={selected.includes(p.id)} onChange={e=>{rosterDirtyRef.current=true;setSelected(current=>e.target.checked?[...current,p.id]:current.filter(x=>x!==p.id));}}/>
             {p.firstName} {p.lastName}
           </label>)}
         </div>)}
       </div>
       <div className="flex flex-wrap gap-2">
         <Button variant="outline" disabled={busy} onClick={()=>void saveParticipants()}>שמור משתתפים</Button>
         {data.rounds.length>0&&<Button variant="ghost" disabled={busy} onClick={cancelParticipants}>ביטול</Button>}
       </div>
       {rosterDirty&&<p role="status" className="text-sm text-amber-700">יש לשמור את שינויי ההרכב לפני הגרלת הסבב.</p>}
     </>}
   </section>}
   {round&&<section className="space-y-3">
     <div className="flex flex-wrap items-center justify-between gap-2">
       <h3 className="text-xl font-bold">סבב {round.number}</h3>
       {canEdit&&!pairingsEditing&&
         <Button variant="outline" disabled={busy} onClick={startPairingsEdit}>עריכת צימודים</Button>}
     </div>
     {pairingsEditing&&<p className="text-sm text-muted-foreground">אפשר להחליף שחקנים בין שולחנות. {isAdmin?'ניתן גם לבחור שחקן מהספסל, ואז השחקן שהוחלף יעבור לספסל.':'רק מנהל יכול לשנות את הספסל.'}</p>}
     {pairingsEditing&&pairingActions('top')}
     {/* MatchEditor already supplies a standalone table card. Keep one card
         per table, using the same responsive grid as regular tournaments. */}
     <div className="grid min-w-0 gap-3 xl:grid-cols-2">
       {draft.map((m,i)=><div key={m._id} className="min-w-0 space-y-2">
         {pairingsEditing&&<div className="min-w-0 rounded-lg border bg-muted/40 p-3 space-y-2">
           <p className="text-sm font-bold">שולחן {m.table} · עריכת צימודים</p>
           <div className="grid min-w-0 gap-2 sm:grid-cols-2">
         {([0,1] as const).map(slot=><select key={slot} disabled={busy||pairingsBaseRevision!==data.revision} className="min-w-0 w-full min-h-11 rounded-md border p-2 bg-background"
           aria-label={`שחקן ${slot+1} בשולחן ${m.table}`}
           value={slot===0?m.player1:m.player2}
           onChange={e=>swapPlayer(i,slot===0?'player1':'player2',e.target.value)}>
           {[...draft.flatMap(row=>[row.player1,row.player2]),...(isAdmin?draftBench:[])]
             .filter(pid=>getId(side(pid)??'')===getId(side(slot===0?m.player1:m.player2)??''))
             .filter((pid,j,a)=>a.indexOf(pid)===j)
             .map(pid=><option key={pid} value={pid}>{name(pid)}{draftBench.includes(pid)?' (ספסל)':''}</option>)}
         </select>)}
           </div>
         </div>}
         <MatchEditor
         match={{...m, result:m.result??null}}
         name={name}
         disabled={busy||pairingsEditing}
         readOnly={data.phase==='completed'}
         discard={async()=>{await reload();}}
         revision={data.revision}
         save={async(result,expectedRevision)=>{
           if (busy) return 'failed';
           setBusy(true);setError('');
           try{
             const response=await api.put<Meeting>(`/api/inter-team/${id}/rounds/${round.number}/matches/${m._id}`,{
               result,expectedRevision,
             });
             accept(response.data);
             return 'saved';
           }catch(e){setError(requestError(e));return 'failed';}
           finally{setBusy(false);}
         }}
       />
       </div>)}
     </div>
     <div className="rounded-lg border border-dashed bg-white text-slate-900 p-4 space-y-2" aria-label={`ספסל סבב ${round.number}`}>
       <h4 className="font-bold">ספסל</h4>
       {benchGroups.length?benchGroups.map(group=>
         <div key={group.team} className="space-y-1">
           <p className="font-semibold">{group.team}</p>
           <p className="text-sm">{group.players.join(' · ')}</p>
         </div>
       ):<p className="text-sm text-muted-foreground">אין שחקנים בספסל בסבב זה.</p>}
     </div>
     {pairingsEditing&&pairingActions('bottom')}
   </section>}
   {data.phase!=='completed'&&<div className="border-t pt-4 flex flex-wrap justify-end gap-2">
     <Button disabled={busy||rosterDirty||participantsEditing||pairingsEditing||!roundComplete}
       onClick={()=>void save(`/api/inter-team/${id}/rounds`)}>{round?'הגרל סבב חדש':'הגרל סבב ראשון'}</Button>
     {round&&<Button variant="outline" disabled={busy||!roundComplete||rosterDirty||participantsEditing||pairingsEditing}
       onClick={()=>void save(`/api/inter-team/${id}/close`)}>סיים מפגש</Button>}
   </div>}
 </section>;
}

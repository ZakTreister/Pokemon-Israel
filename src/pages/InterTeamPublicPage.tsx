import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { subscribePublicTournament } from '../services/tournamentLive';
import { requestError } from '../utils/requestError';

interface PublicMeeting {
 id:string;title:string;phase:string;status:string;revision:number;
 teams:{team:string;nameSnapshot:string;logoSnapshot:string}[];
 participants:{player:string;team:string;nameSnapshot:string}[];
 rounds:{number:number;benchPlayerIds:string[];matches:{
   id:string;table:number;player1:string;player2:string;result:{winner:string;score1:number;score2:number}|null
 }[]}[];
 standings:{player:string;points:number}[];
}
const idOf=(value:string|{_id:string})=>typeof value==='string'?value:value._id;
export default function InterTeamPublicPage(){
 const {id=''}=useParams();
 const [data,setData]=useState<PublicMeeting|null>(null);
 const [error,setError]=useState('');
 const reload=useCallback(async()=>{
   const response=await api.get<PublicMeeting>(`/api/inter-team/public/${id}`);
   setData(response.data);setError('');
 },[id]);
 useEffect(()=>{void reload().catch(e=>setError(requestError(e)));},[reload]);
 useEffect(()=>{
   if(!data||data.phase!=='running'||data.status==='completed')return;
   const unsubscribe=subscribePublicTournament(id,()=>void reload().catch(e=>setError(requestError(e))));
   const interval=window.setInterval(()=>void reload().catch(()=>{}),30000);
   return ()=>{unsubscribe();window.clearInterval(interval);};
 },[id,data?.phase,data?.status,reload]);
 const participants=useMemo(()=>new Map(data?.participants.map(p=>[idOf(p.player),p])||[]),[data]);
 const name=(id:string)=>participants.get(idOf(id))?.nameSnapshot??'שחקן';
 const score=new Map(data?.standings.map(s=>[idOf(s.player),s.points])||[]);
 const rounds=data?.rounds||[];
 return <main className="container py-8 space-y-6" dir="rtl">
   <Link to="/tournaments" className="underline">אירועים</Link>
   {error&&<p role="alert" className="text-destructive">{error}</p>}
   {!data?<p>טוען…</p>:<>
     <h1 className="text-3xl font-bold">{data.title}</h1>
     <p className="font-bold">{data.phase==='running'?'🔴 LIVE':data.phase==='completed'?'המפגש הסתיים':'המפגש בהכנה'}</p>
     <div className="grid grid-cols-2 gap-4">
       {data.teams.map(team=><div key={idOf(team.team)} className="border rounded-xl p-4 text-center space-y-2">
         <img src={team.logoSnapshot||'/pokemon_kids_logo.png'} alt="" className="w-20 h-20 object-contain mx-auto"/>
         <h2 className="font-extrabold">{team.nameSnapshot}</h2>
         <p>{data.participants.filter(p=>idOf(p.team)===idOf(team.team)).reduce((sum,p)=>sum+(score.get(idOf(p.player))||0),0)} נקודות שחקנים</p>
       </div>)}
     </div>
     {[...rounds].reverse().map(round=><section key={round.number} className="space-y-3">
       <h2 className="text-xl font-bold">סבב {round.number}</h2>
       <p className="text-sm text-muted-foreground">ספסל: {round.benchPlayerIds.length?round.benchPlayerIds.map(name).join(' · '):'אין'}</p>
       {round.matches.map(match=><article key={match.id} className="border rounded-lg p-4 flex justify-between gap-3">
         <span>שולחן {match.table}: {name(match.player1)} מול {name(match.player2)}</span>
         <strong>{match.result?`${match.result.score1} – ${match.result.score2}`:'ממתין'}</strong>
       </article>)}
     </section>)}
   </>}
 </main>;
}

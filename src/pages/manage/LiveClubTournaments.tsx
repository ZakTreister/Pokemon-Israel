import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import type { PageResult } from '../../types/pagination';
import type { TournamentEntry } from '../../features/tournaments/hooks/useTournamentList';

export default function LiveClubTournaments(){
 const [rows,setRows]=useState<TournamentEntry[]>([]);
 useEffect(()=>{
   let active=true;
   const load=()=>api.get<PageResult<TournamentEntry>>('/api/tournaments/management',{
     params:{status:'active',type:'quarterly',page:1,pageSize:30}
   }).then(({data})=>{if(active)setRows(data.items.filter(t=>t.type==='quarterly'&&t.phase==='running'));}).catch(()=>{});
   void load();
   const interval=window.setInterval(()=>void load(),30000);
   return()=>{active=false;window.clearInterval(interval);};
 },[]);
 if(!rows.length)return null;
 return <section className="space-y-3 mb-6" aria-label="טורנירי חוגים פעילים">
   <h2 className="text-xl font-bold">טורנירי חוגים בלייב</h2>
   {rows.map(t=><Link key={t.id} to={`/manage/tournaments/regular/${t.id}/rounds`}
     className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted">
     <span className="h-3 w-3 bg-red-600 rounded-full animate-pulse" aria-label="LIVE"/>
     <span className="font-bold">{t.title}</span>
     <span className="text-sm">לניהול ←</span>
   </Link>)}
 </section>;
}

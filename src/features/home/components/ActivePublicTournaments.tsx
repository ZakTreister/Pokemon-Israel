import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {publicTournaments,type LiveTournamentSummary} from '../../../services/publicTournaments';
import {Card} from '../../../components/ui/Card';

export default function ActivePublicTournaments(){
 const [rows,setRows]=useState<LiveTournamentSummary[]>([]);
 useEffect(()=>{
  let mounted=true,loading=false;
  const load=async()=>{
   if(loading)return;
   loading=true;
   try{
    const data=await publicTournaments.live();
    if(mounted)setRows(Array.isArray(data)?data:[]);
   }catch{
    // Do not display a potentially stale live indicator when the source is unavailable.
    if(mounted)setRows([]);
   }finally{loading=false;}
  };
  void load();
  const interval=window.setInterval(()=>void load(),30000);
  return()=>{mounted=false;window.clearInterval(interval);};
 },[]);
 if(!rows.length)return null;
 return <section className="container pt-7 space-y-3" aria-label="טורנירים פעילים ברגע זה">
  <h2 className="flex items-center gap-3 text-2xl sm:text-3xl font-extrabold">
   <span className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-red-600 size-6" aria-hidden="true"><span className="size-3 rounded-full bg-red-600 motion-safe:animate-pulse"/></span>
   טורנירים פעילים ברגע זה
  </h2>
  <div className="grid gap-3 sm:grid-cols-2">
   {rows.map(row=><Link key={row.id} to={'/tournaments/'+row.id} className="block min-w-0">
    <Card variant="public" className="p-4 flex flex-wrap items-center justify-between gap-3 hover:border-blue-500">
     <div className="min-w-0"><strong className="block text-lg break-words">{row.title}</strong>{row.location&&<p className="text-sm text-muted-foreground">{row.location}</p>}</div>
     <span className="text-sm text-blue-500 font-bold">לצימודים ולתוצאות ←</span>
    </Card>
   </Link>)}
  </div>
 </section>;
}

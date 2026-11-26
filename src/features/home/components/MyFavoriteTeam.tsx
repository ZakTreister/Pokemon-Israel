import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Star} from 'lucide-react';
import {Card} from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import {TeamEmblem} from '../../../components/teams/TeamCard';
import type {Team} from '../../../types/team';
import type {Update} from '../../../types/update';
import type {Meeting,Overview} from '../../../services/allStars';
import {favoriteContent} from '../utils/favoriteContent';
export default function MyFavoriteTeam({team,overview,live,updates,overviewLoading=false,overviewError='',updatesLoading=false,updatesError=''}:{team:Team;overview:Overview|null;live:Meeting[];updates:Update[];overviewLoading?:boolean;overviewError?:string;updatesLoading?:boolean;updatesError?:string}){
 const {active,next,last,standing,update}=favoriteContent(team.id,overview,live,updates);
 const [shareMessage,setShareMessage]=useState('');
 const share=async()=>{
  const url=new URL('/teams/'+team.id,window.location.origin).href;
  try{if(navigator.share)await navigator.share({title:team.name,text:'בואו לעודד את '+team.name+'!',url});else{await navigator.clipboard.writeText(url);setShareMessage('הקישור הועתק');}}
  catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setShareMessage('לא ניתן לשתף כרגע. אפשר להעתיק את הקישור מעמוד הנבחרת.');}
 };
 const opponent=next&&(next.firstTeam.id===team.id?next.secondTeam:next.firstTeam);
 const media=update?.mediaItems?.find(m=>m.kind==='image');
 return <section className="container pt-7" aria-label="הנבחרת שלי">
  <Card variant="public" className="p-5 border-t-4 border-t-purple-600 space-y-4">
   <div className="flex flex-wrap justify-between items-center gap-2"><h2 className="flex items-center gap-2 text-2xl font-extrabold"><Star className="text-amber-500 fill-amber-400"/> הנבחרת שלי</h2><a className="font-bold text-purple-700 dark:text-purple-300" href="#choose-team">החלפת נבחרת</a></div>
   <div className="flex flex-wrap items-center gap-4"><TeamEmblem team={team}/><div style={{borderInlineStart:'4px solid '+(team.themeColor||'#7e22ce')}} className="ps-3"><Link className="text-2xl font-black" to={'/teams/'+team.id}>{team.name}</Link><p>{team.fanCount??0} אוהדים</p></div><Button variant="outline" onClick={()=>void share()}>שתפו ועודדו חברים להצטרף</Button></div>
   {shareMessage&&<p role="status">{shareMessage}</p>}
   {active&&<div className="rounded-lg border border-red-500 p-4 space-y-2"><h3 className="font-bold text-red-600 dark:text-red-400">● המשחק מתקיים עכשיו</h3><p className="font-bold">{active.teams.map(t=>t.name).join(' מול ')}</p><p>ניצחונות במפגשים אישיים: <span dir="ltr">{active.matchWins.join(' : ')}</span> · משחקונים: <span dir="ltr">{active.gameWins.join(' : ')}</span></p>{active.eventId&&<Link className="font-bold text-purple-700 dark:text-purple-300" to={'/events/'+active.eventId}>לפרטי האירוע ←</Link>}</div>}
   <div className="grid gap-3 md:grid-cols-3">
    <div className="rounded-lg border p-4 space-y-2"><h3 className="font-bold">המשחק הקרוב</h3>{overviewLoading?<p role="status">טוען משחקים...</p>:overviewError?<p role="alert">{overviewError}</p>:next?<><p>מול {opponent?.name}</p><p>{new Date(next.date).toLocaleString('he-IL',{timeZone:'Asia/Jerusalem'})}</p><Link className="font-bold text-purple-700 dark:text-purple-300" to={'/events/'+next.eventId}>לפרטי המשחק ←</Link></>:<p>טרם פורסם משחק קרוב.</p>}{last&&<div className="border-t pt-2"><h4 className="font-bold">התוצאה האחרונה</h4><p>{last.teams.map(t=>t.name).join(' מול ')}</p><p>משחקונים: <span dir="ltr">{last.gameWins.join(' : ')}</span></p><Link to={'/tournaments/'+last.id}>לתוצאות ←</Link></div>}</div>
    <div className="rounded-lg border p-4 space-y-2"><h3 className="font-bold">המיקום בליגה</h3>{overviewLoading?<p role="status">טוען דירוג...</p>:overviewError?<p role="alert">{overviewError}</p>:standing&&standing.played>0?<p>מקום {standing.position} · {standing.leaguePoints} נקודות</p>:<p>טרם התקיים מפגש רשמי לנבחרת.</p>}<Link className="font-bold text-purple-700 dark:text-purple-300" to="/all-stars#standings">לטבלת הנבחרות ←</Link></div>
    <div className="rounded-lg border p-4 space-y-2"><h3 className="font-bold">העדכון האחרון</h3>{updatesLoading?<p role="status">טוען עדכונים...</p>:updatesError?<p role="alert">{updatesError}</p>:update?<Link className="block space-y-2" to={'/news/'+update.id}>{(media?.url||update.image)&&<img src={media?.url||update.image} className="w-full aspect-video object-cover rounded-md" alt="" loading="lazy"/>}<strong>{update.title}</strong><p className="text-sm line-clamp-2">{update.description||update.content}</p><span className="font-bold text-purple-700 dark:text-purple-300">לעדכון המלא ←</span></Link>:<p>עדכוני הנבחרת יופיעו כאן לאחר פרסומם.</p>}</div>
   </div>
  </Card>
 </section>;
}

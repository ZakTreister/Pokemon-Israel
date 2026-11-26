import {LeagueLogo} from '../../siteSettings/LeagueLogo';
import {Shield,Trophy} from 'lucide-react';
import {Link} from 'react-router-dom';
import {Card} from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import ContentSwiper from '../../../components/ui/ContentSwiper';
import RankingPodium from '../../../components/rankings/RankingPodium';
import type {NationalRanking} from '../../../services/rankings';
import type {LeagueRow} from '../../../services/allStars';
import type {EventSummary} from '../../../types/event';
function Upcoming({events,allStars,loading,error}:{events:EventSummary[];allStars?:boolean;loading:boolean;error:string}){
 return <div className="space-y-3 min-w-0"><h3 className="text-xl font-bold">{allStars?'מפגשי נבחרות ואירועים קרובים':'טורנירים ואירועים קרובים'}</h3>
 {loading?<p role="status">טוען אירועים...</p>:error?<p role="alert">{error}</p>:events.length?<ContentSwiper variant="media" label={allStars?'אירועי אולסטארז קרובים':'אירועי ילדים קרובים'}>{events.map(ev=><Link key={ev.id} to={'/events/'+ev.id} className="block"><Card variant="public" className="p-4"><strong>{ev.title}</strong><p>{ev.startDate&&new Date(ev.startDate).toLocaleDateString('he-IL',{timeZone:'Asia/Jerusalem'})}</p><span className="font-bold">לפרטי האירוע ←</span></Card></Link>)}</ContentSwiper>:<p className="text-muted-foreground">אירועים קרובים יופיעו לאחר פרסומם.</p>}
 <Link className="font-bold" to={allStars?'/all-stars#matches':'/tournaments'}>{allStars?'לכל מפגשי הנבחרות':'לכל האירועים'} ←</Link>
 </div>;
}
export default function LeagueSections({leaders,standings,events,error,leadersLoading=false,eventsLoading=false,standingsLoading=false,leadersError='',eventsError='',standingsError=''}:{leaders:NationalRanking[];standings:LeagueRow[];events:EventSummary[];error:string;leadersLoading?:boolean;eventsLoading?:boolean;standingsLoading?:boolean;leadersError?:string;eventsError?:string;standingsError?:string}){
 return <section className="container py-8 space-y-3">
 {error&&<p role="alert">{error}</p>}
 <div className="grid gap-5 lg:grid-cols-2 items-stretch">
  <Card variant="public" className="min-w-0 overflow-hidden flex flex-col">
   <header className="bg-blue-800 text-white p-5 flex items-center gap-3"><LeagueLogo league="kids" decorative className="size-16 shrink-0" fallback={<Trophy className="text-yellow-300 shrink-0" size={42}/>}/><div><h2 className="text-2xl font-black">הליגה הישראלית לילדים</h2><p>חוגים וטורנירי ילדים ונוער</p></div></header>
   <div className="flex flex-1 flex-col gap-4 p-5"><div className="space-y-4"><h3 className="text-xl font-bold">דירוג השחקנים הארצי</h3>{leadersLoading?<p role="status">טוען דירוג...</p>:leadersError?<p role="alert">{leadersError}</p>:leaders.length?<RankingPodium leaders={leaders}/>:<p>הדירוג יופיע כשיהיו תוצאות.</p>}<Button asChild variant="outline"><Link to="/rankings">מצאו את עצמכם בדירוג ←</Link></Button></div><div className="mt-auto space-y-4"><hr/><Upcoming loading={eventsLoading} error={eventsError} events={events.filter(e=>e.category==='club')}/></div></div>
  </Card>
  <Card variant="public" className="min-w-0 overflow-hidden flex flex-col">
   <header className="bg-purple-800 text-white p-5 flex items-center gap-3"><LeagueLogo league="allStars" decorative className="size-16 shrink-0" fallback={<Shield className="text-amber-300 shrink-0" size={42}/>}/><div><h2 className="text-2xl font-black">ליגת האולסטארז</h2><p>נבחרות למתקדמים</p></div></header>
   <div className="flex flex-1 flex-col gap-4 p-5"><div className="space-y-4"><h3 className="text-xl font-bold">טבלת הנבחרות</h3>{standingsLoading?<p role="status">טוען טבלת נבחרות...</p>:standingsError?<p role="alert">{standingsError}</p>:standings.length?<table className="w-full text-sm"><thead><tr className="border-b"><th className="text-start p-2">מקום</th><th className="text-start p-2">נבחרת</th><th className="text-start p-2">נקודות</th></tr></thead><tbody>{standings.map(t=><tr key={t.id} className="border-b"><td className="p-2">{t.played?t.position:'—'}</td><td className="p-2"><Link to={'/teams/'+t.id} className="flex items-center gap-2 font-bold">{t.logo&&<img className="size-8 object-contain" src={t.logo} alt=""/>}{t.name}</Link></td><td className="p-2 font-bold">{t.leaguePoints}</td></tr>)}</tbody></table>:<p>אין נבחרות להצגה.</p>}<Button asChild variant="outline"><Link to="/all-stars#standings">עקבו אחר הנבחרות ←</Link></Button></div><div className="mt-auto space-y-4"><hr/><Upcoming allStars loading={eventsLoading} error={eventsError} events={events.filter(e=>e.category==='all_stars')}/><Link className="block font-bold" to="/all-stars">לטורנירי האימון השבועיים ←</Link></div></div>
  </Card>
 </div></section>;
}

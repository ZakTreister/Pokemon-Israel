import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { eventsService } from '../services/events';
import { publicTeams } from '../services/publicTeams';
import type { PublicTournamentSummary } from '../services/publicTournaments';
import type { EventSummary } from '../types/event';
import type { Team } from '../types/team';
import {TeamFanCards} from '../components/teams/AllStarsTeamsSection';
import {useFavoriteSelection} from '../features/teams/hooks/useFavoriteTeam';
import {updateForTeam} from '../features/home/utils/favoriteContent';
import PublicBadgeProgram from '../features/badges/components/PublicBadgeProgram';
import SafeHtml from '../components/content/SafeHtml';
import { PageHero } from '../components/ui/PageHero';
import {staticPageTextsService,type StaticPageText} from '../services/staticPageTexts';
import RankingFreshness from '../components/rankings/RankingFreshness';
import { requestError } from '../utils/requestError';
import updatesService from '../features/updates/updatesService';
import type { Update } from '../types/update';
interface LeagueRow {id:string;name:string;position:number;played:number;wins:number;leaguePoints:number;gameDifference:number;}
interface RecentMeeting {id:string;date:string;eventId:string|null;teams:Array<{id:string;name:string}>;gameWins:number[];matchWins:number[];}
interface Fixture {openingRound?:boolean;eventStartDate?:string|null;id:string;eventId:string;date:string;location:string;firstTeam:{id:string;name:string};secondTeam:{id:string;name:string};tournamentId:string|null;}
export default function AllStarsPage(){
 const [lastUpdatedAt,setLastUpdatedAt]=useState<string|null>(null);
 const [pageText,setPageText]=useState<StaticPageText|null>(null);
 const [textError,setTextError]=useState('');
 useEffect(()=>{let active=true;staticPageTextsService.get('all-stars').then(value=>{if(active)setPageText(value);}).catch(e=>{if(active)setTextError(requestError(e));});return()=>{active=false};},[]);
 const [updates,setUpdates]=useState<Update[]>([]),[recentMeetings,setRecentMeetings]=useState<RecentMeeting[]>([]),[teams,setTeams]=useState<Team[]>([]),[table,setTable]=useState<LeagueRow[]>([]),[fixtures,setFixtures]=useState<Fixture[]>([]),[internals,setInternals]=useState<PublicTournamentSummary[]>([]),[events,setEvents]=useState<EventSummary[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[filter,setFilter]=useState('all');
 useEffect(()=>{let active=true;Promise.all([
 publicTeams.list(),
 api.get<{standings:LeagueRow[];lastUpdatedAt?:string|null;fixtures:Fixture[];recentMeetings:RecentMeeting[];internalTournaments:PublicTournamentSummary[]}>('/api/all-stars/overview').then(r=>r.data),
 eventsService.list({category:'all_stars',pageSize:20}),
 updatesService.getUpdates(),
 ]).then(([t,overview,e,u])=>{if(active){setTeams(t);setTable(overview.standings);setLastUpdatedAt(overview.lastUpdatedAt??null);setFixtures(overview.fixtures);setRecentMeetings(overview.recentMeetings||[]);setInternals(overview.internalTournaments);setEvents(e.items);setUpdates(u);}}).catch(e=>{if(active)setError(requestError(e));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false};},[]);
 const now=Date.now(),upcoming=fixtures.filter(f=>new Date(f.date).getTime()>=now),recent=fixtures.filter(f=>new Date(f.date).getTime()<now).reverse();
 const displayed=filter==='all'?internals:internals.filter(t=>t.team===filter);
 const fan=useFavoriteSelection();
 const favorite=fan.selected;
 const leagueUpdates=updates.filter(u=>u.teamIds?.length||u.eventId&&events.some(ev=>ev.id===u.eventId)).sort((a,b)=>{
   const preferred=(u:Update)=>Number(!!favorite&&updateForTeam(u,favorite,fixtures));
   return preferred(b)-preferred(a)||new Date(b.date).getTime()-new Date(a.date).getTime();
 });
 return <div>
 {pageText?.title && <PageHero variant="all-stars" title={pageText.title} subtitle={pageText.subtitle}/>}
 <div className="container py-8 sm:py-12 space-y-10">
 {textError&&<p role="alert" className="text-destructive">לא ניתן לטעון את טקסטי העמוד: {textError}</p>}
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {loading?<p role="status">טוען פעילות ליגה...</p>:<>
 <section id="matches" className="scroll-mt-24 space-y-3"><h2 className="text-2xl font-extrabold">המשחקים הקרובים</h2>
 {upcoming.filter((f,i,a)=>f.openingRound&&a.findIndex(x=>x.eventId===f.eventId)===i).map(f=><h3 key={f.eventId} className="font-bold text-lg">מחזור הפתיחה{f.eventStartDate?' · '+new Date(f.eventStartDate).toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'numeric',timeZone:'Asia/Jerusalem'}):''}</h3>)}
 {upcoming.length?upcoming.slice(0,6).map(f=><article key={f.id} className="cs-public-card p-5 flex flex-wrap gap-3 justify-between items-center">
 <div><h3 className="font-extrabold text-xl">{f.firstTeam.name} מול {f.secondTeam.name}</h3><p className="text-muted-foreground">{new Date(f.date).toLocaleString('he-IL')}{f.location?' · '+f.location:''}</p></div>
 <Link className="text-blue-500 font-bold" to={'/events/'+f.eventId}>למשחק ולעדכונים ←</Link></article>):<p>המפגש הקרוב יופיע לאחר פרסום לוח המשחקים.</p>}
 {!!recent.length&&<details className="border rounded-lg p-4"><summary className="cursor-pointer font-bold">מפגשים קודמים</summary>{recent.slice(0,6).map(f=><p key={f.id}><Link to={f.tournamentId?'/tournaments/'+f.tournamentId:'/events/'+f.eventId}>{f.firstTeam.name} מול {f.secondTeam.name}</Link></p>)}</details>}{!!recentMeetings.length&&<div className="space-y-2"><h3 className="font-bold text-lg">תוצאות אחרונות</h3>{recentMeetings.slice(0,4).map(m=><Link key={m.id} to={'/tournaments/'+m.id} className="block border rounded-lg p-3 hover:border-blue-500"><strong>{m.teams.map(t=>t.name).join(' מול ')}</strong><p className="text-sm text-muted-foreground">{new Date(m.date).toLocaleDateString('he-IL')} · ניצחונות במשחקונים {m.gameWins.join(' : ')}</p></Link>)}</div>}</section>
 <section id="standings" className="space-y-3 scroll-mt-24"><h2 className="text-2xl font-extrabold">טבלת הנבחרות</h2>
 <RankingFreshness lastUpdatedAt={lastUpdatedAt}/>
 <div className="space-y-2 sm:hidden">{table.map(t=><Link key={t.id} to={'/teams/'+t.id} className="border rounded-lg p-3 flex gap-3 items-center"><strong className="text-blue-500 text-xl w-8">{t.position}</strong><span className="font-bold flex-1 min-w-0 break-words">{t.name}</span><span className="text-center"><strong className="block">{t.leaguePoints}</strong><span className="text-xs text-muted-foreground">נקודות</span></span></Link>)}</div>
 <div className="hidden sm:block"><table className="w-full text-sm sm:text-base"><thead><tr className="bg-navy-700 text-white">{['מקום','נבחרת','מפגשים ששוחקו','ניצחונות','נקודות','הפרש משחקונים'].map(h=><th key={h} className="p-2 text-start">{h==='הפרש משחקונים'?<details><summary className="cursor-pointer">{h}</summary><span className="text-xs font-normal">מספר הניצחונות פחות מספר ההפסדים במשחקונים האישיים</span></details>:h}</th>)}</tr></thead><tbody>{table.map(t=><tr key={t.id} className="border-b"><td className="p-2">{t.position}</td><td className="p-2 font-bold"><Link to={'/teams/'+t.id}>{t.name}</Link></td><td className="p-2">{t.played}</td><td className="p-2">{t.wins}</td><td className="p-2 font-bold">{t.leaguePoints}</td><td className="p-2" dir="ltr">{t.gameDifference>0?'+':''}{t.gameDifference}</td></tr>)}</tbody></table></div>
 <p className="text-sm text-muted-foreground">ניצחון במפגש: 3 נקודות · תיקו: נקודה אחת</p><details className="text-sm"><summary className="cursor-pointer font-bold">איך נקבע הדירוג?</summary><p>הפסד במפגש: 0 נקודות. שוויון מוכרע לפי הפרש ניצחונות פחות הפסדים במשחקונים האישיים. טורנירי אימון לא נכללים.</p></details></section>
 <section className="space-y-4"><h2 className="text-2xl font-extrabold">איזו נבחרת אתם מעודדים?</h2><TeamFanCards teams={teams} favorite={fan}/></section>
 {pageText?.bodyHtml&&<section className="space-y-3" aria-label="מהי ליגת האולסטארז?"><h2 className="text-2xl font-extrabold">מהי ליגת האולסטארז?</h2><SafeHtml html={pageText.bodyHtml}/></section>}
 <PublicBadgeProgram/>
 <section className="space-y-3"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-2xl font-extrabold">תוצאות האימונים השבועיים</h2><select aria-label="סינון לפי נבחרת" className="p-2 border rounded-md bg-card" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">כל הנבחרות</option>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></div>
 {displayed.map(t=><article key={t.id} className="border rounded-lg p-4 flex gap-2 justify-between items-center"><div><strong>{t.title}</strong><p className="text-sm text-muted-foreground">{teams.find(x=>x.id===t.team)?.name||''} · {new Date(t.date).toLocaleDateString('he-IL')}</p></div><Link className="text-blue-500 font-bold" to={'/tournaments/'+t.id}>לתוצאות ←</Link></article>)}
 {!displayed.length&&<p>אין טורנירים להצגה.</p>}
 <p className="text-sm text-muted-foreground">תוצאות אלה קובעות את הדירוג בתוך כל נבחרת, בנפרד מטבלת הנבחרות.</p></section>
 <section className="space-y-3"><h2 className="text-2xl font-extrabold">מה חדש בליגה?</h2><div className="grid gap-3 sm:grid-cols-2">{events.map(ev=><Link key={ev.id} className="cs-public-card p-4" to={'/events/'+ev.id}><h3 className="font-bold">{ev.title}</h3><p className="line-clamp-2 text-muted-foreground">{ev.description}</p></Link>)}</div>{leagueUpdates.slice(0,6).map(u=><Link key={u.id} to={"/news/"+u.id} className="block border rounded-lg p-3"><strong>{u.title}</strong>{u.image&&<img className="mt-2 w-full max-w-xs aspect-video object-cover rounded-lg" src={u.image} alt="" loading="lazy"/>}</Link>)}</section>
 </>}</div></div>;
}

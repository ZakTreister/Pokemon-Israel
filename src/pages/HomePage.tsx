import LeagueSections from '../features/home/components/LeagueSections';
import MyFavoriteTeam from '../features/home/components/MyFavoriteTeam';
import {useFavoriteSelection} from '../features/teams/hooks/useFavoriteTeam';
import {allStarsService,type Overview,type Meeting} from '../services/allStars';
import {publicTeams} from '../services/publicTeams';
import type {Team} from '../types/team';
import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Newspaper, ArrowUpLeft } from 'lucide-react';
import ActivePublicTournaments from '../features/home/components/ActivePublicTournaments';
import { useAppDispatch,useAppSelector } from '../hooks/redux';
import { fetchUpdates } from '../features/updates/updatesSlice';
import { getNationalRankings,type NationalRanking } from '../services/rankings';
import { eventsService } from '../services/events';
import type { EventSummary } from '../types/event';
import { requestError } from '../utils/requestError';
import { TRIAL_REGISTRATION_URL } from '../config/publicSite';
import AllStarsTeamsSection from '../components/teams/AllStarsTeamsSection';
import HeroArtwork from '../features/home/components/HeroArtwork';
import Button from '../components/ui/Button';
export default function HomePage(){
 const dispatch=useAppDispatch(),{updates,isLoading:updatesBusy,hasLoaded:updatesLoaded,error:updatesError}=useAppSelector(s=>s.updates);
 const [events,setEvents]=useState<EventSummary[]>([]),[leaders,setLeaders]=useState<NationalRanking[]>([]),[error,setError]=useState('');
 const [leadersLoading,setLeadersLoading]=useState(true),[eventsLoading,setEventsLoading]=useState(true),[standingsLoading,setStandingsLoading]=useState(true);
 const [leadersError,setLeadersError]=useState(''),[eventsError,setEventsError]=useState(''),[standingsError,setStandingsError]=useState('');
 const [overview,setOverview]=useState<Overview|null>(null),[teams,setTeams]=useState<Team[]|null>(null),[live,setLive]=useState<Meeting[]>([]);
 const favorite=useFavoriteSelection();
 useEffect(()=>{let active=true;dispatch(fetchUpdates());
  Promise.all([eventsService.list({category:'club',pageSize:16}),eventsService.list({category:'all_stars',pageSize:16})]).then(([a,b])=>{if(active)setEvents([...a.items,...b.items]);}).catch(e=>{if(active)setEventsError(requestError(e));}).finally(()=>{if(active)setEventsLoading(false);});
  getNationalRankings({pageSize:3}).then(r=>{if(active)setLeaders(r.rankings);}).catch(e=>{if(active)setLeadersError(requestError(e));}).finally(()=>{if(active)setLeadersLoading(false);});
  publicTeams.list().then(t=>{if(active)setTeams(t);}).catch(e=>{if(active)setError(requestError(e));});
  allStarsService.overview().then(o=>{if(active)setOverview(o);}).catch(e=>{if(active)setStandingsError(requestError(e));}).finally(()=>{if(active)setStandingsLoading(false);});
  return()=>{active=false};
 },[dispatch]);
 useEffect(()=>{if(!favorite.selected)return;let active=true,busy=false;
  const load=async()=>{if(busy)return;busy=true;try{const rows=await allStarsService.live();if(active)setLive(rows);}catch{if(active)setLive([]);}finally{busy=false;}};
  void load();const timer=window.setInterval(()=>void load(),30000);return()=>{active=false;window.clearInterval(timer);};
 },[favorite.selected]);
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const future=events.filter(e=>e.startDate&&new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(e.startDate))>=today).sort((a,b)=>Date.parse(a.startDate!)-Date.parse(b.startDate!));
 const featured=future.find(e=>e.featured)||events.find(e=>e.featured)||future[0]||events[0];
 const featuredFixtures=featured?.category==='all_stars'?(overview?.fixtures??[]).filter(f=>f.eventId===featured.id).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)):[];
 const selectedTeam=teams?.find(t=>t.id===favorite.selected);
 const sortedUpdates=[...updates].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
 return <div>
 {!!sortedUpdates.length&&<aside aria-label="חדשות קארדסקול" className="cs-ticker py-3 text-white"><div className="container flex gap-4 items-center"><Newspaper className="shrink-0" size={20}/><strong className="shrink-0">חדשות קארדסקול</strong><div className="flex gap-6 overflow-x-auto whitespace-nowrap">{sortedUpdates.slice(0,6).map(u=><Link className="hover:text-gold" key={u.id} to={'/news#update-'+u.id}>{u.title} ←</Link>)}</div></div></aside>}
 <section className="relative overflow-hidden bg-hero-navy text-white">
 <div className="container grid items-center gap-4 lg:grid-cols-[1.5fr_0.5fr] py-7 sm:py-9">
 <div><p className="text-gold font-bold text-sm mb-2">מה קורה עכשיו ב־CardSchool?</p>
 <h1 className="text-3xl sm:text-5xl font-black leading-tight">{featured?featured.title:'המשחק שלך. הקהילה שלנו.'}</h1>
 <p className="mt-3 max-w-xl text-blue-100">{featured?(featured.description||'בואו לגלות את האירוע, המשחקים והעדכונים האחרונים.'):'מגלים את הליגה הישראלית לילדים ואת ליגת האולסטארז במקום אחד.'}</p>
 {!!featuredFixtures.length&&<div className={`mt-4 grid gap-4 ${featuredFixtures.length>1?"lg:grid-cols-2":""}`} aria-label="הנבחרות המתמודדות">{featuredFixtures.map(fixture=><div key={`${fixture.eventId}-${fixture.date}-${fixture.firstTeam.id}-${fixture.secondTeam.id}`} className="min-w-0 flex flex-wrap items-center gap-3 sm:gap-5 max-[681px]:justify-center">{[fixture.firstTeam,fixture.secondTeam].map((team,i)=><div key={team.id} className="flex items-center gap-2">{i===1&&<span className="font-black text-gold text-xl me-2">VS</span>}{team.logo&&<img className="h-12 w-12 object-contain" src={team.logo} alt="" />}{!team.logo&&<span className="hidden max-[681px]:inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 font-bold" aria-hidden="true">{team.name.slice(0,2)}</span>}<strong className="max-[681px]:sr-only">{team.name}</strong></div>)}</div>)}</div>}
 {featured?.startDate&&<p className="mt-2 text-gold font-bold"><Calendar size={17} className="inline ms-1"/> {new Date(featured.startDate).toLocaleDateString('he-IL')}</p>}
 <div className="flex flex-wrap gap-3 mt-5"><Button asChild variant="cta"><Link to={featured?'/events/'+featured.id:'/tournaments'}>{featured?'למשחקים ולעדכונים':'לכל האירועים'} <ArrowUpLeft className="inline ms-2" size={17}/></Link></Button><Button asChild variant="outline" className="border-white/70 text-white bg-transparent hover:bg-white/10"><Link to="/all-stars">ליגת האולסטארז</Link></Button></div></div>
 <div className="hidden lg:block max-w-xs"><HeroArtwork/></div>
 </div></section>
 {selectedTeam&&<MyFavoriteTeam key={selectedTeam.id} team={{...selectedTeam,fanCount:favorite.counts[selectedTeam.id]??selectedTeam.fanCount}} overview={overview} live={live} updates={updates} overviewLoading={standingsLoading} overviewError={standingsError} updatesLoading={updatesBusy||(!updatesLoaded&&!updates.length&&!updatesError)} updatesError={updatesError||''}/>}
 <ActivePublicTournaments/>
 <LeagueSections leaders={leaders} standings={overview?.standings??[]} events={future} error={error} leadersLoading={leadersLoading} eventsLoading={eventsLoading} standingsLoading={standingsLoading} leadersError={leadersError} eventsError={eventsError} standingsError={standingsError}/>
 <AllStarsTeamsSection teams={teams} loadError={error} favorite={favorite}/>
 <section className="bg-navy-700 text-white py-9"><div className="container flex items-center justify-between flex-wrap gap-4"><div><h2 className="text-2xl font-extrabold">מצטרפים לחוג הפוקימון</h2><p>לימוד, משחק וחברים קרוב לבית</p></div><Button asChild variant="cta"><a href={TRIAL_REGISTRATION_URL} target="_blank" rel="noopener noreferrer">להרשמה לחוג</a></Button></div></section>
 </div>;
}

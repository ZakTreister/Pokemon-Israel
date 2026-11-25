import { Card } from '../components/ui/Card';
import ContentSwiper from '../components/ui/ContentSwiper';
import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Trophy, Newspaper, Users, Images, ArrowUpLeft } from 'lucide-react';
import UpdateAction from '../features/updates/components/UpdateAction';
import UpdateCarouselMedia from '../components/media/UpdateCarouselMedia';
import api from '../services/api';
import { useAppDispatch,useAppSelector } from '../hooks/redux';
import { fetchUpdates } from '../features/updates/updatesSlice';
import { getNationalRankings,type NationalRanking } from '../services/rankings';
import { eventsService } from '../services/events';
import type { FieldNewsItem } from '../types/gallery';
import type { EventSummary } from '../types/event';
import { requestError } from '../utils/requestError';
import { TRIAL_REGISTRATION_URL } from '../config/publicSite';
import AllStarsTeamsSection from '../components/teams/AllStarsTeamsSection';
import HeroArtwork from '../features/home/components/HeroArtwork';
import Button from '../components/ui/Button';
import RankingPodium from '../components/rankings/RankingPodium';
export default function HomePage(){
 const dispatch=useAppDispatch(),{updates}=useAppSelector(s=>s.updates);
 const [events,setEvents]=useState<EventSummary[]>([]),[leaders,setLeaders]=useState<NationalRanking[]>([]),[error,setError]=useState('');
 const [fieldNews,setFieldNews]=useState<FieldNewsItem[]>([]);
 useEffect(()=>{api.get<FieldNewsItem[]>('/api/field-news').then(r=>setFieldNews(Array.isArray(r.data)?r.data:[])).catch(e=>setError(requestError(e)));},[]);
 const favorite=typeof window==='undefined'?null:window.localStorage?.getItem('cardschool.favoriteTeam')||null;
 const [heroFixtures,setHeroFixtures]=useState<Array<{eventId:string;date:string;firstTeam:{id:string;name:string;logo:string};secondTeam:{id:string;name:string;logo:string}}>>([]);
 useEffect(()=>{dispatch(fetchUpdates());eventsService.list({pageSize:16}).then(r=>setEvents(r.items)).catch(e=>setError(requestError(e)));getNationalRankings({pageSize:3}).then(r=>setLeaders(r.rankings)).catch(()=>{});},[dispatch]);
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const future=events.filter(e=>e.startDate&&e.startDate.slice(0,10)>=today).sort((a,b)=>new Date(a.startDate!).getTime()-new Date(b.startDate!).getTime());
 const featured=future.find(e=>e.featured)||events.find(e=>e.featured)||future[0]||events[0];
 useEffect(()=>{if(featured?.category!=='all_stars'&&!favorite){setHeroFixtures([]);return;}let active=true;
   api.get<{fixtures:Array<{eventId:string;date:string;firstTeam:{id:string;name:string;logo:string};secondTeam:{id:string;name:string;logo:string}}>}>('/api/all-stars/overview').then(({data})=>{if(active)setHeroFixtures(data.fixtures||[]);}).catch(()=>{});
   return ()=>{active=false};
 },[featured?.id,featured?.category,favorite]);
 const favoriteEvents=new Set(heroFixtures.filter(f=>f.firstTeam.id===favorite||f.secondTeam.id===favorite).map(f=>f.eventId));
 const preferred=(u:FieldNewsItem)=>Number((u.eventIds||[]).some(id=>favoriteEvents.has(id)));
 const prioritizedNews=[...fieldNews].sort((a,b)=>preferred(b)-preferred(a)||new Date(b.date).getTime()-new Date(a.date).getTime());
 const featuredFixtures=featured?.category==='all_stars'?heroFixtures.filter(f=>f.eventId===featured.id).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()):[];
 const sortedUpdates=[...updates].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
 return <div>
 {!!sortedUpdates.length&&<aside aria-label="חדשות הליגה" className="cs-ticker py-3 text-white"><div className="container flex gap-4 items-center"><Newspaper className="shrink-0" size={20}/><strong className="shrink-0">חדשות הליגה</strong><div className="flex gap-6 overflow-x-auto whitespace-nowrap">{sortedUpdates.slice(0,6).map(u=><Link className="hover:text-gold" key={u.id} to={'/news/'+u.id}>{u.title} ←</Link>)}</div></div></aside>}
 <section className="relative overflow-hidden bg-hero-navy text-white">
 <div className="container grid items-center gap-4 lg:grid-cols-[1.5fr_0.5fr] py-7 sm:py-9">
 <div><p className="text-gold font-bold text-sm mb-2">מה קורה עכשיו ב־CardSchool?</p>
 <h1 className="text-3xl sm:text-5xl font-black leading-tight">{featured?featured.title:'המשחק שלך. הליגה שלנו.'}</h1>
 <p className="mt-3 max-w-xl text-blue-100">{featured?(featured.description||'בואו לגלות את האירוע, המשחקים והעדכונים האחרונים.'):'מגלים את הנבחרות, אירועי הליגה והדירוג הישראלי במקום אחד.'}</p>
 {!!featuredFixtures.length&&<div className={`mt-4 grid gap-4 ${featuredFixtures.length>1?"lg:grid-cols-2":""}`} aria-label="הנבחרות המתמודדות">{featuredFixtures.map(fixture=><div key={`${fixture.eventId}-${fixture.date}-${fixture.firstTeam.id}-${fixture.secondTeam.id}`} className="min-w-0 flex flex-wrap items-center gap-3 sm:gap-5">{[fixture.firstTeam,fixture.secondTeam].map((team,i)=><div key={team.id} className="flex items-center gap-2">{i===1&&<span className="font-black text-gold text-xl me-2">VS</span>}{team.logo&&<img className="h-12 w-12 object-contain" src={team.logo} alt={''}/>}<strong>{team.name}</strong></div>)}</div>)}</div>}
 {featured?.startDate&&<p className="mt-2 text-gold font-bold"><Calendar size={17} className="inline ms-1"/> {new Date(featured.startDate).toLocaleDateString('he-IL')}</p>}
 <div className="flex flex-wrap gap-3 mt-5"><Button asChild variant="cta"><Link to={featured?'/events/'+featured.id:'/tournaments'}>{featured?'למשחקים ולעדכונים':'לכל האירועים'} <ArrowUpLeft className="inline ms-2" size={17}/></Link></Button><Button asChild variant="outline" className="border-white/70 text-white bg-transparent hover:bg-white/10"><Link to="/all-stars">נבחרות All Stars</Link></Button></div></div>
 <div className="hidden lg:block max-w-xs"><HeroArtwork/></div>
 </div></section>
 <section className="container py-7 grid gap-3 sm:grid-cols-3">
 {([{to:'/rankings',title:'מצאו את עצמכם בדירוג',subtitle:'חפשו את השם שלכם',icon:<Trophy/>},{to:'/all-stars',title:'הכירו את הנבחרות',subtitle:'המשחקים, הדירוגים והיריבות',icon:<Users/>},{to:'/gallery',title:'גלריה',subtitle:'מה חדש מהאירועים ומהליגה',icon:<Images/>}] as const).map(x=><Link key={x.to} to={x.to} className="cs-public-card p-5 flex items-center justify-between gap-3 border-t-4 border-t-gold"><span className="flex flex-col gap-2"><strong className="text-lg">{x.title}</strong><span className="text-muted-foreground text-sm">{x.subtitle}</span></span><span className="shrink-0 [&>svg]:size-10 text-blue-500" aria-hidden="true">{x.icon}</span></Link>)}
 </section>
 <section className="bg-section-light py-10"><div className="container space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl sm:text-3xl font-extrabold">חדשות מהשטח</h2><Link to="/news" className="text-blue-500 font-bold">כל העדכונים ←</Link></div>
 <ContentSwiper variant="cards" label="גלגלת עדכונים">
 {prioritizedNews.slice(0,10).map(u=><Card key={u.kind+u.id} variant="public" role="article" className="overflow-hidden flex flex-col">
 <UpdateCarouselMedia update={u}/>
 <div className="p-4 flex flex-col flex-1 gap-2"><p className="text-xs text-blue-500">{new Date(u.date).toLocaleDateString('he-IL')}</p><h3 className="font-bold text-lg">{u.title}</h3><p className="line-clamp-2 text-muted-foreground">{u.description||u.content}</p><div className="mt-auto flex gap-3 flex-wrap"><Link to={u.href} className="text-blue-500 font-bold">לסיפור המלא ←</Link>{u.eventId&&<Link to={'/events/'+u.eventId} className="text-blue-500">לאירוע</Link>}</div>{u.kind==='update'&&<UpdateAction update={u}/>}</div></Card>)}
 </ContentSwiper>{!fieldNews.length&&<p>חדשות, תמונות וסרטונים יופיעו כאן לאחר הפרסום.</p>}</div></section>
 <AllStarsTeamsSection/>
 <section className="container py-10 space-y-4"><h2 className="text-2xl sm:text-3xl font-extrabold">מובילי הליגה הישראלית</h2><RankingPodium leaders={leaders}/><Button asChild variant="outline"><Link to="/rankings">איפה אתם בדירוג? חפשו את שמכם</Link></Button></section>
 <section className="container pb-12 space-y-4" aria-label="אירועים קרובים"><div className="flex justify-between items-center flex-wrap gap-3"><h2 className="text-2xl sm:text-3xl font-extrabold">אירועים קרובים</h2><Link to="/tournaments" className="text-blue-500 font-bold">כל האירועים ←</Link></div>{error&&<p role="alert">{error}</p>}
 <ContentSwiper variant="cards" label="גלגלת אירועים קרובים">{future.map(ev=><Link key={ev.id} to={'/events/'+ev.id} className="block min-w-0 h-full"><Card variant="public" className="p-5 hover:border-blue-500"><p className="text-xs text-blue-500">{ev.category==='club'?'חוגים':'אולסטארז'}</p><strong>{ev.title}</strong><p className="text-muted-foreground">{ev.startDate&&new Date(ev.startDate).toLocaleDateString('he-IL')}</p></Card></Link>)}</ContentSwiper>
 {!future.length&&<p className="text-muted-foreground">אירועים קרובים יופיעו כאן לאחר פרסומם.</p>}</section>
 <section className="bg-navy-700 text-white py-9"><div className="container flex items-center justify-between flex-wrap gap-4"><div><h2 className="text-2xl font-extrabold">מצטרפים לחוג הפוקימון</h2><p>לימוד, משחק וחברים קרוב לבית</p></div><Button asChild variant="cta"><a href={TRIAL_REGISTRATION_URL} target="_blank" rel="noopener noreferrer">להרשמה לחוג</a></Button></div></section>
 </div>;
}

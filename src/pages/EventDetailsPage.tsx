import { Card } from '../components/ui/Card';
import { useEffect,useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import { eventsService } from '../services/events';
import { publicTeams } from '../services/publicTeams';
import type { EventDetails } from '../types/event';
import type { Team } from '../types/team';
import { PageHero } from '../components/ui/PageHero';
import { requestError } from '../utils/requestError';
import Button from '../components/ui/Button';
import { MediaGallery } from '../components/media/MediaGallery';
import SafeHtml from '../components/content/SafeHtml';
export default function EventDetailsPage(){
 const {id=''}=useParams();
 return <EventDetails key={id} id={id}/>;
}
function EventDetails({id}:{id:string}){
 const [event,setEvent]=useState<EventDetails|null>(null),[error,setError]=useState(''),[teams,setTeams]=useState<Team[]>([]);
 useEffect(()=>{let active=true;eventsService.get(id).then(r=>{if(active)setEvent(r)}).catch(e=>{if(active)setError(requestError(e))});publicTeams.list().then(t=>{if(active)setTeams(t)}).catch(()=>{});return ()=>{active=false};},[id]);
 const name=(id:string)=>teams.find(t=>t.id===id)?.name||'נבחרת';
 if(error)return <div className="container py-8"><p role="alert" className="text-destructive">{error}</p></div>;
 if(!event)return null;
 const allStars=event.category==='all_stars';
 return <div><PageHero league={allStars?'allStars':'kids'} variant={allStars?'all-stars':'dark'} title={event.title} highlightWord="אירוע" subtitle={event.description}/>
 <div className="container py-8 space-y-8">
 <Link className="font-bold text-blue-500" to="/tournaments">→ לכל האירועים</Link>
 <>
 <div className={'grid gap-5 items-start '+(event.bodyHtml&&(event.mediaItems.length||event.coverUrl)?'md:grid-cols-2':'')}>
 {event.bodyHtml&&<Card variant="public" className="p-5" role="article" aria-label="תוכן האירוע"><SafeHtml html={event.bodyHtml}/></Card>}
 {event.mediaItems.length>0?<MediaGallery carousel items={event.mediaItems}/>:event.coverUrl?<img src={event.coverUrl} alt="" className="w-full max-h-96 object-cover rounded-xl" loading="lazy"/>:null}
 </div>
 <p className="text-sm font-bold text-blue-500">{event.category==='club'?'אירוע חוגים':'אירוע אולסטארז'} {event.startDate&&'· '+new Date(event.startDate).toLocaleDateString('he-IL')}</p>
 {(event.tournaments.length>0||event.fixtures?.some(f=>!f.tournamentId))&&<section className="space-y-3"><h2 className="text-2xl font-extrabold">טורנירי האירוע ותוצאות</h2>
 {event.tournaments.map(t=><Card key={t.id} variant="public" role="article" className="p-4 flex gap-3 flex-wrap justify-between items-center"><div><h3 className="font-bold">{t.title}</h3><p className="text-sm text-muted-foreground">{new Date(t.date).toLocaleDateString('he-IL')} · {t.lifecycle==='completed'?'הסתיים':t.lifecycle==='active'?'פעיל':'מתוכנן'}</p></div>{(t.type==='quarterly'||t.lifecycle==='completed')?<Button variant="outline" asChild><Link to={'/tournaments/'+t.id}>{t.lifecycle==='completed'?'צפו בתוצאות':'פרטים ומשחקים'}</Link></Button>:<span className="text-sm text-muted-foreground">התוצאות יפורסמו בסיום המפגש</span>}</Card>)}
 {event.fixtures?.filter(f=>!f.tournamentId).map(f=><Card key={f.id} variant="public" role="article" className="p-4"><strong>{name(f.firstTeam)} נגד {name(f.secondTeam)}</strong><p className="text-sm text-muted-foreground">{new Date(f.date).toLocaleString('he-IL')} {f.location} · מפגש מתוכנן</p></Card>)}</section>}
 {!!event.contentPages?.length&&<Card variant="public" role="region" aria-label="מידע נוסף" className="p-5 space-y-3"><h2 className="text-xl font-extrabold">מידע נוסף</h2>{event.contentPages.map(page=><Link key={page.id} to={'/content/'+page.id} className="block rounded-lg border p-3 hover:border-blue-500"><strong>{page.title}</strong>{page.subtitle&&<p className="text-sm text-muted-foreground">{page.subtitle}</p>}</Link>)}</Card>}
 {!!event.updates.length&&<section className="space-y-4"><h2 className="text-2xl font-extrabold">עדכונים מהאירוע</h2>
 {event.updates.map(u=><article key={u.id} className="cs-public-card p-5"><h3 className="font-bold text-xl">{u.title}</h3><p className="my-2 whitespace-pre-wrap line-clamp-3">{u.description||u.content}</p><Link className="text-blue-500 font-bold" to={'/news/'+u.id}>קראו את העדכון המלא ←</Link></article>)}
 </section>}
 </>
 </div></div>;
}

import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {publicTeams} from '../../services/publicTeams';
import type {Team} from '../../types/team';
import TeamCard from './TeamCard';
import {SectionHeading} from '../ui/SectionHeading';
import {LeagueLogo} from '../../features/siteSettings/LeagueLogo';
import {Shield} from 'lucide-react';
import {requestError} from '../../utils/requestError';
import {useFavoriteSelection} from '../../features/teams/hooks/useFavoriteTeam';
export function TeamFanCards({teams,favorite}:{teams:Team[];favorite:ReturnType<typeof useFavoriteSelection>}){
 return <>
  <p className="text-muted-foreground">לכל נבחרת יש קהל. בחרו את שלכם! סמנו כוכב ליד הנבחרת שאתם אוהדים, והמשחקים, התוצאות והעדכונים שלה יחכו לכם בדף הבית.</p>
  {favorite.message&&<p role="status" className="font-bold text-purple-700 dark:text-purple-300">{favorite.message}</p>}
  {favorite.error&&<p role="alert">{favorite.error}</p>}
  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
   {teams.map(team=><TeamCard key={team.id} team={{...team,fanCount:favorite.counts[team.id]??team.fanCount}} selected={favorite.selected===team.id} busy={favorite.busy} onSelect={t=>void favorite.select(t)}/>)}
  </div>
 </>;
}
export default function AllStarsTeamsSection({teams:provided,favorite:providedFavorite,loadError=''}:{teams?:Team[]|null;favorite?:ReturnType<typeof useFavoriteSelection>;loadError?:string}={}){
 const [teams,setTeams]=useState<Team[]|null>(null),[error,setError]=useState('');
 const ownFavorite=useFavoriteSelection();
 useEffect(()=>{if(provided!==undefined)return;let active=true;publicTeams.list().then(t=>{if(active)setTeams(t);}).catch(e=>{if(active)setError(requestError(e));});return()=>{active=false};},[provided]);
 const rows=provided===undefined?teams:provided;
 return <section id="choose-team" className="container py-10 scroll-mt-24 space-y-4">
  <SectionHeading icon={<LeagueLogo league="allStars" decorative className="size-10" fallback={<Shield size={22}/>}/>} title="איזו נבחרת אתם מעודדים?" subtitle="ליגת האולסטארז · נבחרות למתקדמים"/>
  <Link to="/all-stars" className="block font-bold text-purple-700 dark:text-purple-300">לכל הנבחרות והדירוגים ←</Link>
  {error||loadError?<p role="alert">{error||loadError}</p>:rows===null?<p role="status">טוען נבחרות...</p>:!rows.length?<p>נבחרות יופיעו כאן לאחר פתיחתן.</p>:<TeamFanCards teams={rows} favorite={providedFavorite??ownFavorite}/>}
 </section>;
}

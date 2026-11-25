import type {Fixture,Overview,Meeting} from '../../../services/allStars';
import type {Update} from '../../../types/update';
export const fixtureHasTeam=(f:Fixture,id:string)=>f.firstTeam.id===id||f.secondTeam.id===id;
export function updateForTeam(u:Update,id:string,fixtures:Fixture[]){
 if(u.teamIds?.length)return u.teamIds.includes(id);
 return !!u.eventId&&fixtures.some(f=>f.eventId===u.eventId&&fixtureHasTeam(f,id));
}
export function favoriteContent(id:string,overview:Overview|null,live:Meeting[],updates:Update[],now=Date.now()){
 const fixtures=overview?.fixtures??[];
 return {
  active:live.find(m=>m.teams.some(t=>t.id===id)),
  next:fixtures.filter(f=>fixtureHasTeam(f,id)&&f.phase!=='completed'&&f.phase!=='running'&&Date.parse(f.date)>=now).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))[0],
  last:overview?.recentMeetings.find(m=>m.teams.some(t=>t.id===id)),
  standing:overview?.standings.find(t=>t.id===id),
  update:updates.filter(u=>updateForTeam(u,id,fixtures)).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))[0],
 };
}

import { calculateInterTeamScore } from './interTeamScore.js';
const id=x=>String(x?._id??x);
export function isCountedLeagueMeeting(meeting, teamIds){
 return meeting.type==='inter_team'&&meeting.status==='completed'&&meeting.phase==='completed'&&
  meeting.interTeamSides?.length===2&&meeting.interTeamSides.every(side=>teamIds.has(id(side.team)));
}
export function teamLeagueStandings(teams,completedMeetings){
 const table=new Map(teams.map(t=>[id(t._id),{
  id:id(t._id),name:t.name,logo:t.toJSON?.().logo||'',played:0,wins:0,draws:0,losses:0,
  leaguePoints:0,gameWins:0,gameLosses:0,gameDifference:0,position:0,
 }]));
 for(const meeting of completedMeetings){
  if(!isCountedLeagueMeeting(meeting,table))continue;
  const results=calculateInterTeamScore(meeting);
  if(results.length!==2)continue;
  const [a,b]=results;
  const ta=table.get(a.team),tb=table.get(b.team);
  if(!ta||!tb)continue;
  const ap=a.matchWins*3+a.matchDraws,bp=b.matchWins*3+b.matchDraws;
  for(const [target,own,other,won,lost] of [[ta,a,b,ap,bp],[tb,b,a,bp,ap]]){
   target.played++;target.gameWins+=own.gameWins;target.gameLosses+=other.gameWins;
   target.gameDifference+=own.gameWins-other.gameWins;
   if(won>lost){target.wins++;target.leaguePoints+=3;}
   else if(won<lost){target.losses++;}
   else{target.draws++;target.leaguePoints+=1;}
  }
 }
 const rows=[...table.values()].sort((a,b)=>b.leaguePoints-a.leaguePoints||b.gameDifference-a.gameDifference||a.name.localeCompare(b.name,'he'));
 rows.forEach((row,i)=>{row.position=i>0&&row.leaguePoints===rows[i-1].leaguePoints&&row.gameDifference===rows[i-1].gameDifference?rows[i-1].position:i+1;});
 return rows;
}
export function leagueYearStart(now=new Date()){
 const y=now.getUTCFullYear();
 // All-Stars season starts in September. Compare local Israel calendar month.
 const local=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jerusalem',month:'numeric',year:'numeric'}).formatToParts(now);
 const get=type=>Number(local.find(p=>p.type===type)?.value);
 const startYear=get('month')>=9?get('year'):get('year')-1;
 return new Date(`${startYear}-08-31T21:00:00.000Z`);
}

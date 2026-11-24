import express from 'express';
import asyncHandler from 'express-async-handler';
import Team from '../models/teamModel.js';
import Tournament from '../models/tournamentModel.js';
import Event from '../models/eventModel.js';
import { publicTournament } from '../services/publicTournament.js';
import { calculateInterTeamScore } from '../services/interTeamScore.js';
import { teamLeagueStandings,leagueYearStart } from '../services/teamLeagueStandings.js';
const router=express.Router();
router.get('/overview',asyncHandler(async(req,res)=>{
 const [teams,meetings,internals,events]=await Promise.all([
   Team.find({isActive:true}).sort({normalizedName:1}),
   Tournament.find({type:'inter_team',status:'completed',date:{$gte:leagueYearStart()}}).select('interTeamSides playerParticipants rounds phase status type date eventId').sort({date:-1}),
   Tournament.find({type:'team_internal',status:'completed'}).sort({date:-1}).limit(12),
   Event.find({status:'published',category:'all_stars'}).select('title fixtures startDate').sort({startDate:-1}).limit(30),
 ]);
 const byId=new Map(teams.map(t=>[String(t._id),t]));
 const fixtures=events.flatMap(ev=>(ev.fixtures||[]).map(f=>({
  id:String(f._id),eventId:ev.id,eventTitle:ev.title,date:f.date,location:f.location||'',
  firstTeam:{id:String(f.firstTeam),name:byId.get(String(f.firstTeam))?.name||'',logo:byId.get(String(f.firstTeam))?.toJSON().logo||''},
  secondTeam:{id:String(f.secondTeam),name:byId.get(String(f.secondTeam))?.name||'',logo:byId.get(String(f.secondTeam))?.toJSON().logo||''},
  tournamentId:f.tournament?String(f.tournament):null,
 }))).filter(f=>f.firstTeam.name&&f.secondTeam.name).sort((a,b)=>new Date(a.date)-new Date(b.date));
 const recentMeetings=meetings.filter(t=>t.phase==='completed').slice(0,20).map(t=>{
   const sides=t.interTeamSides.map(s=>({id:String(s.team),name:byId.get(String(s.team))?.name||s.nameSnapshot||''}));
   const scores=calculateInterTeamScore(t);
   return {id:t.id,date:t.date,eventId:t.eventId?String(t.eventId):null,
    teams:sides,gameWins:scores.map(s=>s.gameWins),matchWins:scores.map(s=>s.matchWins)};
 });
 res.json({standings:teamLeagueStandings(teams,meetings),
  fixtures,recentMeetings,internalTournaments:internals.map(t=>publicTournament(t))});
}));
export default router;

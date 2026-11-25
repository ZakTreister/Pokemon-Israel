import express from 'express';
import asyncHandler from 'express-async-handler';
import Team from '../models/teamModel.js';
import Tournament from '../models/tournamentModel.js';
import Event from '../models/eventModel.js';
import { publicTournament } from '../services/publicTournament.js';
import { calculateInterTeamScore } from '../services/interTeamScore.js';
import { teamLeagueStandings,leagueYearStart,isCountedLeagueMeeting } from '../services/teamLeagueStandings.js';
import { leagueRankingFreshness } from '../services/rankingFreshness.js';
const router=express.Router();
router.get('/overview',asyncHandler(async(req,res)=>{
 const [teams,sourceMeetings,internals,events]=await Promise.all([
   Team.find({isActive:true}).sort({normalizedName:1}),
   Tournament.find({type:'inter_team',status:'completed',date:{$gte:leagueYearStart()}}).setOptions({includeDeleted:true}).select('interTeamSides playerParticipants rounds phase status type date eventId updatedAt createdAt closedAt deletedAt').sort({date:-1}),
   Tournament.find({type:'team_internal',status:'completed'}).sort({date:-1}).limit(12),
   Event.find({status:'published',category:'all_stars'}).select('title fixtures startDate openingRound').sort({startDate:-1}).limit(30),
 ]);
 const byId=new Map(teams.map(t=>[String(t._id),t]));
 const meetings=sourceMeetings.filter(t=>!t.deletedAt);
 const lastUpdatedAt=leagueRankingFreshness(sourceMeetings.filter(t=>isCountedLeagueMeeting(t,byId)));
 const eventById=new Map(events.map(ev=>[String(ev._id),ev]));
 const scheduled=await Tournament.find({type:'inter_team',eventId:{$in:events.map(ev=>ev._id)}}).select('interTeamSides date location eventId').sort({date:1});
 const teamSummary=(side)=>({id:String(side.team),name:byId.get(String(side.team))?.name||side.nameSnapshot||'',logo:byId.get(String(side.team))?.toJSON().logo||side.logoSnapshot||''});
 const canonical=scheduled.filter(t=>t.interTeamSides.length===2).map(t=>{
   const ev=eventById.get(String(t.eventId));
   return {id:t.id,eventId:ev.id,eventTitle:ev.title,openingRound:!!ev.openingRound,eventStartDate:ev.startDate,date:t.date,location:t.location||'',
     firstTeam:teamSummary(t.interTeamSides[0]),secondTeam:teamSummary(t.interTeamSides[1]),tournamentId:t.id};
 });
 // Only unconverted legacy fixtures are retained as a temporary read fallback.
 const legacy=events.flatMap(ev=>(ev.fixtures||[]).filter(f=>!f.tournament).map(f=>({
  id:String(f._id),eventId:ev.id,eventTitle:ev.title,openingRound:!!ev.openingRound,eventStartDate:ev.startDate,date:f.date,location:f.location||'',
  firstTeam:{id:String(f.firstTeam),name:byId.get(String(f.firstTeam))?.name||'',logo:byId.get(String(f.firstTeam))?.toJSON().logo||''},
  secondTeam:{id:String(f.secondTeam),name:byId.get(String(f.secondTeam))?.name||'',logo:byId.get(String(f.secondTeam))?.toJSON().logo||''},
  tournamentId:f.tournament?String(f.tournament):null,
 }))).filter(f=>f.firstTeam.name&&f.secondTeam.name);
 const fixtures=[...canonical,...legacy].sort((a,b)=>new Date(a.date)-new Date(b.date));
 const recentMeetings=meetings.filter(t=>t.phase==='completed').slice(0,20).map(t=>{
   const sides=t.interTeamSides.map(s=>({id:String(s.team),name:byId.get(String(s.team))?.name||s.nameSnapshot||''}));
   const scores=calculateInterTeamScore(t);
   return {id:t.id,date:t.date,eventId:t.eventId?String(t.eventId):null,
    teams:sides,gameWins:scores.map(s=>s.gameWins),matchWins:scores.map(s=>s.matchWins)};
 });
 res.json({standings:teamLeagueStandings(teams,meetings),lastUpdatedAt,
  fixtures,recentMeetings,internalTournaments:internals.map(t=>publicTournament(t))});
}));
export default router;

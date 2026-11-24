import express from 'express';
import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';
import Event from '../models/eventModel.js';
import Team from '../models/teamModel.js';
import Player from '../models/playerModel.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { SWISS_POLICY, calculateStandings, validateScore } from '../services/swiss.js';
import { planInterTeamRound, validateInterTeamPairings } from '../services/interTeamPairings.js';
import { notifyTournament } from '../services/tournamentLive.js';
import { createRoundTimer, stopRoundTimer } from '../services/roundTimer.js';
import { getRoundTimer, updateRoundTimer } from '../controllers/roundTimerController.js';
import { calculateInterTeamScore } from '../services/interTeamScore.js';

const router = express.Router();
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const fail = (code, message) => { const error = new Error(message); error.statusCode = code; throw error; };
const serial = doc => ({
  ...doc.toJSON(),
  standings: calculateStandings(doc.playerParticipants, doc.rounds),
  teamScore: calculateInterTeamScore(doc),
});
const get = async id => {
  if (!validId(id)) fail(404, 'המפגש לא נמצא');
  const doc = await Tournament.findOne({ _id: id, type:'inter_team', engineVersion:'swiss-v1' });
  if (!doc) fail(404,'המפגש לא נמצא');
  return doc;
};
async function save(req, doc, updates) {
  if (!Number.isInteger(req.body.expectedRevision) || req.body.expectedRevision !== doc.revision)
    fail(409,'המפגש עודכן על ידי שופט אחר. יש לרענן את העמוד');
  if (doc.phase === 'completed') fail(409,'המפגש הסתיים');
  const updated = await Tournament.findOneAndUpdate(
    { _id:doc._id, type:'inter_team', revision:doc.revision, phase:{$ne:'completed'} },
    { $set: updates, $inc:{ revision:1 } }, { new:true, runValidators:true });
  if (!updated) fail(409,'המפגש השתנה במקביל. יש לרענן');
  notifyTournament(req,updated);
  return serial(updated);
}
const snapshot = player => ({
  player:player._id, team:player.team,
  nameSnapshot:`${player.firstName} ${player.lastName}`, citySnapshot:player.city || '',
});

router.use(protect,authorize('admin','judge'));
router.get('/',asyncHandler(async(req,res)=>{
  const rows=await Tournament.find({type:'inter_team',engineVersion:'swiss-v1'})
    .select('title date type phase status interTeamSides revision').sort({date:-1}).limit(100);
  res.json(rows);
}));
router.post('/',asyncHandler(async(req,res)=>{
  const teamIds=req.body.teamIds;
  if (!Array.isArray(teamIds)||teamIds.length!==2||!teamIds.every(validId)||teamIds[0]===teamIds[1])
    fail(400,'יש לבחור שתי נבחרות שונות');

  let event=null,fixture=null;
  if(req.body.eventId!==undefined || req.body.fixtureId!==undefined){
    if(!validId(req.body.eventId)||!validId(req.body.fixtureId))
      fail(400,'אירוע ומפגש מתוכנן נדרשים');
    event=await Event.findById(req.body.eventId);
    if(!event||event.category!=='all_stars')fail(400,'אירוע אולסטארז לא נמצא');
    fixture=event.fixtures.id(req.body.fixtureId);
    if(!fixture)fail(404,'המפגש המתוכנן לא נמצא');
    const planned=[String(fixture.firstTeam),String(fixture.secondTeam)].sort().join(',');
    if(planned!==[...teamIds].sort().join(','))
      fail(400,'נבחרות המפגש אינן תואמות לתכנון');
    if(fixture.tournament){
      const existing=await Tournament.findOne({_id:fixture.tournament,eventId:event._id,type:'inter_team'});
      if(!existing)fail(409,'המפגש משויך לטורניר שאינו זמין');
      return res.json(serial(existing));
    }
  }
  const teams=await Team.find({_id:{$in:teamIds},isActive:true});
  if (teams.length!==2) fail(400,'יש לבחור שתי נבחרות פעילות');
  const players=await Player.find({team:{$in:teamIds},playerType:'team',isActive:true,
    teamMembershipStatus:{$ne:'dismissed'}}).sort({firstName:1,lastName:1,_id:1});
  if (teamIds.some(id=>!players.some(p=>String(p.team)===id))) fail(400,'לכל נבחרת נדרש שחקן פעיל');
  if (players.length > 128) fail(400,'ניתן לפתוח מפגש עם עד 128 משתתפים');
  const ordered=teamIds.map(id=>teams.find(t=>String(t._id)===id));
  const now=new Date();
  const doc=await Tournament.create({
    type:'inter_team',engineVersion:'swiss-v1',scoringPolicy:SWISS_POLICY,
    title:`${ordered[0].name} מול ${ordered[1].name}`,
    description:'מפגש בין נבחרות',date:now,registrationDeadline:now,
    location:ordered.map(t=>t.name).join(' / '),image:ordered[0].toJSON().logo||'/pokemon_kids_logo.png',
    maxParticipants:128,currentParticipants:players.length,source:'live',phase:'setup',
    status:'upcoming',createdBy:req.user._id,
    ...(event?{eventId:event._id}:{}),
    interTeamSides:ordered.map(t=>({team:t._id,nameSnapshot:t.name,logoSnapshot:t.toJSON().logo})),
    playerParticipants:players.map(snapshot),
    nextRoundParticipantIds:players.map(p=>p._id),
  });
  if(event&&fixture){
    const result=await Event.updateOne({
      _id:event._id,fixtures:{$elemMatch:{_id:fixture._id,tournament:null}}
    },{$set:{'fixtures.$.tournament':doc._id}});
    if(!result.modifiedCount){
      await doc.deleteOne();
      const fresh=await Event.findById(event._id);
      const matched=fresh?.fixtures.id(fixture._id);
      if(matched?.tournament){
        const existing=await Tournament.findOne({_id:matched.tournament,eventId:event._id,type:'inter_team'});
        if(existing) return res.json(serial(existing));
      }
      fail(409,'המפגש כבר הופעל או עודכן במקביל');
    }
  }
  res.status(201).json(serial(doc));
}));
router.get('/active',asyncHandler(async(req,res)=>{
  const rows=await Tournament.find({
    type:'inter_team',engineVersion:'swiss-v1',source:'live',status:'upcoming',
    phase:{$in:['setup','running']},
  }).select('title phase interTeamSides rounds.number updatedAt')
    .sort({updatedAt:-1,_id:-1}).limit(30);
  res.json(rows.map(row=>({
    id:row.id,title:row.title,phase:row.phase,
    teamNames:row.interTeamSides.map(side=>side.nameSnapshot),
    roundNumber:row.rounds.length ? row.rounds[row.rounds.length-1].number : 0,
  })));
}));
const interTeamTimerScope = (req, res, next) => { req.timerType = 'inter_team'; next(); };
router.get('/:id/rounds/:roundNumber/timer', interTeamTimerScope, getRoundTimer);
router.put('/:id/rounds/:roundNumber/timer', interTeamTimerScope, updateRoundTimer);
router.get('/:id',asyncHandler(async(req,res)=>res.json(serial(await get(req.params.id)))));
router.put('/:id/participants',asyncHandler(async(req,res)=>{
  const doc=await get(req.params.id);
  const ids=req.body.playerIds;
  if (!Array.isArray(ids)||ids.length<2||ids.length>128||!ids.every(validId)||new Set(ids).size!==ids.length)
    fail(400,'בחירת משתתפים אינה חוקית');
  const teamIds=doc.interTeamSides.map(side=>String(side.team));
  const players=await Player.find({_id:{$in:ids},team:{$in:teamIds},playerType:'team',isActive:true,
    teamMembershipStatus:{$ne:'dismissed'}});
  if (players.length!==ids.length||teamIds.some(team=>!players.some(p=>String(p.team)===team)))
    fail(400,'נדרשים שחקנים פעילים משתי הנבחרות');
  const known=new Set(doc.playerParticipants.map(p=>String(p.player)));
  const participants=[...doc.playerParticipants.map(p=>p.toObject()),...players.filter(p=>!known.has(String(p._id))).map(snapshot)];
  res.json(await save(req,doc,{playerParticipants:participants,nextRoundParticipantIds:ids,currentParticipants:ids.length}));
}));
router.post('/:id/rounds',asyncHandler(async(req,res)=>{
  const doc=await get(req.params.id);
  if (doc.rounds.length>=16) fail(400,'ניתן לקיים עד 16 סבבים');
  let plan;
  try {
    plan=planInterTeamRound({participants:doc.playerParticipants,rounds:doc.rounds,
      teamIds:doc.interTeamSides.map(s=>s.team),eligibleIds:doc.nextRoundParticipantIds});
  } catch(error){fail(400,error.message);}
  const now=new Date();
  const previousTimer=doc.roundTimers?.get(String(doc.rounds.length));
  const round={number:doc.rounds.length+1,createdAt:now,createdBy:req.user._id,...plan};
  res.json(await save(req,doc,{phase:'running',
    rounds:[...doc.rounds.map(r=>r.toObject()),round],
    [`roundTimers.${round.number}`]:createRoundTimer(previousTimer?.durationSeconds),
    ...(previousTimer?.status==='running'?{
      [`roundTimers.${round.number-1}`]:stopRoundTimer(previousTimer,now),
    }:{}),
  }));
}));
router.put('/:id/rounds/:number/pairings',asyncHandler(async(req,res)=>{
  const doc=await get(req.params.id);
  const rounds=doc.rounds.map(r=>r.toObject());
  const latest=rounds.at(-1);
  if (!latest||latest.number!==Number(req.params.number)||doc.phase!=='running')
    fail(409,'ניתן לערוך רק את הסבב האחרון');
  if (latest.matches.some(m=>m.result)) fail(409,'אי אפשר לערוך צימודים לאחר הזנת תוצאות');
  const incoming=req.body.matches;
  if (!Array.isArray(incoming)||incoming.length!==latest.matches.length)
    fail(400,'יש לשמור על מספר הצימודים');
  const oldIds=new Set(latest.matches.map(m=>String(m._id)));
  const incomingIds=incoming.map(m=>m.matchId);
  if (new Set(incomingIds).size!==oldIds.size||incomingIds.some(id=>!oldIds.has(id)))
    fail(400,'רשימת המשחקים אינה תואמת');
  const mapped=incoming.map(row=>({
    ...latest.matches.find(m=>String(m._id)===row.matchId),
    player1:row.player1,player2:row.player2,table:row.table,
  }));
  const oldBench=latest.benchPlayerIds.map(String);
  const incomingBench=req.body.benchPlayerIds===undefined ? oldBench : req.body.benchPlayerIds;
  if (!Array.isArray(incomingBench)||incomingBench.length!==oldBench.length||
      !incomingBench.every(validId)||new Set(incomingBench).size!==incomingBench.length)
    fail(400,'רשימת הספסל אינה חוקית');
  const benchChanged=oldBench.slice().sort().join(',')!==incomingBench.slice().sort().join(',');
  // Ordinary pairing swaps are available to judges; changing the bench is
  // reserved for an administrator, including when calling the API directly.
  if (benchChanged&&req.user.role!=='admin')
    fail(403,'רק מנהל יכול לשנות את הרכב הספסל');
  const previousBench=new Set(rounds.slice(0,-1).flatMap(round=>round.benchPlayerIds.map(String)));
  const newlyBenched=new Set(incomingBench.filter(player=>!oldBench.includes(player)));
  // Manual admin override is intentional; track repeated bench turns without
  // requiring an extra approval flag or confirmation dialog.
  const repeated=[...newlyBenched].filter(player=>previousBench.has(player));
  const existing=[...latest.matches.flatMap(m=>[String(m.player1),String(m.player2)]),...oldBench].sort();
  const proposed=[...mapped.flatMap(m=>[String(m.player1),String(m.player2)]),...incomingBench].sort();
  if (existing.join(',')!==proposed.join(',')||
      new Set(mapped.map(m=>m.table)).size!==mapped.length||
      mapped.some(m=>!Number.isInteger(m.table)||m.table<1||m.table>mapped.length))
    fail(400,'כל שחקן חייב להישאר בדיוק פעם אחת בסבב');
  try {validateInterTeamPairings(mapped,doc.playerParticipants,doc.interTeamSides.map(s=>s.team),incomingBench);}
  catch(error){fail(400,error.message);}
  latest.matches=mapped.sort((a,b)=>a.table-b.table);
  latest.benchPlayerIds=incomingBench;
  if (benchChanged) {
    latest.manualBenchOverride=repeated.length ? {
      approvedBy:req.user._id,approvedAt:new Date(),repeatedPlayerIds:repeated,
    } : undefined;
  }
  res.json(await save(req,doc,{rounds}));
}));
router.put('/:id/rounds/:number/matches/:matchId',asyncHandler(async(req,res)=>{
  const doc=await get(req.params.id);
  const rounds=doc.rounds.map(r=>r.toObject());
  const round=rounds.at(-1);
  if (!round || round.number!==Number(req.params.number) || doc.phase!=='running')
    fail(409,'ניתן לערוך תוצאות רק בסבב הפעיל האחרון');
  const match=round.matches.find(m=>String(m._id)===req.params.matchId);
  if (!match||!match.player2) fail(404,'משחק לא נמצא');
  let result;
  try {result=validateScore(req.body.result);} catch(error){fail(400,error.message);}
  match.resultRevision=(match.resultRevision||0)+1;
  match.result={...result,enteredBy:req.user._id,enteredAt:new Date()};
  res.json(await save(req,doc,{rounds,phase:'running'}));
}));
router.post('/:id/close',asyncHandler(async(req,res)=>{
  const doc=await get(req.params.id);
  if (!doc.rounds.length||doc.rounds.some(r=>r.matches.some(m=>!m.result)))
    fail(409,'יש להשלים את כל התוצאות לפני סיום המפגש');
  const previousTimer=doc.roundTimers?.get(String(doc.rounds.length));
  res.json(await save(req,doc,{phase:'completed',status:'completed',
    ...(previousTimer?.status==='running'?{
      [`roundTimers.${doc.rounds.length}`]:stopRoundTimer(previousTimer),
    }:{}),
    closedAt:new Date(),
    closedBy:req.user._id,finalStandings:calculateStandings(doc.playerParticipants,doc.rounds)}));
}));
export default router;

import express from 'express';
import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';
import Team from '../models/teamModel.js';
import Player from '../models/playerModel.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { SWISS_POLICY, calculateStandings, validateScore } from '../services/swiss.js';
import { planInterTeamRound, validateInterTeamPairings } from '../services/interTeamPairings.js';
import { notifyTournament } from '../services/tournamentLive.js';

const router = express.Router();
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const fail = (code, message) => { const error = new Error(message); error.statusCode = code; throw error; };
const matchId = match => String(match._id);
const serial = doc => ({
  ...doc.toJSON(),
  standings: calculateStandings(doc.playerParticipants, doc.rounds),
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

router.get('/public/:id', asyncHandler(async(req,res)=>{
  const doc=await get(req.params.id);
  res.json({
    id:doc.id, title:doc.title, type:doc.type, phase:doc.phase, status:doc.status,
    date:doc.date, teams:doc.interTeamSides, revision:doc.revision,
    participants:doc.playerParticipants.map(p=>({player:p.player,nameSnapshot:p.nameSnapshot,team:p.team})),
    rounds:doc.rounds.map(r=>({number:r.number,benchPlayerIds:r.benchPlayerIds,matches:r.matches.map(m=>({
      id:m.id,table:m.table,player1:m.player1,player2:m.player2,result:m.result,
    }))})),
    standings:calculateStandings(doc.playerParticipants,doc.rounds),
  });
}));
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
  const teams=await Team.find({_id:{$in:teamIds},isActive:true});
  if (teams.length!==2) fail(400,'יש לבחור שתי נבחרות פעילות');
  const players=await Player.find({team:{$in:teamIds},playerType:'team',isActive:true,
    teamMembershipStatus:{$ne:'dismissed'}}).sort({firstName:1,lastName:1,_id:1});
  if (teamIds.some(id=>!players.some(p=>String(p.team)===id))) fail(400,'לכל נבחרת נדרש שחקן פעיל');
  const ordered=teamIds.map(id=>teams.find(t=>String(t._id)===id));
  const now=new Date();
  const doc=await Tournament.create({
    type:'inter_team',engineVersion:'swiss-v1',scoringPolicy:SWISS_POLICY,
    title:`${ordered[0].name} מול ${ordered[1].name}`,
    description:'מפגש בין נבחרות',date:now,registrationDeadline:now,
    location:ordered.map(t=>t.name).join(' / '),image:ordered[0].toJSON().logo||'/pokemon_kids_logo.png',
    maxParticipants:128,currentParticipants:players.length,source:'live',phase:'setup',
    status:'upcoming',createdBy:req.user._id,
    interTeamSides:ordered.map(t=>({team:t._id,nameSnapshot:t.name,logoSnapshot:t.toJSON().logo})),
    playerParticipants:players.map(snapshot),
    nextRoundParticipantIds:players.map(p=>p._id),
  });
  res.status(201).json(serial(doc));
}));
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
  const round={number:doc.rounds.length+1,createdAt:new Date(),createdBy:req.user._id,...plan};
  res.json(await save(req,doc,{phase:'running',rounds:[...doc.rounds.map(r=>r.toObject()),round]}));
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
  const existing=[...latest.matches.flatMap(m=>[String(m.player1),String(m.player2)]),...latest.benchPlayerIds.map(String)].sort();
  const proposed=[...mapped.flatMap(m=>[String(m.player1),String(m.player2)]),...latest.benchPlayerIds.map(String)].sort();
  if (existing.join(',')!==proposed.join(',')||
      new Set(mapped.map(m=>m.table)).size!==mapped.length||
      mapped.some(m=>!Number.isInteger(m.table)||m.table<1||m.table>mapped.length))
    fail(400,'כל שחקן חייב להישאר בדיוק פעם אחת בסבב');
  try {validateInterTeamPairings(mapped,doc.playerParticipants,doc.interTeamSides.map(s=>s.team),latest.benchPlayerIds);}
  catch(error){fail(400,error.message);}
  latest.matches=mapped.sort((a,b)=>a.table-b.table);
  res.json(await save(req,doc,{rounds}));
}));
router.put('/:id/rounds/:number/matches/:matchId',asyncHandler(async(req,res)=>{
  const doc=await get(req.params.id);
  const rounds=doc.rounds.map(r=>r.toObject());
  const round=rounds.find(r=>r.number===Number(req.params.number));
  const match=round?.matches.find(m=>String(m._id)===req.params.matchId);
  if (!match||!match.player2) fail(404,'משחק לא נמצא');
  let result;
  try {result=validateScore(req.body.result);} catch(error){fail(400,error.message);}
  match.result={...result,enteredBy:req.user._id,enteredAt:new Date()};
  res.json(await save(req,doc,{rounds,phase:'running'}));
}));
router.post('/:id/close',asyncHandler(async(req,res)=>{
  const doc=await get(req.params.id);
  if (!doc.rounds.length||doc.rounds.some(r=>r.matches.some(m=>!m.result)))
    fail(409,'יש להשלים את כל התוצאות לפני סיום המפגש');
  res.json(await save(req,doc,{phase:'completed',status:'completed',closedAt:new Date(),
    closedBy:req.user._id,finalStandings:calculateStandings(doc.playerParticipants,doc.rounds)}));
}));
export default router;

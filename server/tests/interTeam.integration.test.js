import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as connectSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Team from '../models/teamModel.js';
import Player from '../models/playerModel.js';
import Tournament from '../models/tournamentModel.js';
import interTeamRoutes from '../routes/interTeamRoutes.js';
import { configureTournamentLive } from '../services/tournamentLive.js';
import { errorHandler } from '../middleware/errorMiddleware.js';

const dbName = `inter_team_test_${randomUUID().replaceAll('-', '')}`;
const tokens = {};
let server, io, origin, socket;

async function request(path, method = 'GET', body, role = 'judge') {
  const response = await fetch(`${origin}/api/inter-team${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
async function ok(path, method = 'GET', body, role = 'judge', status = 200) {
  const result = await request(path, method, body, role);
  assert.equal(result.status, status, JSON.stringify(result.body));
  return result.body;
}
function delayPromise(ms, description) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out: ${description}`)), ms));
}

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  await mongoose.connect(process.env.STAGE_A_TEST_MONGO_URI || 'mongodb://127.0.0.1:27017', {
    dbName,
  });
  await Promise.all([User.init(), Team.init(), Player.init(), Tournament.init()]);
  for (const role of ['admin', 'judge']) {
    const user = await User.create({
      username: `meeting-${role}`, name: `Meeting ${role}`,
      role, password: randomBytes(24).toString('hex'),
    });
    tokens[role] = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
  }
  const app = express();
  app.use(express.json());
  app.use('/api/inter-team', interTeamRoutes);
  app.use(errorHandler);
  server = createServer(app);
  io = new Server(server);
  configureTournamentLive(io);
  app.set('io', io);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  socket?.disconnect();
  if (io) await new Promise(resolve => io.close(resolve));
  else if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test('end-to-end inter-team API, manual swaps, rotating bench, live viewer and closure', { timeout: 25000 }, async () => {
  const admin = await User.findOne({ role:'admin' });
  const teams = await Team.create([
    { name:'Alpha Club', createdBy:admin._id },
    { name:'Beta Club', createdBy:admin._id },
  ]);
  const players = [];
  for (const [index, team] of teams.entries()) {
    for (let j = 0; j < (index===0 ? 5 : 3); j++) {
      players.push(await Player.create({
        firstName: `Player${index}${j}`, lastName:'Test', playerType:'team',
        city:'Test City', team:team._id, isActive:true,
      }));
    }
  }
  assert.equal((await request('/', 'POST', {teamIds:teams.map(t=>t.id)},null)).status,401);
  const created = await ok('/', 'POST', { teamIds:teams.map(t=>t.id) }, 'judge', 201);
  assert.equal(created.phase,'setup');
  assert.equal(created.interTeamSides.length,2);
  assert.equal(created.playerParticipants.length,8);
  assert.equal((await request(`/public/${created.id}`, 'GET', undefined, null)).status,404);

  const first = await ok(`/${created.id}/rounds`, 'POST', {
    expectedRevision: created.revision,
  });
  assert.equal(first.phase,'running');
  assert.equal(first.rounds.length,1);
  assert.equal(first.rounds[0].matches.length,3);
  assert.equal(first.rounds[0].benchPlayerIds.length,2);
  assert.ok(first.rounds[0].matches.every(m=>m.player2 && String(m.player1)!==String(m.player2)));

  const publicOne = await ok(`/public/${created.id}`,'GET',undefined,null);
  assert.equal(publicOne.rounds[0].matches.length,3);
  assert.equal(publicOne.rounds[0].benchPlayerIds.length,2);
  const publicText = JSON.stringify(publicOne);
  for(const player of players) assert.ok(!publicText.includes(player.id),'public player ID leaked');
  for(const team of teams) assert.ok(!publicText.includes(team.id),'public team ID leaked');

  const firstMatches=first.rounds[0].matches;
  const swapped=firstMatches.map((m,index)=>({
    matchId:m._id,
    table:m.table,
    player1:index===0?String(firstMatches[1].player1):index===1?String(firstMatches[0].player1):String(m.player1),
    player2:String(m.player2),
  }));
  const bad=swapped.map((m,index)=>index===0?{...m,player1:m.player2,player2:m.player1}:m);
  assert.equal((await request(`/${created.id}/rounds/1/pairings`,'PUT',{
    matches:bad,expectedRevision:first.revision,
  })).status,400);
  const edited=await ok(`/${created.id}/rounds/1/pairings`,'PUT',{
    matches:swapped,expectedRevision:first.revision,
  });
  assert.equal(String(edited.rounds[0].matches[0].player1),swapped[0].player1);

  socket=connectSocket(origin,{transports:['websocket'],reconnection:false,timeout:5000});
  const subscription=new Promise((resolve,reject)=>{
    socket.on('connect_error',reject);
    socket.on('connect',()=>socket.emit('tournament:public:subscribe',created.id,ack=>{
      if(ack?.ok)resolve(); else reject(new Error('Public live subscription rejected'));
    }));
  });
  await Promise.race([subscription,delayPromise(5000,'public Socket.IO subscription')]);

  let latest=edited;
  for(const [index, match] of latest.rounds[0].matches.entries()) {
    const event=index===0?new Promise((resolve,reject)=>{
      socket.once('tournament:public:updated',resolve);
      setTimeout(()=>reject(new Error('No public live event')),5000);
    }):null;
    latest=await ok(`/${created.id}/rounds/1/matches/${match._id}`,'PUT',{
      expectedRevision:latest.revision,
      result:{winner:index===0?'player1':'draw',score1:index===0?2:1,score2:index===0?0:1,drawnGames:0},
    });
    if(event)await event;
  }
  assert.equal(latest.teamScore[0].matchWins,1);
  assert.equal(latest.teamScore[1].matchWins,0);
  assert.equal(latest.teamScore[0].gameWins,4);

  const second=await ok(`/${created.id}/rounds`,'POST',{
    expectedRevision:latest.revision,
  });
  assert.equal(second.rounds.length,2);
  const firstBench=new Set(first.rounds[0].benchPlayerIds.map(String));
  assert.ok(second.rounds[1].benchPlayerIds.every(player=>!firstBench.has(String(player))));
  assert.equal((await request(`/${created.id}/rounds/1/matches/${firstMatches[0]._id}`,'PUT',{
    expectedRevision:second.revision,
    result:{winner:'draw',score1:1,score2:1,drawnGames:0},
  })).status,409);
  assert.equal((await request(`/${created.id}/close`,'POST',{expectedRevision:second.revision})).status,409);

  latest=second;
  for(const match of second.rounds[1].matches) {
    latest=await ok(`/${created.id}/rounds/2/matches/${match._id}`,'PUT',{
      expectedRevision:latest.revision,
      result:{winner:'player2',score1:1,score2:2,drawnGames:0},
    });
  }
  const done=await ok(`/${created.id}/close`,'POST',{
    expectedRevision:latest.revision,
  });
  assert.equal(done.phase,'completed');
  assert.equal(done.status,'completed');
  assert.equal(done.teamScore[1].matchWins,3);
  assert.equal((await request(`/${created.id}/rounds`,'POST',{expectedRevision:done.revision})).status,409);
  const publicDone=await ok(`/public/${created.id}`,'GET',undefined,null);
  assert.equal(publicDone.phase,'completed');
});

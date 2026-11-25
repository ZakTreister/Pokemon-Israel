import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as connectSocket } from 'socket.io-client';
import { configureTournamentLive, notifyTournament } from '../services/tournamentLive.js';
import seasonRoutes from '../routes/seasonRoutes.js';
import updateRoutes from '../routes/updateRoutes.js';
import mediaRoutes from '../routes/mediaRoutes.js';
import { getNationalRankings } from '../controllers/rankingController.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Player from '../models/playerModel.js';
import Team from '../models/teamModel.js';
import Tournament from '../models/tournamentModel.js';
import Season from '../models/seasonModel.js';
import BadgeDefinition from '../models/badgeDefinitionModel.js';
import BadgeAward from '../models/badgeAwardModel.js';
import MediaUpload from '../models/mediaUploadModel.js';
import '../models/deckModel.js';
import teamRoutes from '../routes/teamRoutes.js';
import playerRoutes from '../routes/playerRoutes.js';
import internalRoutes from '../routes/internalTournamentRoutes.js';
import tournamentRoutes from '../routes/tournamentRoutes.js';
import badgeRoutes from '../routes/badgeRoutes.js';
import { getAllStarsRankings } from '../controllers/internalTournamentController.js';
import { errorHandler } from '../middleware/errorMiddleware.js';
let server, origin, live;
const tokens = {};
const staffIds = {};
const mediaObjects = new Map();
const removedMedia = [];
let cleanupFails = false;
let tamperOnCopy = false;
const mediaStorage = {
  presign: async ({key,contentType,size}) => ({url:'https://s3.example/upload',fields:{key,'Content-Type':contentType,size:String(size)}}),
  inspect: async key => { const object=mediaObjects.get(key);if(!object)throw new Error('Object not found');return {...object,etag:createHash('sha256').update(object.bytes).digest('hex'),prefix:object.bytes.subarray(0,12)}; },
  promote: async (from,to,type,etag) => {if(tamperOnCopy){tamperOnCopy=false;mediaObjects.set(from,{bytes:Buffer.alloc(png.length,60),size:png.length,contentType:'image/png'});}if(createHash('sha256').update(mediaObjects.get(from).bytes).digest('hex')!==etag) throw new Error('Object changed during verification');mediaObjects.set(to,mediaObjects.get(from));},
  remove: async key => {if(cleanupFails)throw new Error('Cleanup unavailable');removedMedia.push(key);mediaObjects.delete(key);},
  readUrl: async key => `https://s3.example/private-preview?object=${encodeURIComponent(key)}&expires=300`,
};
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6n4kAAAAASUVORK5CYII=','base64');
async function uploaded(purpose,entityId,playerType) {
  const grant = await ok('/media/presign','POST',{purpose,...(entityId?{entityId}:{}),playerType,contentType:'image/png',size:png.length},'admin',201);
  mediaObjects.set(grant.upload.fields.key,{bytes:png,size:png.length,contentType:'image/png'});
  return ok(`/media/${grant.uploadId}/complete`,'POST',{},'admin');
}
const database = `stage_a_test_${randomUUID().replaceAll('-', '')}`;
async function request(path, method = 'GET', body, role = 'judge') {
  if (path === '/teams' && method === 'POST' && body && body.teacher === undefined) body = { ...body, teacher: staffIds.admin };
  const response = await fetch(`${origin}/api${path}`, {
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
  // Existing success fixtures represent valid new players; negative validation
  // cases use request() directly so omitted numbers reach the real API.
  if (/^\/teams\/[^/]+\/players$/.test(path) && method === 'POST' && body?.players)
    body = { ...body, players: body.players.map((player, index) => ({ playerNumber: `fixture-${index}`, ...player })) };
  const response = await request(path, method, body, role);
  assert.equal(response.status, status, JSON.stringify(response.body));
  return response.body;
}
before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  // Always choose a newly generated database, even when a custom server URI is supplied.
  await mongoose.connect(
    process.env.STAGE_A_TEST_MONGO_URI || 'mongodb://127.0.0.1:27017',
    { dbName: database },
  );
  await Promise.all([
    User.init(),
    Player.init(),
    Team.init(),
    Tournament.init(),
    Season.init(),
  ]);
  // Simulate the deployed pre-soft-delete constraint. The first create must
  // install/retain the new constraint before removing this older one.
  await Tournament.collection.createIndex({ team: 1 }, {
    name: 'one_open_internal_per_team', unique: true,
    partialFilterExpression: { engineVersion: 'swiss-v1', type: 'team_internal', source: 'live', status: 'upcoming', phase: { $in: ['setup', 'running', null] } },
  });
  for (const role of ['admin', 'judge', 'player']) {
    const user = await User.create({
      name: `Test ${role}`,
      username: `test-${role}`,
      password: randomBytes(24).toString('hex'),
      role,
    });
    staffIds[role] = user.id;
    tokens[role] = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
  }
  const app = express();
  app.set('tournamentRandom', () => 0.25);
  app.set('mediaStorage', mediaStorage);
  app.use(express.json());
  app.use('/api/teams', teamRoutes);
  app.use('/api/players', playerRoutes);
  app.use('/api/internal-tournaments', internalRoutes);
  app.use('/api/tournaments', tournamentRoutes);
  app.use('/api/badges', badgeRoutes);
  app.get('/api/all-stars/rankings', getAllStarsRankings);
  app.use('/api/seasons', seasonRoutes);
  app.use('/api/updates', updateRoutes);
  app.use('/api/media', mediaRoutes);
  app.get('/api/rankings', getNationalRankings);
  app.use(errorHandler);
  server = createServer(app);
  live = new Server(server);
  configureTournamentLive(live);
  app.set('io', live);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (live) await new Promise((resolve) => live.close(resolve));
  else if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState) {
    assert.equal(mongoose.connection.name, database);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test('complete Stage A workflow on standalone Mongo with compatibility and concurrent updates', async () => {
  assert.equal(
    (await request('/internal-tournaments', 'GET', undefined, null)).status,
    401,
  );
  assert.equal(
    (await request('/internal-tournaments', 'GET', undefined, 'player')).status,
    403,
  );
  assert.equal((await request('/badges')).status, 403);
  const admin = await User.findOne({ role: 'admin' });
  await Season.create({ name: 'Active badge season', createdBy: admin._id });
  const team = await ok(
    '/teams',
    'POST',
    { name: ' First Team ', logo: 'https://example.org/emblem.png' },
    'admin',
    201,
  );
  assert.equal(
    (await request('/teams', 'POST', { name: ' first   team ' }, 'admin')).status,
    409,
  );
  assert.equal(
    (
      await request('/teams', 'POST', {
        name: 'bad logo',
        logo: 'javascript:alert(1)',
      }, 'admin')
    ).status,
    400,
  );
  const target = await ok(
    '/teams',
    'POST',
    { name: 'Second Team' },
    'admin',
    201,
  );
  const userCount = await User.countDocuments();
  const children = await ok(
    `/teams/${team.id}/players`,
    'POST',
    {
      players: ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].map(
        (firstName) => ({ firstName, lastName: 'Child', city: 'Town' }),
      ),
    },
    'admin',
    201,
  );
  assert.equal(await User.countDocuments(), userCount);
  assert.ok(children.every((p) => p.user === null));
  const unassigned = await ok(
    '/players/team',
    'POST',
    { firstName: 'Unassigned', lastName: 'Child', city: 'City', playerNumber: '0007', teamId: target.id },
    'admin',
    201,
  );
  assert.equal(unassigned.user, null);
  assert.equal(unassigned.team, target.id);
  await ok(`/teams/${target.id}/players/${unassigned.id}`, 'DELETE', undefined, 'admin');
  const club = await ok(
    '/players/quarterly',
    'POST',
    { firstName: 'Club', lastName: 'Child', city: 'Club' },
    'admin',
    201,
  );
  assert.equal((await request(`/players/${club.id}`)).status, 403);
  assert.equal(
    (await request(`/players/${club.id}`, 'PUT', { firstName: 'Forbidden' }))
      .status,
    403,
  );
  assert.ok(
    (await ok('/players?type=quarterly')).items.every((p) => p.playerType === 'team'),
  );
  const publicTeam = await ok(
    `/teams/public/${team.id}`,
    'GET',
    undefined,
    null,
  );
  assert.equal(publicTeam.playerCount, 5);
  assert.equal(publicTeam.officialStats, null);
  assert.equal(publicTeam.createdBy, undefined);
  assert.ok(publicTeam.players.every((p) => !('user' in p)));
  assert.equal(
    (await request(`/teams/${team.id}`, 'PUT', { isActive: false }, 'admin')).status,
    409,
  );
  await ok(`/teams/${target.id}/players/${children[4].id}`, 'PUT', {}, 'admin');
  assert.equal(String((await Player.findById(children[4].id)).team), target.id);
  await ok(`/teams/${target.id}/players/${children[4].id}`, 'DELETE', undefined, 'admin');
  await ok(`/teams/${target.id}`, 'PUT', { isActive: false }, 'admin');
  assert.equal(
    (await request(`/teams/${target.id}/players/${children[4].id}`, 'PUT', {}, 'admin'))
      .status,
    400,
  );
  const linkedUser = await User.findOne({ role: 'player' });
  const linked = await Player.create({
    firstName: 'Legacy',
    lastName: 'Linked',
    playerType: 'team',
    user: linkedUser._id,
  });
  linkedUser.player = linked._id;
  await linkedUser.save();
  await ok(
    `/players/${linked.id}`,
    'PUT',
    { firstName: 'Renamed', city: 'New town' },
    'admin',
  );
  assert.equal((await User.findById(linkedUser._id)).name, 'Renamed Linked');
  assert.equal(String((await Player.findById(linked._id)).user), linkedUser.id);
  assert.equal(
    (await request(`/teams/${team.id}/players`, 'POST', { players: [null] }, 'admin'))
      .status,
    400,
  );
  assert.equal(
    (
      await request('/internal-tournaments', 'POST', {
        teamId: team.id,
        title: 123,
      })
    ).status,
    400,
  );
  let t = await ok(
    '/internal-tournaments',
    'POST',
    { teamId: team.id },
    'judge',
    201,
  );
  assert.equal(t.type, 'team_internal');
  assert.equal(t.playerParticipants.length, 4);
  assert.equal(t.participants.length, 0);
  assert.equal(t.season, null);
  const absent = t.playerParticipants.at(-1).player;
  t = await ok(`/internal-tournaments/${t.id}/participants`, 'PUT', {
    expectedRevision: t.revision,
    playerIds: t.playerParticipants
      .filter((p) => p.player !== absent)
      .map((p) => p.player),
  });
  const concurrent = await Promise.all([
    request(`/internal-tournaments/${t.id}/rounds`, 'POST', {
      expectedRevision: t.revision,
    }),
    request(
      `/internal-tournaments/${t.id}/rounds`,
      'POST',
      { expectedRevision: t.revision },
      'admin',
    ),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
  t = await ok(`/internal-tournaments/${t.id}`);
  assert.equal(t.rounds.length, 1);
  assert.equal(t.currentParticipants, 3);
  t = await ok(`/internal-tournaments/${t.id}/participants`, 'PUT', {
    expectedRevision: t.revision,
    playerIds: t.nextRoundParticipantIds,
  }); // Selection is editable while a round runs; this keeps the same next roster.
  assert.equal(
    (
      await request(`/internal-tournaments/${t.id}/close`, 'POST', {
        expectedRevision: t.revision,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(`/internal-tournaments/${t.id}/rounds`, 'POST', {
        expectedRevision: t.revision,
      })
    ).status,
    400,
  );
  let match = t.rounds[0].matches.find((m) => m.player2);
  const beforeResultRevision = t.revision;
  t = await ok(
    `/internal-tournaments/${t.id}/rounds/1/matches/${match._id}`,
    'PUT',
    {
      expectedRevision: t.revision,
      result: { winner: 'player1', score1: 1, score2: 0 },
    },
  );
  assert.equal(
    (
      await request(
        `/internal-tournaments/${t.id}/rounds/1/matches/${match._id}`,
        'PUT',
        {
          expectedRevision: beforeResultRevision,
          result: { winner: 'draw', score1: 1, score2: 1 },
        },
      )
    ).status,
    409,
  );
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', {
    expectedRevision: t.revision,
  });
  const correction = {
    expectedRevision: t.revision,
    result: { winner: 'draw', score1: 1, score2: 1, drawnGames: 1 },
  };
  assert.equal(
    (
      await request(
        `/internal-tournaments/${t.id}/rounds/1/matches/${match._id}`,
        'PUT',
        correction,
      )
    ).body.code,
    'DOWNSTREAM_ROUNDS',
  );
  t = await ok(
    `/internal-tournaments/${t.id}/rounds/1/matches/${match._id}`,
    'PUT',
    { ...correction, invalidateLaterRounds: true },
  );
  assert.equal(t.rounds.length, 1);
  assert.equal(t.invalidatedRounds.length, 1);
  assert.equal(t.invalidatedRounds[0].rounds.length, 1);
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', {
    expectedRevision: t.revision,
  });
  match = t.rounds[1].matches.find((m) => m.player2);
  t = await ok(
    `/internal-tournaments/${t.id}/rounds/2/matches/${match._id}`,
    'PUT',
    {
      expectedRevision: t.revision,
      result: { winner: 'player2', score1: 1, score2: 2 },
    },
    'admin',
  );
  t = await ok(`/internal-tournaments/${t.id}/close`, 'POST', {
    expectedRevision: t.revision,
  });
  assert.equal(t.status, 'completed');
  assert.equal(t.finalStandings.length, 4);
  assert.equal(
    (
      await request(`/internal-tournaments/${t.id}/rounds`, 'POST', {
        expectedRevision: t.revision,
      })
    ).status,
    403,
  );
  const resumed = await ok(
    `/internal-tournaments/${t.id}`,
    'GET',
    undefined,
    'admin',
  );
  assert.deepEqual(resumed.standings, t.finalStandings);
  assert.equal((await request(`/tournaments/${t.id}`)).status, 200);
  assert.equal(
    (await request(`/tournaments/${t.id}`, 'DELETE', undefined, 'judge'))
      .status,
    403,
  );
  const legacy = await Tournament.create({
    title: 'Legacy public event',
    description: 'Preserved',
    date: new Date(),
    location: 'Club',
    maxParticipants: 16,
    registrationDeadline: new Date(),
    image: '/legacy.png',
    type: 'team_internal',
    participants: [{ user: admin._id }],
    results: [
      { player: admin._id, playerName: admin.name, position: 1, points: 1000 },
    ],
    status: 'completed',
  });
  const {items:regularList} = await ok('/tournaments?pageSize=100', 'GET', undefined, null);
  assert.ok(regularList.some((row) => row.id === legacy.id));
  assert.ok(regularList.some((row) => row.id === t.id));
  const legacyRead = await ok(
    `/tournaments/${legacy.id}`,
    'GET',
    undefined,
    null,
  );
  assert.equal(legacyRead.participants, undefined);
  assert.equal((await ok(`/tournaments/management/legacy/${legacy.id}`, 'GET', undefined, 'admin')).participants[0].user.id, admin.id);
  assert.equal(legacyRead.results[0].playerName, admin.name);
  const regular = await ok(
    '/tournaments',
    'POST',
    {
      date: new Date(Date.now() + 86400000).toISOString(),
      location: 'Legacy Club',
      maxParticipants: 16,
    },
    'admin',
    201,
  );
  // A team-linked account must no longer be able to enter a club tournament.
  assert.equal((await request(
    `/tournaments/${regular.id}/register`, 'POST', {}, 'player'
  )).status, 409);
  const clubUser = await User.create({
    name: 'Legacy Club User', username: 'legacy-qr-fixture',
    password: randomBytes(24).toString('hex'), role: 'player',
  });
  tokens.clubPlayer = jwt.sign({ id: clubUser.id }, process.env.JWT_SECRET);
  const registered = await ok(
    `/tournaments/${regular.id}/register`, 'POST', {}, 'clubPlayer',
  );
  assert.equal(registered.currentParticipants, 1);
  assert.deepEqual(await ok(
    `/tournaments/${regular.id}/register`, 'GET', undefined, 'clubPlayer'
  ), {registered:true});
  await ok(
    `/tournaments/${regular.id}`,
    'PUT',
    { title: 'Legacy edited' },
    'admin',
  );
  await ok(
    `/tournaments/${regular.id}/results`,
    'POST',
    {
      results: [
        {
          player: clubUser.id,
          playerName: 'Legacy Club User',
          position: 1,
          points: 4,
          rawPoints: 9,
        },
      ],
    },
    'admin',
  );
  const regularResults = await ok(
    `/tournaments/${regular.id}/results`,
    'GET',
    undefined,
    null,
  );
  assert.equal(regularResults[0].points, 4);
  assert.equal(regularResults[0].player, 'legacy-0');
  assert.equal(regularResults[0].playerName, 'Legacy Club User');
  let ranks = await ok(`/all-stars/rankings?teamId=${team.id}`,  'GET', undefined, null);
  assert.equal(ranks.rankings.length, 4);
  assert.equal(
    ranks.rankings.reduce((sum, row) => sum + row.points, 0),
    t.finalStandings.reduce((sum, row) => sum + row.points, 0),
  );
  const historicalResults = children
    .slice(0, 4)
    .map((p, i) => ({ player: p.id, position: i + 1, points: 9 - i }));
  assert.equal(
    (
      await request('/internal-tournaments/historical', 'POST', {
        teamId: team.id,
        date: '2026-10-04',
        results: historicalResults.map((row) => ({ ...row, position: 1 })),
      }, 'admin')
    ).status,
    400,
  );
  const historical = await ok(
    '/internal-tournaments/historical',
    'POST',
    { teamId: team.id, date: '2026-10-04', results: historicalResults },
    'admin',
    201,
  );
  assert.equal(historical.source, 'historical');
  assert.equal(historical.phase, 'completed');
  assert.equal(historical.rounds.length, 0);
  assert.equal(historical.finalStandings[0].omp, null);
  ranks = await ok(`/all-stars/rankings?teamId=${team.id}`,  'GET', undefined, null);
  assert.equal(ranks.rankings.length, 4);
  assert.equal(
    ranks.rankings.reduce((sum, row) => sum + row.points, 0),
    t.finalStandings.reduce((sum, row) => sum + row.points, 0) + 30,
  );
  await Season.updateMany({}, { status: 'closed' });
  await Season.create({ name: 'Next badge season', createdBy: admin._id });
  assert.deepEqual(
    (await ok(`/all-stars/rankings?teamId=${team.id}`,  'GET', undefined, null)).rankings,
    ranks.rankings,
  );
  const totals = await ok(`/teams/public/${team.id}`, 'GET', undefined, null);
  assert.equal(totals.completedInternalTournamentCount, 2);
  assert.equal(totals.officialStats, null);
  await ok(`/teams/${target.id}`, 'PUT', { isActive: true }, 'admin');
  await ok(`/teams/${target.id}/players/${children[0].id}`, 'PUT', {}, 'admin');
  const teamRank = await ok(
    `/all-stars/rankings?teamId=${target.id}`,
    'GET',
    undefined,
    null,
  );
  // Transferring a player must never carry an old team's tournament score
  // into the new team's current ranking. Historical original-event results stay.
  assert.equal(teamRank.rankings.length, 0);
  // Reopening the database connection simulates a process restart without losing state.
  await mongoose.disconnect();
  await mongoose.connect(
    process.env.STAGE_A_TEST_MONGO_URI || 'mongodb://127.0.0.1:27017',
    { dbName: database },
  );
  const persisted = await ok(`/internal-tournaments/${t.id}`);
  assert.deepEqual(persisted.finalStandings, t.finalStandings);
  assert.equal(persisted.rounds.length, 2);
});

test('judges retry conflicting results and admin roster transitions never deactivate an occupied team', async () => {
  const team = await ok(
    '/teams',
    'POST',
    { name: 'Concurrent results' },
    'admin',
    201,
  );
  await ok(
    `/teams/${team.id}/players`,
    'POST',
    {
      players: Array.from({ length: 4 }, (_, index) => ({
        firstName: `Concurrent ${index}`,
        lastName: 'Child',
      })),
    },
    'admin',
    201,
  );
  let t = await ok(
    '/internal-tournaments',
    'POST',
    { teamId: team.id },
    'judge',
    201,
  );
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', {
    expectedRevision: t.revision,
  });
  const matches = t.rounds[0].matches;
  const writes = await Promise.all(
    matches.map((match, index) =>
      request(
        `/internal-tournaments/${t.id}/rounds/1/matches/${match._id}`,
        'PUT',
        {
          expectedRevision: t.revision,
          result: { winner: 'player1', score1: 2, score2: index },
        },
        index ? 'admin' : 'judge',
      ),
    ),
  );
  assert.deepEqual(
    writes.map((response) => response.status).sort(),
    [200, 409],
  );
  t = await ok(`/internal-tournaments/${t.id}`);
  assert.equal(t.rounds[0].matches.filter((match) => match.result).length, 1);
  const retry = t.rounds[0].matches.find((match) => !match.result);
  t = await ok(
    `/internal-tournaments/${t.id}/rounds/1/matches/${retry._id}`,
    'PUT',
    {
      expectedRevision: t.revision,
      result: { winner: 'draw', score1: 1, score2: 1 },
    },
    'admin',
  );
  assert.ok(t.rounds[0].matches.every((match) => match.result));
  const transitions = await Promise.all([
    request(`/internal-tournaments/${t.id}/close`, 'POST', {
      expectedRevision: t.revision,
    }),
    request(
      `/internal-tournaments/${t.id}/rounds`,
      'POST',
      { expectedRevision: t.revision },
      'admin',
    ),
  ]);
  assert.deepEqual(
    transitions.map((response) => response.status).sort(),
    [200, 409],
  );
  t = await ok(`/internal-tournaments/${t.id}`);
  assert.ok(
    (t.phase === 'completed' &&
      t.rounds.length === 1 &&
      t.finalStandings.length === 4) ||
      (t.phase === 'running' &&
        t.rounds.length === 2 &&
        !t.finalStandings.length),
  );
  const emptyTeam = await ok(
    '/teams',
    'POST',
    { name: 'Concurrent roster' },
    'admin',
    201,
  );
  const child = await ok(
    '/players/team',
    'POST',
    { firstName: 'Roster', lastName: 'Race', playerNumber: 'R-001', teamId: team.id },
    'admin',
    201,
  );
  const rosterWrites = await Promise.all([
    request(`/teams/${emptyTeam.id}`, 'PUT', { isActive: false }, 'admin'),
    request(`/teams/${emptyTeam.id}/players/${child.id}`, 'PUT', {}, 'admin'),
  ]);
  assert.ok(rosterWrites.some((response) => response.status !== 200));
  const storedTeam = await Team.findById(emptyTeam.id);
  const activeChildren = await Player.countDocuments({
    team: emptyTeam.id,
    isActive: true,
  });
  assert.ok(storedTeam.isActive || activeChildren === 0);
});

const socketEvent = (socket, name) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(name, listener);
      reject(new Error(`Timed out waiting for ${name}`));
    }, 5000);
    const listener = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(name, listener);
  });
const subscribe = (socket, id) =>
  new Promise((resolve, reject) =>
    socket
      .timeout(5000)
      .emit('tournament:subscribe', id, (error, result) =>
        error ? reject(error) : resolve(result),
      ),
  );

test('authorized Socket.IO rooms broadcast canonical results and hard deletion removes all ranking impact', async () => {
  const team = await ok('/teams', 'POST', { name: 'Live team' }, 'admin', 201);
  const players = await ok(
    `/teams/${team.id}/players`,
    'POST',
    {
      players: [
        { firstName: 'Live', lastName: 'One' },
        { firstName: 'Live', lastName: 'Two' },
      ],
    },
    'admin',
    201,
  );
  let t = await ok(
    '/internal-tournaments',
    'POST',
    { teamId: team.id },
    'judge',
    201,
  );
  const judge = connectSocket(origin, {
    auth: { token: tokens.judge },
    autoConnect: false,
  });
  const admin = connectSocket(origin, {
    auth: { token: tokens.admin },
    autoConnect: false,
  });
  const spectator = connectSocket(origin, {
    autoConnect: false,
    reconnection: false,
  });
  const subscribePublic = id => new Promise((resolve, reject) =>
    spectator.timeout(5000).emit('tournament:public:subscribe', id,
      (error, result) => error ? reject(error) : resolve(result)));
  const denied = connectSocket(origin, {
    auth: { token: tokens.player },
    autoConnect: false,
    reconnection: false,
  });
  try {
    const rejection = socketEvent(denied, 'connect_error');
    denied.connect();
    assert.equal((await rejection).message, 'Not authorized');
    const ready = Promise.all([
      socketEvent(judge, 'connect'),
      socketEvent(admin, 'connect'),
      socketEvent(spectator, 'connect'),
    ]);
    judge.connect();
    admin.connect();
    spectator.connect();
    await ready;
    assert.equal((await subscribe(spectator, t.id)).ok, false,
      'anonymous spectators must never enter management channels');
    assert.equal((await subscribePublic(t.id)).ok, false,
      'pre-round tournaments must not accept public live subscriptions');
    assert.equal((await subscribe(judge, 'not-a-tournament')).ok, false);
    assert.equal((await subscribe(judge, t.id)).ok, true);
    assert.equal((await subscribe(admin, t.id)).ok, true);
    const updates = Promise.all([
      socketEvent(judge, 'tournament:updated'),
      socketEvent(admin, 'tournament:updated'),
    ]);
    t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', {
      expectedRevision: t.revision,
    });
    assert.equal((await request(`/tournaments/${t.id}`, 'GET', undefined, null)).status, 404,
      'a live internal-team tournament must not expose a public results page');
    for (const event of await updates) {
      assert.equal(event.id, t.id);
      assert.equal(event.revision, t.revision);
    }
    assert.equal((await subscribePublic(t.id)).ok, false,
      'team internal tournaments never allow public live subscriptions');
    const clubLive = await Tournament.create({
      title: 'Live club event',
      description: 'Club-only spectator test',
      date: new Date(),
      location: 'Test venue',
      registrationDeadline: new Date(),
      image: '/pokemon_kids_logo.png',
      type: 'quarterly',
      engineVersion: 'swiss-v1',
      source: 'live',
      phase: 'running',
      status: 'upcoming',
    });
    assert.equal((await subscribePublic(clubLive.id)).ok, true,
      'club tournaments remain available to anonymous live spectators');
    const publicUpdate = socketEvent(spectator, 'tournament:public:updated');
    notifyTournament({ app: { get: () => live } }, clubLive);
    assert.deepEqual(await publicUpdate, { id: clubLive.id },
      'only club live notifications reach public viewers');
    let changed = socketEvent(judge, 'tournament:updated');
    t = await ok(
      `/internal-tournaments/${t.id}/rounds/1/matches/${t.rounds[0].matches[0]._id}`,
      'PUT',
      {
        expectedRevision: t.revision,
        result: { winner: 'player1', score1: 2, score2: 1 },
      },
      'admin',
    );
    assert.equal((await changed).revision, t.revision);
    t = await ok(`/internal-tournaments/${t.id}/close`, 'POST', {
      expectedRevision: t.revision,
    });
    const historical = await ok(
      '/internal-tournaments/historical',
      'POST',
      {
        teamId: team.id,
        date: '2026-10-04',
        results: players.map((player, index) => ({
          player: player.id,
          position: index + 1,
          points: 9 - index * 3,
        })),
      },
      'admin',
      201,
    );
    assert.equal(
      (await request(`/tournaments/${historical.id}`, 'DELETE')).status,
      403,
    );
    const before = await ok(`/all-stars/rankings?teamId=${team.id}`,  'GET', undefined, null);
    assert.ok(
      before.rankings.some(
        (row) => row.playerId === players[0].id && row.points >= 9,
      ),
    );
    const {items:list} = await ok('/tournaments/management?pageSize=100');
    assert.ok(
      list.some(
        (row) =>
          row.id === t.id &&
          row.lifecycle === 'completed' &&
          row.type === 'team_internal' &&
          !row.canManage,
      ),
    );
    changed = socketEvent(judge, 'tournament:updated');
    await ok(`/tournaments/${t.id}`, 'DELETE', undefined, 'admin');
    assert.equal((await changed).deleted, true);
    assert.equal((await request(`/internal-tournaments/${t.id}`)).status, 404);
    await ok(`/tournaments/${historical.id}`, 'DELETE', undefined, 'admin');
    assert.ok(
      !(await ok(`/all-stars/rankings?teamId=${team.id}`,  'GET', undefined, null)).rankings.some(
        (row) => players.some((player) => player.id === row.playerId),
      ),
    );
    assert.equal(
      (await ok(`/teams/public/${team.id}`, 'GET', undefined, null))
        .completedInternalTournamentCount,
      0,
    );
    assert.equal(
      await Tournament.countDocuments({ _id: { $in: [t.id, historical.id] } }),
      0,
    );
  } finally {
    spectator.disconnect();
    judge.disconnect();
    admin.disconnect();
    denied.disconnect();
  }
});

test('national lifetime ranking excludes all team scoring and badge transitions no longer snapshot rosters', async () => {
  const legacy = await User.create({
    name: 'Lifetime club fixture',
    username: 'lifetime-club-fixture',
    password: randomBytes(24).toString('hex'),
  });
  const base = {
    title: 'Historic club fixture',
    description: 'Fixture',
    location: 'Club',
    maxParticipants: 16,
    registrationDeadline: new Date('2020-01-01'),
    image: '/fixture.png',
    status: 'completed',
  };
  const events = [];
  for (const [type, points, date] of [
    [null, 4, '2020-01-01'],
    ['quarterly', 3, '2023-01-01'],
    ['team_internal', 100, '2024-01-01'],
    ['inter_team', 100, '2025-01-01'],
  ])
    events.push(
      await Tournament.create({
        ...base,
        type,
        date: new Date(date),
        results: [
          { player: legacy.id, playerName: legacy.name, points, position: 1 },
        ],
      }),
    );
  const ranking = (await ok('/rankings', 'GET', undefined, null)).rankings.find(
    (row) => row.playerId === legacy.id,
  );
  assert.equal(ranking.points, 7);
  assert.equal(ranking.tournaments, 2);
  assert.equal((await request('/seasons')).status, 403);
  const active = await ok('/seasons/active', 'GET', undefined, 'admin');
  const beforeSnapshots = await mongoose.connection
    .collection('teamseasonrosters')
    .countDocuments();
  await ok(`/seasons/${active.id}/close`, 'POST', {}, 'admin');
  const newSeason = await ok(
    '/seasons',
    'POST',
    { name: 'Badge domain only' },
    'admin',
    201,
  );
  assert.equal(
    await mongoose.connection.collection('teamseasonrosters').countDocuments(),
    beforeSnapshots,
  );
  assert.deepEqual(
    (await ok('/rankings', 'GET', undefined, null)).rankings.find(
      (row) => row.playerId === legacy.id,
    ),
    ranking,
  );
  const created = await ok(
    '/tournaments',
    'POST',
    { date: '2027-01-01', location: 'Future club', season: newSeason.id },
    'admin',
    201,
  );
  assert.equal(created.season, null);
  await ok(`/tournaments/${events[0].id}`, 'DELETE', undefined, 'admin');
  assert.equal(
    (await ok('/rankings', 'GET', undefined, null)).rankings.find(
      (row) => row.playerId === legacy.id,
    ).points,
    3,
  );
  await ok(`/tournaments/${events[3].id}`, 'DELETE', undefined, 'admin');
  assert.equal(await Tournament.findById(events[3].id), null);
  const news = await ok(
    '/updates',
    'POST',
    {
      title: 'Latest news',
      content: '<script>alert(1)</script> https://example.org/news',
    },
    'admin',
    201,
  );
  assert.equal(
    (await ok(`/updates/${news.id}`, 'GET', undefined, null)).content,
    news.content,
  ); // Frontend renders escaped text, never raw HTML.
  assert.equal(
    (await request('/updates/not-an-id', 'GET', undefined, null)).status,
    404,
  );
});

test('media presign enforces admin authentication and purpose/type/size before provider access', async () => {
  const valid={purpose:'team-logo',contentType:'image/png',size:png.length};
  for(const [role,status] of [[null,401],['player',403],['judge',403]])assert.equal((await request('/media/presign','POST',valid,role)).status,status);
  for(const invalid of [{...valid,purpose:'export'},{...valid,contentType:'image/svg+xml'},{...valid,contentType:'constructor'},{...valid,contentType:'toString'},{...valid,size:5*1024*1024+1},{...valid,size:0},{...valid,size:1.5},{...valid,entityId:'invalid'},{...valid,entityId:new mongoose.Types.ObjectId().toString()}])assert.ok([400,404].includes((await request('/media/presign','POST',invalid,'admin')).status));
});

test('judge is limited to live tournament operation and never changes permanent configuration', async () => {
  const team = await ok('/teams', 'POST', { name: 'Permissions Team' }, 'admin', 201);
  const children = await ok(`/teams/${team.id}/players`, 'POST', {
    players: ['Permission A', 'Permission B', 'Absent'].map(firstName => ({ firstName, lastName: 'Child' })),
  }, 'admin', 201);
  const beforeTeam = (await Team.findById(team.id)).toObject();
  const beforePlayers = await Player.find({ team: team.id }).sort({ _id: 1 }).lean();
  const denied = [
    ['/teams', 'POST', { name: 'Judge Created' }],
    [`/teams/${team.id}`, 'PUT', { name: 'Judge Edited', logo: 'https://example.org/judge.png', isActive: false }],
    [`/teams/${team.id}/players`, 'POST', { players: [{ firstName: 'Extra', lastName: 'Child' }] }],
    ['/players/team', 'POST', { firstName: 'Extra', lastName: 'Child' }],
    ['/players/quarterly', 'POST', { firstName: 'Extra', lastName: 'Child', city: 'Club' }],
    [`/players/${children[0].id}`, 'PUT', { firstName: 'Edited', isActive: false, team: null }],
    [`/teams/${team.id}/players/${children[0].id}`, 'PUT', {}],
    [`/teams/${team.id}/players/${children[0].id}`, 'DELETE'],
    ['/internal-tournaments/historical', 'POST', {}],
    ['/badges', 'POST', {}],
    ['/badges', 'GET'],
    [`/badges/${team.id}/players/${children[0].id}`, 'POST', {}],
    ['/seasons', 'POST', {}],
    [`/seasons/${team.id}/close`, 'POST', {}],
    ['/updates', 'POST', {}],
  ];
  for (const [path, method, body] of denied)
    assert.equal((await request(path, method, body, 'judge')).status, 403, `${method} ${path}`);
  assert.equal((await ok(`/teams/${team.id}`)).players.length, 3);
  assert.equal((await request(`/players/${children[0].id}`)).status, 200);
  let t = await ok('/internal-tournaments', 'POST', { teamId: team.id }, 'judge', 201);
  assert.equal((await request(`/tournaments/${t.id}`, 'DELETE', undefined, 'judge')).status, 403);
  assert.equal((await ok('/tournaments/management')).items.find(row => row.id === t.id).canManage, true);
  t = await ok(`/internal-tournaments/${t.id}/participants`, 'PUT', {
    expectedRevision: t.revision, playerIds: children.slice(0, 2).map(child => child.id),
  });
  const { updatedAt: beforeLockTime, ...beforeTeamData } = beforeTeam;
  const { updatedAt: afterLockTime, ...afterTeamData } = (await Team.findById(team.id)).toObject();
  assert.ok(afterLockTime >= beforeLockTime); // Existing document lock updates timestamps only.
  assert.deepEqual(afterTeamData, beforeTeamData);
  assert.deepEqual(await Player.find({ team: team.id }).sort({ _id: 1 }).lean(), beforePlayers);
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
  t = await ok(`/internal-tournaments/${t.id}/participants`, 'PUT', {
    expectedRevision: t.revision, playerIds: children.slice(0, 2).map(child => child.id),
  });
  const resultPath = `/internal-tournaments/${t.id}/rounds/1/matches/${t.rounds[0].matches[0]._id}`;
  t = await ok(resultPath, 'PUT', { expectedRevision: t.revision, result: { winner: 'player1', score1: 2, score2: 0 } });
  t = await ok(resultPath, 'PUT', { expectedRevision: t.revision, result: { winner: 'draw', score1: 1, score2: 1 } });
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
  t = await ok(`/internal-tournaments/${t.id}/rounds/2/matches/${t.rounds[1].matches[0]._id}`, 'PUT', {
    expectedRevision: t.revision, result: { winner: 'player2', score1: 0, score2: 1 },
  });
  t = await ok(`/internal-tournaments/${t.id}/close`, 'POST', { expectedRevision: t.revision });
  const historical = await ok('/internal-tournaments/historical', 'POST', {
    teamId: team.id, date: '2026-10-04', results: children.slice(0, 2).map((child, index) => ({ player: child.id, position: index + 1, points: 3 - index })),
  }, 'admin', 201);
  for (const event of [t, historical]) {
    const snapshot = await Tournament.findById(event.id).lean();
    for (const [suffix, method, body] of [
      ['/participants', 'PUT', { playerIds: children.map(child => child.id) }],
      ['/rounds', 'POST', {}],
      ['/rounds/1/matches/invalid', 'PUT', { result: { winner: 'draw', score1: 0, score2: 0 } }],
      ['/close', 'POST', {}],
      ['/rounds/1', 'DELETE', {}],
    ]) assert.equal((await request(`/internal-tournaments/${event.id}${suffix}`, method, { expectedRevision: event.revision, ...body })).status, 403);
    assert.equal((await request(`/tournaments/${event.id}`, 'DELETE')).status, 403);
    assert.deepEqual(await Tournament.findById(event.id).lean(), snapshot);
    assert.equal((await ok(`/internal-tournaments/${event.id}`)).phase, 'completed');
    assert.equal((await ok('/tournaments/management')).items.find(row => row.id === event.id).canManage, false);
    assert.equal((await ok('/tournaments/management', 'GET', undefined, 'admin')).items.find(row => row.id === event.id).canManage, true);
  }
});

test('judge operation requires an explicitly live source and an operational phase', async () => {
  const team = await ok('/teams', 'POST', { name: 'Live-only permissions' }, 'admin', 201);
  const players = await ok(`/teams/${team.id}/players`, 'POST', {
    players: ['One', 'Two'].map(firstName => ({ firstName, lastName: 'Live-only' })),
  }, 'admin', 201);
  for (const state of [
    { source: null, phase: 'setup', status: 'upcoming' },
    { source: 'live', phase: null, status: 'upcoming' },
    { source: 'historical', phase: 'running', status: 'upcoming' },
    { source: 'live', phase: 'running', status: 'completed' },
    { source: 'live', phase: 'completed', status: 'upcoming' },
  ]) {
    const opened = await ok('/internal-tournaments', 'POST', { teamId: team.id }, 'judge', 201);
    // Old/imported records can legitimately have null source/phase defaults.
    // Neither inconsistent flags nor missing metadata grants live operation.
    await Tournament.updateOne({ _id: opened.id }, { $set: state });
    const snapshot = await Tournament.findById(opened.id).lean();
    for (const [suffix, method, body] of [
      ['/participants', 'PUT', { playerIds: players.map(player => player.id) }],
      ['/rounds', 'POST', {}],
      ['/rounds/1/matches/invalid', 'PUT', { result: { winner: 'draw', score1: 0, score2: 0 } }],
      ['/close', 'POST', {}],
      ['/rounds/1', 'DELETE', {}],
    ]) {
      const response = await request(`/internal-tournaments/${opened.id}${suffix}`, method, { expectedRevision: opened.revision, ...body });
      assert.equal(response.status, 403, `${JSON.stringify(state)} ${method} ${suffix}`);
    }
    assert.equal((await ok('/tournaments/management')).items.find(row => row.id === opened.id).canManage, false);
    assert.equal((await ok('/tournaments/management', 'GET', undefined, 'admin')).items.find(row => row.id === opened.id).canManage, true);
    assert.equal((await request(`/internal-tournaments/${opened.id}`)).status, 200);
    assert.deepEqual(await Tournament.findById(opened.id).lean(), snapshot);
    await ok(`/tournaments/${opened.id}`, 'DELETE', undefined, 'admin');
  }
});

test('one open event per team is database-enforced and stale creates identify the event', async () => {
  const team = await ok('/teams', 'POST', { name: 'One open team' }, 'admin', 201);
  const players = await ok(`/teams/${team.id}/players`, 'POST', { players: ['First', 'Second'].map(firstName => ({ firstName, lastName: 'Unique' })) }, 'admin', 201);
  const creates = await Promise.all(['judge', 'admin'].map(role => request('/internal-tournaments', 'POST', { teamId: team.id }, role)));
  assert.deepEqual(creates.map(response => response.status).sort(), [201, 409]);
  const created = creates.find(response => response.status === 201).body;
  const conflict = creates.find(response => response.status === 409).body;
  assert.equal(conflict.code, 'OPEN_INTERNAL_TOURNAMENT');
  assert.equal(conflict.existingTournamentId, created.id);
  assert.equal(await Tournament.countDocuments({ team: team.id, source: 'live', phase: 'setup' }), 1);
  assert.equal((await ok(`/teams/${team.id}`)).openInternalTournament.id, created.id);
  assert.equal((await ok('/teams')).find(row => row.id === team.id).openInternalTournament.id, created.id);
  assert.equal((await ok(`/teams/${team.id}`, 'PUT', { name: 'One open renamed' }, 'admin')).openInternalTournament.id, created.id);
  const duplicate = (await Tournament.findById(created.id)).toObject();
  delete duplicate._id;
  await assert.rejects(Tournament.create(duplicate), error => error.code === 11000);
  const historical = await ok('/internal-tournaments/historical', 'POST', { teamId: team.id, date: '2026-10-04', results: players.map((player, i) => ({ player: player.id, position: i + 1, points: 6 - i * 3 })) }, 'admin', 201);
  assert.equal((await request('/internal-tournaments', 'POST', { teamId: team.id })).body.existingTournamentId, created.id);
  let t = await ok(`/internal-tournaments/${created.id}/rounds`, 'POST', { expectedRevision: created.revision });
  t = await ok(`/internal-tournaments/${t.id}/rounds/1/matches/${t.rounds[0].matches[0]._id}`, 'PUT', { expectedRevision: t.revision, result: { winner: 'player1', score1: 2, score2: 0 } });
  t = await ok(`/internal-tournaments/${t.id}/close`, 'POST', { expectedRevision: t.revision });
  assert.equal((await ok(`/teams/${team.id}`)).openInternalTournament, null);
  const next = await ok('/internal-tournaments', 'POST', { teamId: team.id }, 'judge', 201);
  assert.notEqual(next.id, t.id);
  assert.notEqual(next.id, historical.id);
});

test('latest round cancellation is atomic, archived, synchronized and never unlocks attendance', async () => {
  const team = await ok('/teams', 'POST', { name: 'Cancellation team' }, 'admin', 201);
  await ok(`/teams/${team.id}/players`, 'POST', { players: ['First', 'Second'].map(firstName => ({ firstName, lastName: 'Cancellation' })) }, 'admin', 201);
  let t = await ok('/internal-tournaments', 'POST', { teamId: team.id }, 'judge', 201);
  assert.equal((await request(`/internal-tournaments/${t.id}/rounds/1`, 'DELETE', { expectedRevision: t.revision })).status, 409);
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
  t = await ok(`/internal-tournaments/${t.id}/rounds/1/matches/${t.rounds[0].matches[0]._id}`, 'PUT', { expectedRevision: t.revision, result: { winner: 'player1', score1: 2, score2: 1 } });
  const round1 = structuredClone(t.rounds[0]);
  const standings1 = structuredClone(t.standings);
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
  t = await ok(`/internal-tournaments/${t.id}/rounds/2/matches/${t.rounds[1].matches[0]._id}`, 'PUT', { expectedRevision: t.revision, result: { winner: 'draw', score1: 1, score2: 1 } });
  const round2 = structuredClone(t.rounds[1]);
  assert.equal((await request(`/internal-tournaments/${t.id}/rounds/1`, 'DELETE', { expectedRevision: t.revision })).status, 409);
  assert.equal((await request(`/internal-tournaments/${t.id}/rounds/2`, 'DELETE', { expectedRevision: t.revision }, 'player')).status, 403);
  const socket = connectSocket(origin, { auth: { token: tokens.judge }, autoConnect: false });
  try {
    const ready = socketEvent(socket, 'connect'); socket.connect(); await ready;
    await subscribe(socket, t.id);
    const update = socketEvent(socket, 'tournament:updated');
    const outcomes = await Promise.all(['judge', 'admin'].map(role => request(`/internal-tournaments/${t.id}/rounds/2`, 'DELETE', { expectedRevision: t.revision }, role)));
    assert.deepEqual(outcomes.map(response => response.status).sort(), [200, 409]);
    t = outcomes.find(response => response.status === 200).body;
    assert.equal((await update).revision, t.revision);
    assert.deepEqual(t.rounds, [round1]);
    assert.deepEqual(t.standings, standings1);
    const audit = t.invalidatedRounds.at(-1);
    assert.deepEqual(audit.rounds, [round2]);
    assert.match(audit.reason, /Cancelled round 2/);
    assert.ok(audit.invalidatedAt && audit.invalidatedBy);
    assert.deepEqual((await ok(`/internal-tournaments/${t.id}`)).rounds, [round1]);
    t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
    assert.equal(t.rounds[1].number, 2);
    t = await ok(`/internal-tournaments/${t.id}/rounds/2`, 'DELETE', { expectedRevision: t.revision });
    const roster = structuredClone(t.playerParticipants);
    t = await ok(`/internal-tournaments/${t.id}/rounds/1`, 'DELETE', { expectedRevision: t.revision });
    assert.equal(t.phase, 'running');
    assert.deepEqual(t.rounds, []);
    assert.deepEqual(t.playerParticipants, roster);
    assert.ok(t.standings.every(row => row.points === 0));
    t = await ok(`/internal-tournaments/${t.id}/participants`, 'PUT', { expectedRevision: t.revision, playerIds: roster.map(p => p.player) });
    t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
    assert.equal(t.rounds[0].number, 1);
    t = await ok(`/internal-tournaments/${t.id}/rounds/1/matches/${t.rounds[0].matches[0]._id}`, 'PUT', { expectedRevision: t.revision, result: { winner: 'player1', score1: 1, score2: 0 } });
    t = await ok(`/internal-tournaments/${t.id}/close`, 'POST', { expectedRevision: t.revision });
    assert.equal((await request(`/internal-tournaments/${t.id}/rounds/1`, 'DELETE', { expectedRevision: t.revision })).status, 403);
    assert.equal((await request(`/internal-tournaments/${t.id}/rounds/1`, 'DELETE', { expectedRevision: t.revision }, 'admin')).status, 409);
  } finally { socket.disconnect(); }
});

test('match result versions isolate concurrent matches and reject same-match/stale structural writes', async () => {
  const team = await ok('/teams', 'POST', { name: 'Match version team' }, 'admin', 201);
  await ok(`/teams/${team.id}/players`, 'POST', { players: ['A','B','C','D'].map(firstName => ({ firstName, lastName: 'Version' })) }, 'admin', 201);
  let t = await ok('/internal-tournaments', 'POST', { teamId: team.id }, 'judge', 201);
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
  assert.deepEqual((await ok(`/internal-tournaments/${t.id}`)).rounds, t.rounds, 'pairings persist');
  const [a,b] = t.rounds[0].matches;
  // A persisted pre-versioning match has no counter; its first version is zero.
  await Tournament.collection.updateOne({ _id: new mongoose.Types.ObjectId(t.id) }, { $unset: { 'rounds.0.matches.1.resultRevision': '' } });
  const path = match => `/internal-tournaments/${t.id}/rounds/1/matches/${match._id}`;
  const score = { winner: 'player1', score1: 1, score2: 0 };
  const draft = { expectedRevision: t.revision, expectedResultRevision: 0, result: score };
  const concurrent = await Promise.all([request(path(a),'PUT', draft), request(path(b),'PUT', draft)]);
  assert.deepEqual(concurrent.map(r => r.status), [200,200]);
  t = await ok(`/internal-tournaments/${t.id}`);
  assert.ok(t.rounds[0].matches.every(m => m.resultRevision === 1));
  const same = await Promise.all([request(path(a),'PUT', { expectedResultRevision: 1, result: { winner: 'draw', score1: 1, score2: 1 } }), request(path(a),'PUT', { expectedResultRevision: 1, result: score })]);
  assert.deepEqual(same.map(r => r.status).sort(), [200,409]);
  assert.equal(same.find(r => r.status === 409).body.code, 'STALE_RESULT');
  assert.equal((await request(`/internal-tournaments/${t.id}/close`, 'POST', { expectedRevision: t.revision })).status, 409);
  t = await ok(`/internal-tournaments/${t.id}`);
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
  assert.equal((await request(path(b), 'PUT', { expectedRevision: t.revision, expectedResultRevision: 0, invalidateLaterRounds: true, result: score })).status, 409);
  const oldMatch = t.rounds[0].matches.find(m => m._id === b._id);
  t = await ok(path(b), 'PUT', { expectedRevision: t.revision, expectedResultRevision: oldMatch.resultRevision, invalidateLaterRounds: true, result: { winner: 'player2', score1: 0, score2: 1 } });
  assert.equal(t.rounds.length, 1);
  assert.equal(t.invalidatedRounds.length, 1);
});

test('soft deletion retains audit data, frees open team slot and hides all normal reads; permanent is explicit', async () => {
  const team = await ok('/teams', 'POST', { name: 'Soft delete team' }, 'admin', 201);
  const players = await ok(`/teams/${team.id}/players`, 'POST', { players: [{ firstName: 'Soft', lastName: 'One' }, { firstName: 'Soft', lastName: 'Two' }] }, 'admin', 201);
  let t = await ok('/internal-tournaments', 'POST', { teamId: team.id }, 'judge', 201);
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
  assert.equal((await request(`/tournaments/${t.id}?permanent=true`, 'DELETE')).status, 403);
  await ok(`/tournaments/${t.id}`, 'DELETE', undefined, 'admin');
  const stored = await Tournament.collection.findOne({ _id: new mongoose.Types.ObjectId(t.id) });
  assert.ok(stored.deletedAt && stored.deletedBy);
  assert.deepEqual(stored.rounds.map(r => String(r._id)), t.rounds.map(r => r._id));
  assert.equal((await request(`/internal-tournaments/${t.id}`)).status, 404);
  assert.equal((await request(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision })).status, 404);
  assert.ok(!(await ok('/tournaments/management')).items.some(row => row.id === t.id));
  assert.ok(!(await ok(`/internal-tournaments?teamId=${team.id}`)).some(row => row.id === t.id));
  const replacement = await ok('/internal-tournaments', 'POST', { teamId: team.id }, 'judge', 201);
  assert.notEqual(replacement.id, t.id);
  const indexes = await Tournament.collection.indexes();
  assert.ok(indexes.some(index => index.name === 'one_open_internal_per_team_active'));
  assert.ok(!indexes.some(index => index.name === 'one_open_internal_per_team'));
  assert.equal((await ok(`/teams/${team.id}`)).openInternalTournament.id, replacement.id);
  const historical = await ok('/internal-tournaments/historical', 'POST', { teamId: team.id, date: '2026-10-04', results: players.map((p,i) => ({ player:p.id, position:i+1, points:6-i*3 })) }, 'admin', 201);
  assert.ok((await ok(`/all-stars/rankings?teamId=${team.id}`,  'GET', undefined, null)).rankings.some(row => row.playerId === players[0].id));
  await ok(`/tournaments/${historical.id}`, 'DELETE', undefined, 'admin');
  assert.ok(!(await ok(`/all-stars/rankings?teamId=${team.id}`,  'GET', undefined, null)).rankings.some(row => row.playerId === players[0].id));
  assert.equal((await ok(`/teams/public/${team.id}`, 'GET', undefined, null)).completedInternalTournamentCount, 0);
  assert.ok(await Tournament.collection.findOne({ _id: new mongoose.Types.ObjectId(historical.id) }));
  await ok(`/tournaments/${t.id}?permanent=true`, 'DELETE', undefined, 'admin');
  assert.equal(await Tournament.collection.findOne({ _id: new mongoose.Types.ObjectId(t.id) }), null);
  // A pre-delete legacy document cannot save over deletion metadata.
  const legacy = await Tournament.create({ title:'Legacy deletion',description:'Test',date:new Date(),location:'Test',maxParticipants:2,registrationDeadline:new Date(),image:'test.png' });
  await ok(`/tournaments/${legacy.id}`, 'DELETE', undefined, 'admin');
  legacy.title = 'Stale overwrite';
  await assert.rejects(legacy.save(), error => error.name === 'VersionError');
});

test('public team-player endpoint is an allowlist, excludes club profiles and has no directory', async () => {
  const player = await Player.create({ firstName:'Public',lastName:'Team',city:'Haifa',playerType:'team',user:null });
  const publicData = await ok(`/players/public/${player.id}`, 'GET', undefined, null);
  assert.deepEqual(Object.keys(publicData).sort(), ['id','firstName','lastName','city','playerNumber','team','teamRanking','badges','pokemon', ].sort());
  assert.equal(publicData.firstName, player.firstName);
  assert.equal(publicData.playerNumber, '');
  assert.ok(!('overallRanking' in publicData));
  const club = await Player.create({ firstName:'Private',lastName:'Club',city:'Test',playerType:'quarterly' });
  assert.equal((await request(`/players/public/${club.id}`, 'GET', undefined, null)).status,404);
  assert.equal((await request('/players/public/not-an-id', 'GET', undefined, null)).status,404);
  assert.equal((await request('/players', 'GET', undefined, null)).status,401);
});


test('team teachers are eligible, private, admin assigned and limited to assigned overview teams', async () => {
  const missingTeacher = await fetch(`${origin}/api/teams`, {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${tokens.admin}`},body:JSON.stringify({name:'No teacher'})});
  assert.equal(missingTeacher.status, 400);
  for (const teacher of [null, '', 'invalid', staffIds.player, new mongoose.Types.ObjectId().toString()]) {
    assert.equal((await request('/teams', 'POST', { name: 'Invalid teacher', teacher }, 'admin')).status, 400);
  }
  const teachers = await ok('/teams/teachers', 'GET', undefined, 'admin');
  assert.ok(teachers.every(t => ['admin', 'judge'].includes(t.role) && !t.password && !t.username));
  assert.equal((await request('/teams/teachers')).status, 403);
  const assigned = await ok('/teams', 'POST', { name: 'Judge teaching one', teacher: staffIds.judge }, 'admin', 201);
  const second = await ok('/teams', 'POST', { name: 'Judge teaching two', teacher: staffIds.judge }, 'admin', 201);
  const other = await ok('/teams', 'POST', { name: 'Admin teaching', teacher: staffIds.admin }, 'admin', 201);
  const old = await Team.create({ name: 'Legacy teacherless', createdBy: staffIds.admin });
  assert.equal((await ok(`/teams/${old.id}`)).teacher, null);
  await ok(`/teams/${old.id}`, 'PUT', { teacher: staffIds.judge }, 'admin');
  const mine = await ok('/teams/mine');
  assert.deepEqual(mine.map(t => t.id).sort(), [assigned.id, second.id, old.id].sort());
  assert.ok(!mine.some(t => t.id === other.id));
  assert.equal((await request(`/teams/${assigned.id}`, 'PUT', { teacher: staffIds.admin })).status, 403);
  assert.equal((await request(`/teams/${assigned.id}/players`, 'POST', { players: [{firstName:'No',lastName:'Admin'}] })).status, 403);
  const publicTeam = await ok(`/teams/public/${assigned.id}`, 'GET', undefined, null);
  assert.equal(publicTeam.teacher, undefined);
  await ok(`/teams/${assigned.id}/players`, 'POST', { players: ['One','Two'].map(firstName => ({firstName,lastName:'Teacher'})) }, 'admin', 201);
  const live = await ok('/internal-tournaments', 'POST', { teamId: assigned.id }, 'judge', 201);
  assert.equal((await ok('/teams/mine')).find(t => t.id === assigned.id).openInternalTournament.id, live.id);
  assert.equal((await User.findById(staffIds.judge)).role, 'judge');
});

test('public tournament details hide live team rounds but preserve completed results', async () => {
  const team = await ok('/teams', 'POST', { name: 'Public event team' }, 'admin', 201);
  const players = await ok(`/teams/${team.id}/players`, 'POST', { players: ['A','B'].map(firstName => ({firstName,lastName:'Public'})) }, 'admin', 201);
  let t = await ok('/internal-tournaments', 'POST', {teamId:team.id}, 'judge', 201);
  const upcoming = await ok(`/tournaments/${t.id}`, 'GET', undefined, null);
  assert.equal(upcoming.lifecycle, 'upcoming');
  assert.deepEqual(upcoming.standings, []);
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', {expectedRevision:t.revision});
  const match = t.rounds[0].matches[0];
  t = await ok(`/internal-tournaments/${t.id}/rounds/1/matches/${match._id}`, 'PUT', {expectedResultRevision:match.resultRevision, result:{winner:'player1', score1:2,score2:0}});
  // The live staff match is no longer accessible through public tournament details.
  assert.equal((await request(`/tournaments/${t.id}`, 'GET', undefined, null)).status, 404);
  assert.equal(t.standings.length, 2);
  assert.equal(t.standings[0].points, 3);
  const forbidden = /"(?:teacher|createdBy|staff|revision|resultRevision|enteredBy|deletedAt|deletedBy|invalidatedRounds|audit|participants|playerParticipants|canManage)"\s*:/;
  t = await ok(`/internal-tournaments/${t.id}/close`, 'POST', {expectedRevision:t.revision});
  const completed = await ok(`/tournaments/${t.id}`, 'GET', undefined, null);
  assert.equal(completed.lifecycle, 'completed');
  assert.equal(completed.standings.length, 2);
  assert.equal(completed.standings[0].points, 3);
  assert.ok(completed.standings.every(row => players.some(player => player.id === row.player)));
  assert.deepEqual(await ok(`/tournaments/${t.id}/results`, 'GET', undefined, null), completed.standings);
  const inter = await Tournament.create({ title:'Inter-team public',description:'Public',location:'Club',image:'/event.png',date:new Date(Date.now()+86400000),registrationDeadline:new Date(),maxParticipants:16,type:'inter_team' });
  const {items:list} = await ok('/tournaments?pageSize=100', 'GET', undefined, null);
  assert.ok(list.some(e => e.id === t.id && e.type === 'team_internal'));
  assert.ok(list.some(e => e.id === inter.id && e.type === 'inter_team'));
  assert.ok(list.some(e => e.type === 'quarterly'));
  assert.ok(!forbidden.test(JSON.stringify(list)));
  await ok(`/tournaments/${t.id}`, 'DELETE', undefined, 'admin');
  assert.equal((await request(`/tournaments/${t.id}`, 'GET', undefined, null)).status, 404);
  assert.ok(!(await ok('/tournaments?pageSize=100', 'GET', undefined, null)).items.some(e => e.id === t.id));
});

test('2026.10.1 player numbers are text, new creation assigns an active team and legacy backfill/unassignment is compatible', async () => {
  const team = await ok('/teams', 'POST', { name: 'Number team' }, 'admin', 201);
  const inactive = await ok('/teams', 'POST', { name: 'Inactive number team', isActive: false }, 'admin', 201);
  // Team creation is active by default; explicitly deactivate an empty team.
  await ok(`/teams/${inactive.id}`, 'PUT', { isActive: false }, 'admin');
  const input = { firstName: 'Number', lastName: 'Child', city: 'Haifa', teamId: team.id, playerNumber: '  0007  ' };
  const originalCount = await Player.countDocuments();
  for (const invalid of [
    { ...input, playerNumber: undefined }, { ...input, playerNumber: '' },
    { ...input, playerNumber: 7 }, { ...input, teamId: undefined },
    { ...input, teamId: inactive.id },
  ]) assert.equal((await request('/players/team', 'POST', invalid, 'admin')).status, 400);
  assert.equal(await Player.countDocuments(), originalCount, 'invalid assignments never create orphan players');
  const userCount = await User.countDocuments();
  const player = await ok('/players/team', 'POST', input, 'admin', 201);
  assert.equal(player.playerNumber, '0007');
  assert.equal(player.team, team.id);
  assert.equal(player.user, null);
  assert.equal(await User.countDocuments(), userCount);
  const duplicate = await ok('/players/team', 'POST', { ...input, firstName: 'Another' }, 'admin', 201);
  assert.equal(duplicate.playerNumber, '0007', 'no undocumented unique-number constraint');
  const beforeBulk = await Player.countDocuments();
  assert.equal((await request(`/teams/${team.id}/players`, 'POST', { players: [
    { firstName:'Valid',lastName:'Bulk',playerNumber:'AB-17' }, { firstName:'Missing',lastName:'Bulk' },
  ] }, 'admin')).status, 400);
  assert.equal(await Player.countDocuments(), beforeBulk, 'bulk validation is atomic');
  const [bulk] = await ok(`/teams/${team.id}/players`, 'POST', { players: [{ firstName:'Valid',lastName:'Bulk',playerNumber:'AB-17' }] }, 'admin', 201);
  assert.equal(bulk.playerNumber, 'AB-17');
  const legacy = await Player.create({ firstName:'Legacy',lastName:'Number',playerType:'team',team:team.id });
  assert.equal((await ok(`/players/${legacy.id}`)).playerNumber, '');
  await ok(`/players/${legacy.id}`, 'PUT', { playerNumber:' legacy-09 ',city:'Jerusalem' }, 'admin');
  const publicTeam = await ok(`/teams/public/${team.id}`, 'GET', undefined, null);
  assert.equal(publicTeam.players.find(row => row.id === legacy.id).playerNumber, 'legacy-09');
  const profile = await ok(`/players/public/${legacy.id}`, 'GET', undefined, null);
  assert.equal(profile.playerNumber, 'legacy-09');
  assert.ok(!('overallRanking' in profile));
  assert.equal((await request('/all-stars/rankings', 'GET', undefined, null)).status, 400);
  assert.equal((await request(`/players/${legacy.id}`, 'PUT', { playerNumber:'judge-edit' }, 'judge')).status, 403);
  await ok(`/teams/${team.id}/players/${legacy.id}`, 'DELETE', undefined, 'admin');
  const saved = await Player.findById(legacy.id);
  assert.equal(saved.team, null);
  assert.equal(saved.playerNumber, 'legacy-09');
  assert.equal(saved.isActive, true);
});

test('2026.10.1 next-round participant plan retains history, synchronizes and keeps per-match concurrency independent', async () => {
  const team = await ok('/teams', 'POST', { name:'Future participants' }, 'admin', 201);
  const players = await ok(`/teams/${team.id}/players`, 'POST', { players:['A','B','C','D'].map(firstName => ({firstName,lastName:'Future'})) }, 'admin', 201);
  let t = await ok('/internal-tournaments', 'POST', { teamId:team.id }, 'judge', 201);
  const ids = players.map(p => p.id);
  // Legacy documents with no plan use their saved historical participant set.
  await Tournament.collection.updateOne({ _id:new mongoose.Types.ObjectId(t.id) }, { $unset:{nextRoundParticipantIds:''} });
  t = await ok(`/internal-tournaments/${t.id}`);
  assert.deepEqual(new Set(t.nextRoundParticipantIds), new Set(ids));
  t = await ok(`/internal-tournaments/${t.id}/participants`, 'PUT', { expectedRevision:t.revision, playerIds:ids.slice(0,3) });
  assert.equal(t.playerParticipants.length, 4);
  assert.equal(t.currentParticipants, 3);
  t = await ok(`/internal-tournaments/${t.id}/participants`, 'PUT', { expectedRevision:t.revision, playerIds:ids });
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision:t.revision });
  const round1 = structuredClone(t.rounds[0]);
  const [matchA,matchB] = round1.matches;
  const late = await ok('/players/team', 'POST', { firstName:'Late',lastName:'Future',playerNumber:'LATE',teamId:team.id }, 'admin', 201);
  const outsider = await Player.create({ firstName:'Other',lastName:'Team',playerType:'team' });
  assert.equal((await request(`/internal-tournaments/${t.id}/participants`, 'PUT', { expectedRevision:t.revision, playerIds:[ids[0],outsider.id] })).status,400);
  const dropped = matchA.player1;
  const nextIds = [...ids.filter(id => id !== dropped),late.id];
  const socket = connectSocket(origin, { auth:{token:tokens.judge}, transports:['websocket'],forceNew:true,autoConnect:false });
  try {
    const ready = socketEvent(socket, 'connect'); socket.connect(); await ready;
    assert.equal((await subscribe(socket,t.id)).ok,true);
    const change = socketEvent(socket,'tournament:updated');
    const baseRevision = t.revision;
    const writes = await Promise.all([
      request(`/internal-tournaments/${t.id}/participants`, 'PUT', { expectedRevision:baseRevision,playerIds:nextIds }),
      request(`/internal-tournaments/${t.id}/participants`, 'PUT', { expectedRevision:baseRevision,playerIds:ids },'admin'),
    ]);
    assert.deepEqual(writes.map(r => r.status).sort(), [200,409]);
    t = writes.find(r => r.status === 200).body;
    assert.equal((await change).revision,t.revision);
    if (!t.nextRoundParticipantIds.includes(late.id)) t = await ok(`/internal-tournaments/${t.id}/participants`, 'PUT', { expectedRevision:t.revision,playerIds:nextIds });
    assert.deepEqual(t.rounds[0],round1);
    assert.equal(t.playerParticipants.length,5);
    assert.equal(t.standings.find(row => row.player === late.id).points,0);
    assert.equal(t.standings.find(row => row.player === late.id).matchesPlayed,0);
    assert.equal(await Player.countDocuments({team:team.id}),5,'permanent roster is untouched');
    // Match drafts obtained before the structural participant edit are still valid.
    for (const match of [matchA,matchB]) t = await ok(`/internal-tournaments/${t.id}/rounds/1/matches/${match._id}`, 'PUT', {
      expectedResultRevision:match.resultRevision,result:{winner:'player1',score1:2,score2:0},
    });
    assert.equal(t.standings.find(row => row.player === dropped).points,3);
    t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', {expectedRevision:t.revision});
    assert.deepEqual(new Set(t.rounds[1].matches.flatMap(m => [m.player1,m.player2])),new Set(nextIds));
    const futurePlan = [...nextIds.filter(id => id !== matchA.player2),dropped];
    t = await ok(`/internal-tournaments/${t.id}/participants`, 'PUT', {expectedRevision:t.revision,playerIds:futurePlan});
    const round2 = structuredClone(t.rounds[1]);
    assert.equal(t.rounds[1].matches.length,2);
    t = await ok(`/internal-tournaments/${t.id}/rounds/2`, 'DELETE', {expectedRevision:t.revision});
    assert.deepEqual(new Set(t.nextRoundParticipantIds),new Set(futurePlan));
    assert.deepEqual(t.invalidatedRounds.at(-1).rounds,[round2]);
    assert.equal(t.standings.find(row => row.player === dropped).points,3);
    t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', {expectedRevision:t.revision});
    assert.deepEqual(new Set(t.rounds[1].matches.flatMap(m => [m.player1,m.player2])),new Set(futurePlan));
    for (const match of t.rounds[1].matches) t = await ok(`/internal-tournaments/${t.id}/rounds/2/matches/${match._id}`, 'PUT', {
      expectedResultRevision:match.resultRevision,result:{winner:'draw',score1:1,score2:1},
    });
    t = await ok(`/internal-tournaments/${t.id}/close`, 'POST', {expectedRevision:t.revision});
    assert.equal(t.finalStandings.length,5);
    assert.equal((await request(`/internal-tournaments/${t.id}/participants`, 'PUT', {expectedRevision:t.revision,playerIds:ids})).status,403);
    assert.equal((await request(`/internal-tournaments/${t.id}/participants`, 'PUT', {expectedRevision:t.revision,playerIds:ids},'admin')).status,409);
    assert.deepEqual((await ok(`/teams/${team.id}`)).players.map(p=>p.id).sort(),[...ids,late.id].sort());
  } finally {socket.disconnect();}
});

test('2026.10.2 shared S3 media verifies actual objects, ownership and optional create/replace/remove for teams, players and badges',async()=>{
  const teamImage=await uploaded('team-logo');
  assert.ok(teamImage.storageKey.startsWith(`public/teams/${teamImage.entityId}/`));
  assert.equal(teamImage.url,`https://d1grgd8g6bpbb7.cloudfront.net/teams/${teamImage.entityId}/${teamImage.storageKey.split('/').at(-1)}`);
  assert.ok(!('publicId' in teamImage));
  const team=await ok('/teams','POST',{name:'S3 logo team',logoUploadId:teamImage.uploadId},'admin',201);
  assert.equal(team.id,teamImage.entityId);assert.equal(team.logo,teamImage.url);
  assert.equal((await ok(`/teams/public/${team.id}`,'GET',undefined,null)).logo,teamImage.url);
  const otherAdmin=await User.create({name:'Other admin',username:'other-admin',password:randomBytes(24).toString('hex'),role:'admin'});
  tokens.otherAdmin=jwt.sign({id:otherAdmin.id},process.env.JWT_SECRET);
  assert.equal((await request(`/media/${teamImage.uploadId}/complete`,'POST',{},'otherAdmin')).status,404);
  const oldKey=team.logoMedia.storageKey;
  const replacement=await uploaded('team-logo',team.id);
  assert.equal((await request(`/teams/${team.id}`,'PUT',{logoUploadId:replacement.uploadId},'otherAdmin')).status,400);
  const unrelated=await ok('/teams','POST',{name:'S3 unrelated'},'admin',201);
  assert.equal((await request(`/teams/${unrelated.id}`,'PUT',{logoUploadId:replacement.uploadId},'admin')).status,400);
  assert.equal((await request(`/teams/${team.id}`,'PUT',{logoUploadId:replacement.uploadId},'judge')).status,403);
  assert.equal((await request(`/media/${replacement.uploadId}/complete`,'POST',{},'judge')).status,403);
  await ok(`/teams/${team.id}`,'PUT',{logoUploadId:replacement.uploadId},'admin');
  assert.ok(removedMedia.includes(oldKey));
  cleanupFails=true;
  await ok(`/teams/${team.id}`,'PUT',{logoUploadId:null},'admin');
  cleanupFails=false;
  assert.equal((await ok(`/teams/public/${team.id}`,'GET',undefined,null)).logo,'');
  assert.ok(mediaObjects.has(replacement.storageKey),'cleanup failure does not break persistence');
  const historicalLogo=await uploaded('team-logo',team.id);
  await ok(`/teams/${team.id}`,'PUT',{logoUploadId:historicalLogo.uploadId},'admin');
  const snapshot=await Tournament.create({title:'Retained logo snapshot',description:'History',date:new Date(),location:'Test',maxParticipants:2,registrationDeadline:new Date(),image:historicalLogo.url,teamLogoSnapshot:historicalLogo.url});
  await ok(`/tournaments/${snapshot.id}`,'DELETE',undefined,'admin');
  await ok(`/teams/${team.id}`,'PUT',{logoUploadId:null},'admin');
  assert.ok(mediaObjects.has(historicalLogo.storageKey),'referenced historical/audit tournament artwork is not deleted');
  const legacy=await ok('/teams','POST',{name:'Legacy Cloudinary media',logo:'https://res.cloudinary.com/legacy/image/upload/logo.png',logoPublicId:'legacy/logo'},'admin',201);
  assert.equal((await ok(`/teams/public/${legacy.id}`,'GET',undefined,null)).logo,legacy.logo);
  const image=await uploaded('player-photo',undefined,'team');
  const child=await ok('/players/team','POST',{firstName:'Photo',lastName:'Team',teamId:team.id,playerNumber:'P-1',photoUploadId:image.uploadId},'admin',201);
  assert.equal(child.id,image.entityId);assert.ok(image.storageKey.startsWith(`public/players/${child.id}/`));
  const publicData=await ok(`/players/public/${child.id}`,'GET',undefined,null);
  assert.equal(publicData.photoUrl,image.url);assert.ok(!('photoMedia' in publicData));
  assert.equal((await request('/media/presign','POST',{purpose:'player-photo',playerType:'quarterly',contentType:'image/png',size:png.length},'admin')).status,400);
  const club=await ok('/players/quarterly','POST',{firstName:'Photo',lastName:'Club',city:'School'},'admin',201);
  assert.ok(!('photoMedia' in club));
  assert.equal((await request(`/players/${club.id}`,'PUT',{photoUploadId:image.uploadId},'admin')).status,400);
  // A legacy private object remains private even after a future explicit type change.
  await Player.updateOne({_id:club.id},{$set:{playerType:'team',photoMedia:{storageKey:'private/players/legacy/photo.png',contentType:'image/png',size:png.length}}});
  const changedType=await ok(`/players/public/${club.id}`,'GET',undefined,null);
  assert.ok(!changedType.photoUrl && !JSON.stringify(changedType).includes('private/'));
  const publicReplacement=await uploaded('player-photo',child.id,'quarterly');
  await ok(`/players/${child.id}`,'PUT',{photoUploadId:publicReplacement.uploadId},'admin');
  assert.equal((await ok(`/players/public/${child.id}`,'GET',undefined,null)).photoUrl,publicReplacement.url);
  assert.ok(removedMedia.includes(image.storageKey));
  await ok(`/players/${child.id}`,'PUT',{photoUploadId:null},'admin');
  assert.ok(!('photoUrl' in await ok(`/players/public/${child.id}`,'GET',undefined,null)));
  assert.ok(removedMedia.includes(image.storageKey));
  const badgeImage=await uploaded('badge-image');
  const badge=await ok('/badges','POST',{name:'S3 badge',imageUploadId:badgeImage.uploadId},'admin',201);
  assert.equal(badge.id,badgeImage.entityId);assert.equal(badge.image,badgeImage.url);
  const another=await uploaded('badge-image',badge.id);
  await ok(`/badges/${badge.id}`,'PUT',{imageUploadId:another.uploadId},'admin');assert.ok(removedMedia.includes(badgeImage.storageKey));
  await ok(`/badges/${badge.id}`,'PUT',{imageUploadId:null},'admin');assert.ok(removedMedia.includes(another.storageKey));
  assert.equal((await ok('/badges','POST',{name:'Image optional'},'admin',201)).image,'');
  const malformed=await ok('/media/presign','POST',{purpose:'badge-image',contentType:'image/png',size:png.length,storageKey:'public/stolen/anything.png',bucket:'evil'},'admin',201);
  mediaObjects.set(malformed.upload.fields.key,{bytes:Buffer.from('<svg/>'),size:png.length,contentType:'image/png'});
  assert.equal((await request(`/media/${malformed.uploadId}/complete`,'POST',{},'admin')).status,400);
  assert.ok(removedMedia.includes(malformed.upload.fields.key));
  assert.equal(await MediaUpload.findById(malformed.uploadId),null);
  const wrongSize=await ok('/media/presign','POST',{purpose:'team-logo',contentType:'image/png',size:png.length},'admin',201);
  mediaObjects.set(wrongSize.upload.fields.key,{bytes:png,size:5*1024*1024+1,contentType:'image/png'});
  assert.equal((await request(`/media/${wrongSize.uploadId}/complete`,'POST',{},'admin')).status,400);
  // A still-valid staging upload cannot overwrite the promoted final object.
  const immutable=await uploaded('team-logo');
  const grant=await MediaUpload.findById(immutable.uploadId);
  mediaObjects.set(grant.uploadKey,{bytes:Buffer.from('<svg/>'),size:png.length,contentType:'image/png'});
  await ok(`/media/${immutable.uploadId}/complete`,'POST',{},'admin');
  assert.deepEqual(mediaObjects.get(immutable.storageKey).bytes,png);
  const raced=await ok('/media/presign','POST',{purpose:'team-logo',contentType:'image/png',size:png.length},'admin',201);
  mediaObjects.set(raced.upload.fields.key,{bytes:png,size:png.length,contentType:'image/png'});
  tamperOnCopy=true;
  assert.equal((await request(`/media/${raced.uploadId}/complete`,'POST',{},'admin')).status,502);
  const racedGrant=await MediaUpload.findById(raced.uploadId);
  assert.ok(!mediaObjects.has(racedGrant.storageKey),'changed staging content cannot be promoted after verification');
  assert.equal((await request(`/media/${raced.uploadId}/complete`,'POST',{},'admin')).status,400);
  const expired=await uploaded('badge-image');await MediaUpload.updateOne({_id:expired.uploadId},{$set:{expiresAt:new Date(0)}});
  assert.equal((await request('/badges','POST',{name:'Expired image',imageUploadId:expired.uploadId},'admin')).status,400);
});

test('2026.10.2 badge Seasons, index migration, revocation/re-award and deletion preserve safe history',async()=>{
  await Season.updateMany({status:'active'},{$set:{status:'closed'}});
  const team=await ok('/teams','POST',{name:'Season badges'},'admin',201);
  const children=await ok(`/teams/${team.id}/players`,'POST',{players:['First','Second'].map(firstName=>({firstName,lastName:'Badge'}))},'admin',201);
  const badge=await ok('/badges','POST',{name:'Seasonal achievement'},'admin',201);
  const badgeImage=await uploaded('badge-image',badge.id);
  await ok(`/badges/${badge.id}`,'PUT',{imageUploadId:badgeImage.uploadId},'admin');
  const legacy=await BadgeAward.create({player:children[0].id,badge:badge.id,awardedBy:staffIds.admin});
  // Simulate the deployed lifetime constraint alongside the replacement index.
  await BadgeAward.collection.createIndex({player:1,badge:1},{unique:true,name:'player_1_badge_1'});
  const award=()=>request(`/badges/${badge.id}/players/${children[0].id}`,'POST',{},'admin');
  assert.equal((await award()).status,409,'an active Season is mandatory');
  await Season.collection.createIndex({status:1},{name:'status_1',unique:true,partialFilterExpression:{status:'active'}});
  const season=await ok('/seasons','POST',{name:'Badge autumn'},'admin',201);
  assert.ok(!(await Season.collection.indexes()).some(index=>index.name==='status_1'));
  const initial=await award();assert.equal(initial.status,201,JSON.stringify(initial.body));assert.equal(initial.body.season.id,season.id);
  const indexes=await BadgeAward.collection.indexes();assert.ok(indexes.some(i=>i.name==='one_current_badge_per_player_season'));assert.ok(!indexes.some(i=>i.name==='player_1_badge_1'));
  const duplicate=await Promise.all([award(),award()]);assert.deepEqual(duplicate.map(r=>r.status),[409,409]);
  await ok(`/seasons/${season.id}/close`,'POST',{},'admin');
  const later=await ok('/seasons','POST',{name:'Badge winter'},'admin',201);
  const newer=await award();assert.equal(newer.status,201);assert.equal(newer.body.season.id,later.id);
  assert.equal(await BadgeAward.countDocuments({player:children[0].id,badge:badge.id}),3);
  const publicBefore=await ok(`/players/public/${children[0].id}`,'GET',undefined,null);
  assert.ok(publicBefore.badges.every(row=>row.image===badgeImage.url));
  assert.ok(!JSON.stringify(publicBefore).includes('storageKey'));
  assert.equal(publicBefore.badges.length,3);assert.ok(publicBefore.badges.some(b=>b.seasonName==='Badge autumn'));assert.ok(publicBefore.badges.some(b=>!b.seasonName));
  assert.ok(!JSON.stringify(publicBefore.badges).includes('awardedBy'));
  assert.equal((await request(`/badges/awards/${newer.body.id}`,'DELETE',undefined,'judge')).status,403);
  await ok(`/badges/awards/${newer.body.id}`,'DELETE',undefined,'admin');
  const revoked=await BadgeAward.findById(newer.body.id);assert.ok(revoked.revokedAt);assert.equal(String(revoked.revokedBy),staffIds.admin);
  assert.ok(!(await ok('/badges/awards','GET',undefined,'admin')).some(row=>row.id===newer.body.id));
  assert.equal((await ok(`/players/public/${children[0].id}`,'GET',undefined,null)).badges.length,2);
  const reawarded=await award();assert.equal(reawarded.status,201,'revocation frees the same-season slot');
  await ok(`/badges/${badge.id}`,'PUT',{name:'Renamed achievement',isActive:false},'admin');
  assert.equal((await request(`/badges/${badge.id}/players/${children[1].id}`,'POST',{},'admin')).status,400);
  assert.equal((await ok(`/players/public/${children[0].id}`,'GET',undefined,null)).badges.length,3);
  assert.equal((await request(`/seasons/${later.id}`,'DELETE',undefined,'judge')).status,403);
  await ok(`/seasons/${later.id}`,'DELETE',undefined,'admin');
  assert.equal((await request('/seasons/active','GET',undefined,'admin')).status,404);
  assert.ok(!(await ok('/seasons','GET',undefined,'admin')).some(row=>row.id===later.id));
  const deleted=await Season.findById(later.id);assert.ok(deleted.deletedAt && deleted.deletedBy);
  const history=await ok('/badges/awards','GET',undefined,'admin');
  assert.equal(history.find(row=>row.id===reawarded.body.id).season.name,'עונה שנמחקה');
  const publicAfter=await ok(`/players/public/${children[0].id}`,'GET',undefined,null);
  assert.equal(publicAfter.badges.length,3);assert.ok(!JSON.stringify(publicAfter).includes('Badge winter'));
  assert.ok(await BadgeAward.findById(legacy.id));assert.ok(await BadgeAward.findById(reawarded.body.id));
  await Season.collection.insertOne({_id:new mongoose.Types.ObjectId(),name:'Deleted legacy Season',status:'active',deletedAt:new Date(),createdBy:new mongoose.Types.ObjectId(staffIds.admin)});
  await ok('/seasons','POST',{name:'Badge spring'},'admin',201);
  const club=await ok('/players/quarterly','POST',{firstName:'Cannot',lastName:'Badge',city:'Club'},'admin',201);
  await ok(`/badges/${badge.id}`,'PUT',{isActive:true},'admin');
  assert.equal((await request(`/badges/${badge.id}/players/${club.id}`,'POST',{},'admin')).status,400);
  assert.equal((await request(`/badges/${badge.id}/players/${children[1].id}`,'POST',{},'judge')).status,403);
  const simultaneous=await Promise.all([request(`/badges/${badge.id}/players/${children[1].id}`,'POST',{},'admin'),request(`/badges/${badge.id}/players/${children[1].id}`,'POST',{},'admin')]);
  assert.deepEqual(simultaneous.map(r=>r.status).sort(),[201,409]);
});

test('2026.10.2 optional biography/date-only birth stay editable, age-only public and private from team roster DTO',async()=>{
  const team=await ok('/teams','POST',{name:'Profile metadata'},'admin',201);
  const player=await ok('/players/team','POST',{firstName:'Profile',lastName:'Child',teamId:team.id,playerNumber:'PROFILE',description:'שלום מהנבחרת',dateOfBirth:'2016-10-13'},'admin',201);
  assert.equal(player.description,'שלום מהנבחרת');assert.equal(player.dateOfBirth,'2016-10-13');
  const data=await ok(`/players/public/${player.id}`,'GET',undefined,null);
  assert.equal(data.description,player.description);assert.ok(Number.isInteger(data.age));assert.ok(!('dateOfBirth' in data));assert.ok(!JSON.stringify(data).includes('2016-10-13'));
  assert.ok(!JSON.stringify(await ok(`/teams/public/${team.id}`,'GET',undefined,null)).includes('dateOfBirth'));
  assert.equal((await ok(`/teams/${team.id}`,'GET',undefined,'admin')).players.find(row=>row.id===player.id).dateOfBirth,'2016-10-13');
  for(const payload of [{description:'x'.repeat(501)},{dateOfBirth:'2999-01-01'},{dateOfBirth:'2016-02-30'}])assert.equal((await request(`/players/${player.id}`,'PUT',payload,'admin')).status,400);
  assert.equal((await request(`/players/${player.id}`,'PUT',{description:'judge edit'},'judge')).status,403);
  await ok(`/players/${player.id}`,'PUT',{description:'',dateOfBirth:''},'admin');
  const cleared=await ok(`/players/public/${player.id}`,'GET',undefined,null);assert.ok(!('age' in cleared));assert.ok(!('description' in cleared));
  const image=await uploaded('player-photo',undefined,'team');
  const [bulk]=await ok(`/teams/${team.id}/players`,'POST',{players:[{firstName:'Context',lastName:'Create',playerNumber:'CONTEXT',description:'Biography',dateOfBirth:'2015-04-01',photoUploadId:image.uploadId}]},'admin',201);
  assert.equal(bulk.id,image.entityId);assert.equal(bulk.team,team.id);assert.equal(bulk.description,'Biography');
});

test('2026.10.3: player archive preserves history, duplicate overrides and city/profile boundaries', async () => {
  const team = await ok(
    '/teams',
    'POST',
    { name: 'V3 archive team' },
    'admin',
    201,
  );
  const input = {
    firstName: 'V3 Duplicate',
    lastName: 'Child',
    city: 'Test City',
    playerNumber: 'V3',
    teamId: team.id,
  };
  const child = await ok('/players/team', 'POST', input, 'admin', 201);
  const duplicate = await request(
    '/players/team',
    'POST',
    { ...input, firstName: '  v3   duplicate ', city: ' test  city ' },
    'admin',
  );
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.code, 'PLAYER_DUPLICATE');
  assert.equal(duplicate.body.matches[0].id, child.id);
  await ok(
    '/players/team',
    'POST',
    { ...input, allowDuplicate: true },
    'admin',
    201,
  );
  const regular = await ok(
    '/players/quarterly',
    'POST',
    {
      firstName: 'V3 Regular',
      lastName: 'Child',
      city: 'Test City',
      club: 'obsolete',
    },
    'admin',
    201,
  );
  assert.ok(!('club' in regular));
  assert.ok(!('photoMedia' in regular));
  assert.equal(
    (
      await request(
        '/players/quarterly',
        'POST',
        { firstName: 'v3 regular', lastName: 'child', city: 'test city' },
        'admin',
      )
    ).status,
    409,
  );
  await ok(
    '/players/quarterly',
    'POST',
    {
      firstName: 'v3 regular',
      lastName: 'child',
      city: 'test city',
      allowDuplicate: true,
    },
    'admin',
    201,
  );
  await ok(`/players/${regular.id}`, 'PUT', { city: 'Updated City' }, 'admin');
  const deck = await uploaded('player-deck', child.id, 'team');
  assert.ok(deck.storageKey.startsWith(`public/players/${child.id}/deck/`));
  await ok(
    `/players/${child.id}`,
    'PUT',
    {
      joinedAt: '2020-01-01',
      pokemon: [' Iron  Hands ', 'Pikachu'],
      deckUploadId: deck.uploadId,
    },
    'admin',
  );
  const profile = await ok(
    `/players/public/${child.id}`,
    'GET',
    undefined,
    null,
  );
  assert.deepEqual(profile.pokemon, ['Iron Hands', 'Pikachu']);
  assert.equal(profile.deckUrl, deck.url);
  assert.ok(profile.tenureYears >= 6);
  assert.ok(!('joinedAt' in profile));
  for (const body of [
    { joinedAt: '2999-01-01' },
    { pokemon: ['פוקימון'] },
    { pokemon: ['Pikachu1'] },
    { pokemon: Array(7).fill('Pikachu') },
  ])
    assert.equal(
      (await request(`/players/${child.id}`, 'PUT', body, 'admin')).status,
      400,
    );
  const second = (await ok(`/teams/${team.id}`)).players.find(
    (p) => p.id !== child.id,
  );
  const historical = await ok(
    '/internal-tournaments/historical',
    'POST',
    {
      teamId: team.id,
      date: '2020-01-01',
      results: [
        { player: child.id, position: 1, points: 3 },
        { player: second.id, position: 2, points: 0 },
      ],
    },
    'admin',
    201,
  );
  assert.equal(
    (await request(`/players/${child.id}`, 'DELETE', undefined, 'judge'))
      .status,
    403,
  );
  const archivedBadge = await BadgeDefinition.create({
    name: 'V3 archived award',
    isActive: true, createdBy:staffIds.admin,
  });
  const earned = await BadgeAward.create({
    player: child.id,
    badge: archivedBadge._id,
    awardedBy: staffIds.admin,
  });
  await ok(`/players/${child.id}`, 'DELETE', undefined, 'admin');
  assert.equal(
    (
      await request(
        `/badges/${archivedBadge.id}/players/${child.id}`,
        'POST',
        {},
        'admin',
      )
    ).status,
    404,
  );
  const archiveHistory = await ok('/badges/awards', 'GET', undefined, 'admin');
  assert.equal(
    archiveHistory.find((award) => award.id === earned.id).player.firstName,
    child.firstName,
  );
  const raw = await Player.findById(child.id).setOptions({
    includeDeleted: true,
  });
  assert.ok(raw.deletedAt);
  assert.equal(raw.isActive, false);
  assert.equal(String(raw.team), team.id);
  assert.equal(
    (await request(`/players/public/${child.id}`, 'GET', undefined, null))
      .status,
    404,
  );
  assert.ok(
    !(await ok(`/teams/${team.id}`)).players.some((p) => p.id === child.id),
  );
  assert.equal(
    (await ok(`/tournaments/${historical.id}`, 'GET', undefined, null))
      .standings.length,
    2,
  );
  assert.equal(
    (
      await request(
        '/internal-tournaments/historical',
        'POST',
        {
          teamId: team.id,
          date: '2020-01-01',
          results: [
            { player: child.id, position: 1, points: 3 },
            { player: second.id, position: 2, points: 0 },
          ],
        },
        'admin',
      )
    ).status,
    400,
  );
  await ok(
    `/players/${second.id}`,
    'PUT',
    { deckUploadId: null, joinedAt: '', pokemon: [] },
    'admin',
  );
});

test('2026.10.3: authorized server pagination, combined filters, counts and stable page recovery', async () => {
  await Player.insertMany(
    Array.from({ length: 28 }, (_, i) => ({
      firstName: `V3Paged ${String(i).padStart(2, '0')}`,
      lastName: 'Fixture',
      city: i % 2 ? 'North' : 'South',
      playerType: i % 2 ? 'team' : 'quarterly',
    })),
  );
  const first = await ok('/players?search=V3Paged', 'GET', undefined, 'admin');
  assert.equal(first.items.length, 25);
  assert.equal(first.total, 28);
  assert.equal(first.totalPages, 2);
  const next = await ok(
    '/players?search=V3Paged&page=2',
    'GET',
    undefined,
    'admin',
  );
  assert.equal(next.items.length, 3);
  assert.ok(
    next.items.every((p) => !first.items.some((row) => row.id === p.id)),
  );
  const filtered = await ok(
    '/players?type=team&search=North',
    'GET',
    undefined,
    'admin',
  );
  assert.equal(filtered.total, 14);
  assert.equal(
    (
      await ok(
        '/players?search=V3Paged&type=quarterly',
        'GET',
        undefined,
        'judge',
      )
    ).total,
    14,
  );
  const counted = await ok(
    '/players?search=V3Paged&countOnly=true',
    'GET',
    undefined,
    'admin',
  );
  assert.equal(counted.total, 28);
  assert.equal(counted.items.length, 0);
  for (const p of next.items)
    await ok(`/players/${p.id}`, 'DELETE', undefined, 'admin');
  const recovered = await ok(
    '/players?search=V3Paged&page=2',
    'GET',
    undefined,
    'admin',
  );
  assert.equal(recovered.page, 1);
  assert.equal(recovered.total, 25);
  await Tournament.insertMany(
    Array.from({ length: 28 }, (_, i) => ({
      title: `V3Paged Event ${i}`,
      description: 'Fixture',
      image: '/event.png',
      location: 'V3Location',
      date: i % 2 ? '2020-01-01' : '2999-01-01',
      registrationDeadline: '2999-01-01',
      maxParticipants: 32,
      type: i % 2 ? 'inter_team' : 'quarterly',
      status: 'upcoming',
    })),
  );
  const events = await ok(
    '/tournaments?search=V3Paged',
    'GET',
    undefined,
    null,
  );
  assert.equal(events.items.length, 25);
  assert.equal(events.total, 28);
  const managed = await ok(
    '/tournaments/management?search=V3Paged&type=inter_team&status=active',
  );
  assert.equal(managed.total, 14);
  assert.ok(managed.items.every((t) => t.lifecycle === 'active'));
  const summary = await ok(
    '/tournaments/summary?search=V3Paged',
    'GET',
    undefined,
    null,
  );
  assert.equal(summary.total, 28);
  assert.equal(summary.upcoming, 14);
  const eventCount = await ok(
    '/tournaments?search=V3Paged&countOnly=true',
    'GET',
    undefined,
    null,
  );
  assert.equal(eventCount.total, 28);
  assert.equal(eventCount.items.length, 0);
});

test('2026.10.3: News CRUD, title/CTA validation, optional image and legacy content', async () => {
  for (const input of [
    { title: ' ' },
    { title: 'Test', ctaText: 'CTA' },
    { title: 'Test', ctaUrl: 'https://example.com' },
    { title: 'Test', ctaText: 'CTA', ctaUrl: 'javascript:alert(1)' },
  ])
    assert.equal(
      (await request('/updates', 'POST', input, 'admin')).status,
      400,
    );
  assert.equal(
    (await request('/updates', 'POST', { title: 'Forbidden' }, 'judge')).status,
    403,
  );
  const legacy = await ok(
    '/updates',
    'POST',
    { title: ' Legacy title ', content: 'Legacy description' },
    'admin',
    201,
  );
  assert.equal(legacy.title, 'Legacy title');
  assert.equal(legacy.description, 'Legacy description');
  const image = await uploaded('update-image', legacy.id);
  assert.ok(image.storageKey.startsWith(`public/updates/${legacy.id}/`));
  const updated = await ok(
    `/updates/${legacy.id}`,
    'PUT',
    {
      title: 'Updated',
      description: 'Description',
      imageUploadId: image.uploadId,
      ctaText: 'Exact manager CTA',
      ctaUrl: 'https://example.com/trial',
    },
    'admin',
  );
  assert.equal(updated.image, image.url);
  assert.equal(updated.ctaText, 'Exact manager CTA');
  assert.ok(!('imageMedia' in updated));
  const cleared = await ok(
    `/updates/${legacy.id}`,
    'PUT',
    { description: '', imageUploadId: null, ctaText: '', ctaUrl: '' },
    'admin',
  );
  assert.equal(cleared.description, '');
  assert.equal(cleared.image, '');
  assert.ok(removedMedia.includes(image.storageKey));
  await ok(`/updates/${legacy.id}`, 'DELETE', undefined, 'admin');
  assert.equal(
    (await request(`/updates/${legacy.id}`, 'GET', undefined, null)).status,
    404,
  );
});

test('2026.10.4 overview counts are canonical, archival-safe and role/team scoped',async()=>{
  const assigned=await ok('/teams','POST',{name:'V4 assigned',teacher:staffIds.judge},'admin',201);
  const another=await ok('/teams','POST',{name:'V4 another assigned',teacher:staffIds.judge},'admin',201);
  const foreign=await ok('/teams','POST',{name:'V4 foreign',teacher:staffIds.admin},'admin',201);
  await Player.insertMany([
    {firstName:'V4',lastName:'Active',playerType:'team',team:assigned.id,isActive:true},
    {firstName:'V4',lastName:'Inactive',playerType:'team',team:assigned.id,isActive:false},
    {firstName:'V4',lastName:'Archived',playerType:'team',team:assigned.id,isActive:true,deletedAt:new Date()},
    {firstName:'V4',lastName:'Regular',playerType:'quarterly',city:'City',isActive:true},
  ]);
  const fixture={title:'V4 event',description:'Fixture',image:'/event.png',date:'2020-01-01',location:'Fixture',registrationDeadline:'2020-01-01',maxParticipants:32};
  await Tournament.insertMany([
    {...fixture,type:'team_internal',team:assigned.id,status:'completed',source:'historical'},
    {...fixture,type:'team_internal',team:assigned.id,status:'upcoming',phase:'setup',engineVersion:'swiss-v1'},
    {...fixture,type:'team_internal',team:assigned.id,status:'completed',deletedAt:new Date()},
    {...fixture,type:'team_internal',team:another.id,status:'completed'},
    {...fixture,type:'team_internal',team:foreign.id,status:'completed'},
    {...fixture,type:'quarterly',status:'completed'},
    {...fixture,type:null,status:'completed'},
    {...fixture,type:'quarterly',status:'upcoming',phase:'completed'},
    {...fixture,type:'quarterly',status:'completed',deletedAt:new Date()},
    {...fixture,type:'quarterly',status:'upcoming',date:'2999-01-01'},
    {...fixture,type:'inter_team',status:'completed',competitionYear:'past',team:assigned.id},
    {...fixture,type:'inter_team',status:'upcoming'},
  ]);
  assert.equal((await request('/teams/overview','GET',undefined,null)).status,401);
  assert.equal((await request('/teams/overview','GET',undefined,'player')).status,403);
  const judge=await ok('/teams/overview?teacher='+staffIds.admin);
  assert.equal(judge.role,'judge');assert.ok(!('activeTeams' in judge));
  const first=judge.teams.find(team=>team.id===assigned.id);
  const teacher=await User.findById(staffIds.judge).select('name role');
  assert.deepEqual(first.teacher,{id:String(teacher._id),name:teacher.name,role:'judge'});
  for(const team of judge.teams) assert.equal(team.teacher.id,String(staffIds.judge));
  assert.equal(first.playerCount,1);assert.equal(first.completedInternalTournamentCount,1);assert.equal(first.leaguePosition,null);
  assert.ok(judge.teams.some(team=>team.id===another.id));assert.ok(!judge.teams.some(team=>team.id===foreign.id));
  const admin=await ok('/teams/overview','GET',undefined,'admin');
  assert.equal(admin.role,'admin');assert.equal(admin.activeTeams,await Team.countDocuments({isActive:true}));
  assert.equal(admin.activeTeamPlayers,await Player.countDocuments({isActive:true,playerType:'team'}));
  assert.equal(admin.activeQuarterlyPlayers,await Player.countDocuments({isActive:true,playerType:'quarterly'}));
  const completed=await ok('/tournaments?type=quarterly&status=completed&countOnly=true','GET',undefined,null);
  const active=await ok('/tournaments?status=active&countOnly=true','GET',undefined,null);
  assert.equal(admin.completedQuarterlyTournaments,completed.total);assert.equal(admin.activeTournaments,active.total);
  assert.ok(completed.total>=3);assert.ok(['equal','uneven'].includes(admin.encounterBalance.status),'internal meeting counts do not depend on inter-team infrastructure');
  assert.ok(admin.nearest?.managementPath.startsWith('/manage/'));
});

test('2026.10.5 A26 groups completed internal meetings by event date, including imports and zero teams',async()=>{
 const {adminOverview,internalMeetingBalance,teamMeetingYear}=await import('../services/overview.js');
 const now=new Date('2026-10-14T12:00:00Z');const window=teamMeetingYear(now);
 const makeTeam=async(name,isActive=true)=>Team.create({name,createdBy:staffIds.admin,isActive});
 const a=await makeTeam('V5 Leader');const b=await makeTeam('V5 Partial');const zero=await makeTeam('V5 Zero');const inactive=await makeTeam('V5 Inactive',false);
 const fixture={title:'V5 meeting',description:'Fixture',image:'/event.png',location:'Fixture',registrationDeadline:now,maxParticipants:32,team:a._id,type:'team_internal',status:'completed',competitionYear:'stage-a-initial',source:'historical'};
 await Tournament.insertMany([
  {...fixture,date:window.start},
  {...fixture,date:new Date(window.end.getTime()-1)},
  {...fixture,date:now},
  {...fixture,date:now,status:'upcoming',phase:'completed'},
  {...fixture,date:new Date(window.start.getTime()-1)},
  {...fixture,date:window.end},
  {...fixture,date:'2020-01-01',createdAt:now},
  {...fixture,date:now,deletedAt:now},
  {...fixture,date:now,status:'upcoming',phase:'setup'},
  {...fixture,date:now,type:'inter_team'},
  {...fixture,date:now,type:'quarterly'},
  {...fixture,date:now,team:b._id},
  ...Array.from({length:10},()=>({...fixture,date:now,team:inactive._id})),
 ]);
 const balance=await internalMeetingBalance([a,b,zero],now);
 assert.equal(balance.status,'uneven');assert.equal(balance.maximum,4);
 assert.deepEqual(balance.lagging,[{id:zero.id,name:zero.name,gap:4},{id:b.id,name:b.name,gap:3}]);
 const equal=await internalMeetingBalance([a],now);assert.equal(equal.status,'equal');assert.equal(equal.count,4);
 const none=await internalMeetingBalance([zero],now);assert.equal(none.count,0);
 const overview=await adminOverview(now);assert.ok(overview.encounterBalance.maximum<10,'inactive teams cannot establish the maximum');
 assert.ok(!overview.encounterBalance.lagging?.some(team=>team.id===inactive.id));
 const source=await Tournament.findOne({title:fixture.title,date:'2020-01-01'});assert.equal(source.competitionYear,'stage-a-initial');
 const aggregate=Tournament.aggregate;
 try {
  Tournament.aggregate=()=>{throw new Error('count query unavailable');};
  const failed=await adminOverview(now);assert.deepEqual(failed.encounterBalance,{status:'unavailable'});assert.equal(failed.activeTeams,overview.activeTeams);
 } finally {Tournament.aggregate=aggregate;}

});

test('historical ordinary points for an All-Stars Player stay independent of team points', async () => {
  const { HISTORICAL_RANKING_SOURCE, normalizeRankingName } = await import('../services/nationalRankings.js');
  const { default: HistoricalRanking } = await import('../models/historicalRankingModel.js');
  // Synthetic identities only. These fixtures never enter the production DB.
  const seed = Array.from({ length: 337 }, (_, i) => {
    const playerName = `Fixture${i} Child`;
    return {
      firstName: `Fixture${i}`, lastName: 'Child', city: '',
      playerType: i < 35 ? 'team' : 'quarterly',
      isActive: true, user: null,
      historicalImportSource: HISTORICAL_RANKING_SOURCE,
      historicalNormalizedName: normalizeRankingName(playerName),
    };
  });
  const players = await Player.insertMany(seed);
  await HistoricalRanking.insertMany(players.map((player, index) => {
    const playerName = `${player.firstName} ${player.lastName}`;
    return {
      source: HISTORICAL_RANKING_SOURCE,
      normalizedName: normalizeRankingName(playerName),
      playerName, points: 24, tournaments: 6, isAllStars: index < 35,
      player: player._id,
    };
  }));
  const teamPlayer = players[0];
  const event = {
    title: 'Synthetic scoring boundary', description: 'Fixture', location: 'Test location',
    maxParticipants: 20, registrationDeadline: new Date('2026-11-17'),
    image: '/fixture.png', status: 'completed', engineVersion: 'swiss-v1',
  };
  const standings = (points) => [{
    player: teamPlayer._id, playerName: 'Fixture0 Child', position: 1, points,
  }];
  await Tournament.insertMany([
    { ...event, type: 'quarterly', date: new Date('2026-11-17'), finalStandings: standings(5) },
    { ...event, type: 'team_internal', date: new Date('2026-11-17'), finalStandings: standings(100) },
    { ...event, type: 'inter_team', date: new Date('2026-11-17'), finalStandings: standings(90) },
    { ...event, type: 'quarterly', date: new Date('2026-11-15'), finalStandings: standings(12) },
  ]);
  const visible = await ok('/rankings?includeAllStars=true&search=Fixture0%20Child', 'GET', undefined, null);
  assert.ok(visible.lastUpdatedAt);
  // Coverage belongs to the whole national league, not the searched player.
  const all=await ok('/rankings?includeAllStars=true','GET',undefined,null);
  assert.deepEqual(visible.resultsThrough,all.resultsThrough);
  assert.ok(visible.resultsThrough.date.slice(0,10)>='2026-11-17');
  const latestSource=await Tournament.findOne({status:'completed',type:{$in:[null,'quarterly']},date:{$gt:new Date('2026-11-16T21:59:59.999Z')},$or:[{engineVersion:'swiss-v1','finalStandings.player':{$exists:true}},{engineVersion:{$ne:'swiss-v1'},'results.player':{$exists:true}}]}).sort({date:-1,_id:-1});
  assert.equal(visible.resultsThrough.date,latestSource.date.toISOString());
  assert.equal(visible.resultsThrough.title,latestSource.title);
  const repeat=await ok('/rankings?includeAllStars=true&search=Fixture0%20Child','GET',undefined,null);
  assert.equal(repeat.lastUpdatedAt,visible.lastUpdatedAt);
  assert.deepEqual(repeat.resultsThrough,visible.resultsThrough);
  assert.equal(visible.total, 1);
  assert.equal(visible.rankings[0].points, 29);
  assert.equal(visible.rankings[0].tournaments, 7);
  assert.equal(visible.rankings[0].isAllStars, true);
  const hidden = await ok('/rankings?search=Fixture0%20Child', 'GET', undefined, null);
  assert.equal(hidden.total, 0);
});



test('club-only QR flow registers Player records and keeps regular results linked to national rankings', async () => {
  const when = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const event = await ok('/tournaments', 'POST', {
    date: when.slice(0, 10), location: 'QR Club Hall', type: 'quarterly',
    maxParticipants: 1, // Obsolete incoming cap must not limit club registrations.
  }, 'admin', 201);
  assert.equal(event.maxParticipants, null);
  assert.ok(event.date.endsWith('T12:00:00.000Z'));
  const day15 = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  assert.equal((await request('/tournaments/' + event.id, 'PUT', {
    date: day15, location: 'Forbidden Edit',
  }, 'judge')).status, 403);
  const editedEvent = await ok('/tournaments/' + event.id, 'PUT', {
    date: day15,
    title: 'QR Club Tournament Edited',
    description: 'Open to club players',
    location: 'New QR Hall',
  }, 'admin');
  assert.equal(editedEvent.title, 'QR Club Tournament Edited');
  assert.equal(editedEvent.location, 'New QR Hall');
  assert.ok(editedEvent.date.endsWith(day15 + 'T12:00:00.000Z'));
  assert.equal(editedEvent.maxParticipants, null);
  const route = '/tournaments/' + event.id + '/qr-registration';
  const existing = await ok('/players/quarterly', 'POST', {
    firstName: 'QrExisting', lastName: 'Club', city: 'Rehovot',
  }, 'admin', 201);
  const teamPlayer = await Player.create({
    firstName: 'Team', lastName: 'Only', city: 'Jerusalem',
    playerType: 'team', isActive: true,
  });

  assert.equal((await request(route, 'GET', undefined, null)).status, 401);
  assert.equal((await request(route, 'GET', undefined, 'player')).status, 403);
  assert.equal((await request(route, 'POST', {}, 'player')).status, 403);
  const teamPreview = await request(route + '?playerId=' + teamPlayer.id);
  assert.equal(teamPreview.status, 409);
  assert.equal(teamPreview.body.code, 'INVALID_PLAYER_TYPE');
  const teamNewLink = await request(route + '/duplicates?firstName=Team&lastName=Only&city=Jerusalem');
  assert.equal(teamNewLink.status, 409);
  assert.equal(teamNewLink.body.code, 'TEAM_PLAYER_NOT_ELIGIBLE');
  const preview = await ok(route, 'GET', undefined, 'judge');
  assert.equal(preview.tournament.type, 'quarterly');
  const fromId = await ok(route + '?playerId=' + existing.id);
  assert.equal(fromId.player.firstName, 'QrExisting');
  const matches = await ok(route + '/duplicates?firstName=QrExisting&lastName=Club&city=Rehovot');
  assert.ok(matches.matches.some(p => p.id === existing.id));

  const fields = {
    firstName: 'QrFresh', lastName: 'Participant', city: '', birthYear: 2015,
  };
  const created = await ok(route, 'POST', {
    ...fields, expectedRevision: preview.tournament.revision,
  }, 'judge', 201);
  assert.equal(created.created, true);
  assert.equal(created.player.playerType, 'quarterly');
  assert.equal(created.player.birthYear, 2015);
  assert.equal(created.player.city, '');
  assert.equal(String((await Player.findById(created.player.id)).team), 'null');
  let loaded = await Tournament.findById(event.id);
  assert.equal(loaded.currentParticipants, 1);
  assert.equal(loaded.clubRegistrations.length, 1);
  assert.equal(String(loaded.clubRegistrations[0].player), created.player.id);
  assert.equal(loaded.playerParticipants.length, 0);
  assert.equal(loaded.nextRoundParticipantIds, undefined);
  assert.equal((await request(route, 'POST', {
    ...fields, playerId: created.player.id, expectedRevision: loaded.revision,
  })).body.code, 'ALREADY_REGISTERED');

  const duplicate = await request(route, 'POST', {
    ...fields, expectedRevision: loaded.revision,
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.code, 'PLAYER_DUPLICATE');
  assert.equal((await Player.find({ firstName: 'QrFresh' })).length, 1);
  const intentionallyDistinct = await ok(route, 'POST', {
    ...fields, allowDuplicate: true, expectedRevision: loaded.revision,
  }, 'admin', 201);
  assert.notEqual(intentionallyDistinct.player.id, created.player.id);
  loaded = await Tournament.findById(event.id);
  assert.equal(loaded.clubRegistrations.length, 2);

  assert.equal((await request(route, 'POST', {
    firstName: 'QrExistingUpdated', lastName: 'Club', city: 'Tel Aviv', birthYear: 2014,
    playerId: existing.id, expectedRevision: loaded.revision,
  })).status, 409); // Editing an existing profile requires explicit consent.

  const edited = await ok(route, 'POST', {
    firstName: 'QrExistingUpdated', lastName: 'Club', city: 'Tel Aviv', birthYear: 2014,
    playerId: existing.id, updateExisting: true, expectedRevision: loaded.revision,
  }, 'judge', 201);
  assert.equal(edited.player.firstName, 'QrExistingUpdated');
  assert.equal((await Player.findById(existing.id)).birthYear, 2014);
  loaded = await Tournament.findById(event.id);
  assert.equal(loaded.clubRegistrations.length, 3);
  assert.equal(loaded.participants.length, 0);
  assert.equal(loaded.currentParticipants, 3);
  assert.ok(loaded.currentParticipants > 1); // No club participant limit.
  const teamDenied = await request(route, 'POST', {
    firstName: teamPlayer.firstName, lastName: teamPlayer.lastName, city: teamPlayer.city,
    playerId: teamPlayer.id, expectedRevision: loaded.revision,
  }, 'judge');
  assert.equal(teamDenied.status, 409);
  assert.equal(teamDenied.body.code, 'INVALID_PLAYER_TYPE');
  loaded = await Tournament.findById(event.id);
  assert.equal(loaded.clubRegistrations.length, 3);
  assert.equal((await Player.findById(teamPlayer.id)).team, null);
  assert.equal(loaded.playerParticipants.length, 0);

  assert.equal((await request(route, 'POST', {
    firstName: 'QrLater', lastName: 'Child', city: '', expectedRevision: 0,
  })).status, 409);
  const adminRead = await ok('/tournaments/management/legacy/' + event.id, 'GET', undefined, 'admin');
  assert.equal(adminRead.clubRegistrations.length, 3);

  const invalidResult = await request('/tournaments/' + event.id + '/results', 'POST', {
    results: [{ player: new mongoose.Types.ObjectId().toString(), playerModel: 'Player', playerName: 'Unregistered', points: 4, position: 1 }],
  }, 'admin');
  assert.equal(invalidResult.status, 400);

  const results = await ok('/tournaments/' + event.id + '/results', 'POST', {
    results: [
      { player: created.player.id, playerModel: 'Player', playerName: 'QrFresh Participant', position: 1, points: 4, rawPoints: 9 },
      { player: existing.id, playerModel: 'Player', playerName: 'QrExistingUpdated Club', position: 2, points: 3, rawPoints: 6 },
    ],
  }, 'admin');
  assert.equal(results.status, 'completed');
  assert.equal(results.results[0].playerModel, 'Player');
  const managed = await ok('/tournaments/management/legacy/' + event.id, 'GET', undefined, 'admin');
  assert.equal(String(managed.results[0].player), created.player.id);
  const national = await ok('/rankings?search=QrFresh', 'GET', undefined, null);
  assert.ok(national.rankings.some(row => row.playerName === 'QrFresh Participant' && row.points >= 4));

  const noTeam = await Tournament.create({
    title: 'not for clubs', description: 'Test', date: new Date(),
    location: 'Hall', image: '/test.png', maxParticipants: 10,
    registrationDeadline: new Date(), type: 'team_internal',
  });
  assert.equal((await request('/tournaments/' + noTeam.id + '/qr-registration')).status, 409);
  assert.equal((await request(route)).status, 409); // Completed tournament.
});


test('judge starts only a club event and reuses Swiss round workflow without touching teams', async () => {
  const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const tournament = await ok('/tournaments', 'POST', {
    date, location: 'Swiss Club', type: 'quarterly',
  }, 'admin', 201);
  const url = '/tournaments/' + tournament.id;
  assert.equal((await request(url + '/start', 'POST', {}, null)).status, 401);
  assert.equal((await request(url + '/start', 'POST', {}, 'player')).status, 403);
  assert.equal((await request(url + '/start', 'POST', {}, 'judge')).status, 409);

  const names = ['PairAlpha', 'PairBeta', 'PairGamma'];
  const players = await Player.create(names.map(firstName => ({
    firstName, lastName: 'ClubRounds', city: 'Rehovot',
    playerType: 'quarterly', isActive: true,
  })));
  await Tournament.findByIdAndUpdate(tournament.id, {
    $set: {
      clubRegistrations: players.map(p => ({
        player: p._id, nameSnapshot: p.firstName + ' ' + p.lastName,
      })),
      currentParticipants: players.length,
    },
  });

  const started = await ok(url + '/start', 'POST', {}, 'judge', 201);
  assert.equal(started.id, tournament.id);
  assert.equal(started.roundNumber, 1);
  const snapshot = await ok(url + '/round-management', 'GET', undefined, 'judge');
  assert.equal(snapshot.phase, 'running');
  assert.equal(snapshot.rounds.length, 1);
  assert.equal(snapshot.playerParticipants.length, 3);
  assert.equal(snapshot.rounds[0].matches.length, 2);
  assert.equal(snapshot.rounds[0].matches.filter(m => !m.player2).length, 1);
  assert.deepEqual(
    snapshot.rounds[0].matches.flatMap(m => [m.player1, ...(m.player2 ? [m.player2] : [])]).sort(),
    players.map(p => p.id).sort(),
  );
  assert.equal((await request(url + '/start', 'POST', {}, 'admin')).status, 409);

  const timerPath = url + '/round-management/rounds/1/timer';
  assert.equal((await request(timerPath, 'GET', undefined, null)).status, 401);
  assert.equal((await request(timerPath, 'GET', undefined, 'player')).status, 403);
  const readyClock = await ok(timerPath, 'GET', undefined, 'judge');
  assert.equal(readyClock.timer.status, 'ready');
  assert.equal(readyClock.timer.remainingSeconds, 3000);
  const runningClock = await ok(timerPath, 'PUT', {
    expectedTimerVersion: 0, action: 'start',
  }, 'judge');
  assert.equal(runningClock.timer.status, 'running');
  assert.equal((await request(timerPath, 'PUT', {
    expectedTimerVersion: 0, action: 'pause',
  }, 'judge')).status, 409);
  const pausedClock = await ok(timerPath, 'PUT', {
    expectedTimerVersion: 1, action: 'pause',
  }, 'judge');
  assert.equal(pausedClock.timer.status, 'paused');
  const configuredClock = await ok(timerPath, 'PUT', {
    expectedTimerVersion: 2, action: 'configure', durationSeconds: 1500,
  }, 'judge');
  assert.equal(configuredClock.timer.status, 'ready');
  assert.equal(configuredClock.timer.durationSeconds, 1500);
  assert.equal((await ok(url + '/round-management', 'GET', undefined, 'judge')).revision,
    snapshot.revision, 'clock actions must not invalidate result revisions');
  assert.equal((await request('/internal-tournaments/' + tournament.id, 'GET')).status, 404);
  assert.equal((await request(url + '/qr-registration', 'GET')).status, 409);
  assert.equal((await request(url + '/register', 'POST', {}, 'player')).status, 404);

  const paired = snapshot.rounds[0].matches.find(m => m.player2);
  assert.equal((await request(
    url + '/round-management/rounds', 'POST',
    { expectedRevision: snapshot.revision }, 'judge'
  )).status, 400);
  const recorded = await ok(
    url + '/round-management/rounds/1/matches/' + paired._id,
    'PUT', {
      expectedRevision: snapshot.revision,
      expectedResultRevision: 0,
      result: { winner: 'player1', score1: 2, score2: 0, drawnGames: 0 },
    }, 'judge',
  );
  assert.equal(recorded.rounds[0].matches.find(m => m._id === paired._id).result.winner, 'player1');
  const roundTwo = await ok(url + '/round-management/rounds', 'POST', {
    expectedRevision: recorded.revision,
  }, 'admin');
  assert.equal(roundTwo.rounds.length, 2);
  assert.equal(roundTwo.phase, 'running');
  const nextClock = await ok(url + '/round-management/rounds/2/timer', 'GET', undefined, 'judge');
  assert.equal(nextClock.timer.status, 'ready');
  assert.equal(nextClock.timer.remainingSeconds, 1500);

  assert.equal((await Tournament.findById(tournament.id)).type, 'quarterly');
  assert.equal((await Tournament.findById(tournament.id)).team, null);
  assert.equal((await request(url + '/round-management/rounds/2', 'DELETE', {
    expectedRevision: roundTwo.revision,
  }, 'player')).status, 403);

  const cancelled = await ok(url + '/round-management/rounds/2', 'DELETE', {
    expectedRevision: roundTwo.revision,
  }, 'judge');
  assert.equal(cancelled.rounds.length, 1);
  const closed = await ok(url + '/round-management/close', 'POST', {
    expectedRevision: cancelled.revision,
  }, 'judge');
  assert.equal(closed.status, 'completed');
  assert.equal(closed.finalStandings.length, 3);
  assert.equal((await request(url + '/round-management/rounds', 'POST', {
    expectedRevision: closed.revision,
  }, 'admin')).status, 409);
});

test('starting a club tournament rejects unlinked users and team players without altering registration', async () => {
  const event = await ok('/tournaments', 'POST', {
    date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    location: 'Mixed Registration',
  }, 'admin', 201);
  const old = await User.create({
    name: 'Unlinked Player', username: 'unlinked-club-player',
    password: randomBytes(24).toString('hex'), role: 'player',
  });
  const teamPlayer = await Player.create({
    firstName: 'Forbidden', lastName: 'Team', city: 'Tel Aviv',
    playerType: 'team', isActive: true,
  });
  await Tournament.findByIdAndUpdate(event.id, {
    $set: { participants: [{ user: old._id }], clubRegistrations: [
      { player: teamPlayer._id, nameSnapshot: 'Forbidden Team' },
    ], currentParticipants: 2 },
  });
  const path = '/tournaments/' + event.id;
  const unlinked = await request(path + '/start', 'POST', {}, 'judge');
  assert.equal(unlinked.status, 409);
  assert.equal(unlinked.body.code, 'UNLINKED_PARTICIPANTS');
  const clubPlayer = await Player.create({
    firstName: 'Linked', lastName: 'Club', city: 'Rehovot',
    playerType: 'quarterly', isActive: true,
  });
  await User.findByIdAndUpdate(old.id, { $set: { player: clubPlayer._id } });
  const invalid = await request(path + '/start', 'POST', {}, 'judge');
  assert.equal(invalid.status, 409);
  assert.equal(invalid.body.code, 'INELIGIBLE_PLAYERS');
  const unchanged = await Tournament.findById(event.id);
  assert.equal(unchanged.engineVersion, null);
  assert.equal(unchanged.rounds.length, 0);
});


test('club roster combines QR and legacy signups, offers only unregistered club Players, and supports staff edits', async () => {
  const event = await ok('/tournaments', 'POST', {
    date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    location: 'Unified Club Roster', type: 'quarterly',
  }, 'admin', 201);
  const base = '/tournaments/' + event.id + '/club-participants';
  const club = await Player.create([
    { firstName: 'Roster', lastName: 'First', city: 'Rehovot', playerType: 'quarterly' },
    { firstName: 'Roster', lastName: 'Second', city: 'Jerusalem', playerType: 'quarterly' },
    { firstName: 'Roster', lastName: 'Third', city: 'Tel Aviv', playerType: 'quarterly' },
  ]);
  const teamPlayer = await Player.create({
    firstName: 'Roster', lastName: 'Team', city: 'Rehovot', playerType: 'team',
  });
  const staffPlayer = await Player.create({
    firstName: 'Roster', lastName: 'Staff', city: 'Rehovot', playerType: 'quarterly',
    user: staffIds.judge,
  });
  const legacyUser = await User.create({
    name: 'Legacy Child', username: 'unified-legacy-child',
    password: randomBytes(24).toString('hex'), role: 'player', player: club[1]._id,
  });
  await Tournament.findByIdAndUpdate(event.id, {
    $set: {
      participants: [{ user: legacyUser._id, registeredAt: new Date() }],
      clubRegistrations: [{
        player: club[0]._id, nameSnapshot: 'Roster First', registeredAt: new Date(),
      }],
      currentParticipants: 2,
    },
  });
  assert.equal((await request(base, 'GET', undefined, null)).status, 401);
  assert.equal((await request(base, 'GET', undefined, 'player')).status, 403);
  const data = await ok(base, 'GET', undefined, 'judge');
  assert.equal(data.registered.length, 2);
  assert.deepEqual(data.registered.map(row => row.name).sort(), [
    'Roster First', 'Roster Second',
  ]);
  assert.deepEqual(data.available.filter(row => row.name.startsWith('Roster')).map(row => row.name), ['Roster Third']);
  assert.ok(!data.available.some(row => row.id === teamPlayer.id || row.id === staffPlayer.id));
  assert.equal((await request(base, 'POST', { playerId: club[0].id })).status, 409);
  assert.equal((await request(base, 'POST', { playerId: club[1].id })).status, 409);
  assert.equal((await request(base, 'POST', { playerId: teamPlayer.id })).status, 409);
  assert.equal((await request(base, 'POST', { playerId: staffPlayer.id })).status, 409);
  assert.equal((await request(base, 'POST', { playerId: club[2].id }, 'player')).status, 403);
  await ok(base, 'POST', { playerId: club[2].id }, 'judge', 201);
  const updated = await ok(base, 'GET', undefined, 'admin');
  assert.equal(updated.registered.length, 3);
  assert.equal(updated.available.filter(row => row.name.startsWith('Roster')).length, 0);
  assert.equal(updated.canAdd, true);
  assert.equal((await request(base, 'POST', { playerId: club[2].id }, 'admin')).status, 409);
  assert.equal((await request(base + '/player/' + club[2].id, 'DELETE', undefined, 'player')).status, 403);
  await ok(base + '/player/' + club[2].id, 'DELETE', undefined, 'admin');
  const afterPlayer = await ok(base);
  assert.equal(afterPlayer.registered.length, 2);
  assert.equal(afterPlayer.available.filter(row => row.name.startsWith('Roster')).length, 1);
  await ok(base + '/user/' + legacyUser.id, 'DELETE');
  const afterLegacy = await ok(base);
  assert.equal(afterLegacy.registered.length, 1);
  assert.equal(afterLegacy.available.filter(row => row.name.startsWith('Roster')).length, 2);
  assert.equal((await Tournament.findById(event.id)).currentParticipants, 1);
  assert.ok(await Player.findById(club[2].id));
  assert.ok(await User.findById(legacyUser.id));

  const startedPlayer = await ok(base, 'POST', { playerId: club[2].id }, 'admin', 201);
  assert.ok(startedPlayer);
  await ok('/tournaments/' + event.id + '/start', 'POST', {}, 'judge', 201);
  assert.equal((await request(base, 'POST', { playerId: club[1].id }, 'admin')).status, 409);
  assert.equal((await request(base + '/player/' + club[0].id, 'DELETE', undefined, 'admin')).status, 409);
  const running = await ok(base);
  assert.equal(running.canAdd, false);
  assert.equal(running.available.length, 0);
});

test('unified club participant routes reject team tournaments and invalid player IDs', async () => {
  const teamEvent = await Tournament.create({
    title: 'Team Event', description: 'Team only', date: new Date(),
    registrationDeadline: new Date(), location: 'Team hall', image: '/team.png',
    type: 'inter_team', maxParticipants: 4, status: 'upcoming',
  });
  const path = '/tournaments/' + teamEvent.id + '/club-participants';
  assert.equal((await request(path, 'GET', undefined, 'admin')).status, 409);
  assert.equal((await request(path, 'POST', { playerId: 'invalid' }, 'admin')).status, 409);
});

test('trial team players are reversible without losing historical tournament results', async () => {
  const team = await ok('/teams', 'POST', { name: 'Trial members ' + randomUUID().slice(0, 8) }, 'admin', 201);
  await ok(`/teams/${team.id}/players`, 'POST', {
    players: [{ firstName: 'TrialBase', lastName: 'One' }, { firstName: 'TrialBase', lastName: 'Two' }],
  }, 'admin', 201);
  let t = await ok('/internal-tournaments', 'POST', { teamId: team.id }, 'judge', 201);
  const intake = { expectedRevision: t.revision, firstName: 'TrialGuest', lastName: 'Candidate', city: 'רחובות' };
  assert.equal((await request(`/internal-tournaments/${t.id}/trial-players`, 'POST', intake, 'player')).status, 403);
  const response = await ok(`/internal-tournaments/${t.id}/trial-players`, 'POST', intake, 'judge', 201);
  t = response.tournament;
  const trialId = response.player.id;
  assert.ok(t.nextRoundParticipantIds.includes(trialId));
  assert.equal((await Player.findById(trialId)).teamMembershipStatus, 'trial');
  let members = await ok(`/teams/${team.id}`, 'GET', undefined, 'judge');
  assert.ok(members.players.some(p => p.id === trialId && p.teamMembershipStatus === 'trial'));
  const round = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
  const match = round.rounds[0].matches.find(m => m.player2);
  assert.equal((await request(`/teams/${team.id}/trials/${trialId}/resolve`, 'PUT',
    { action: 'dismiss' }, 'judge')).status, 403);
  assert.equal((await request(`/teams/${team.id}/trials/${trialId}/resolve`, 'PUT',
    { action: 'dismiss' }, 'admin')).status, 409);
  const scored = await ok(`/internal-tournaments/${t.id}/rounds/1/matches/${match._id}`,
    'PUT', { expectedResultRevision: match.resultRevision, result: { winner: 'player1', score1: 2, score2: 0 } });
  await ok(`/internal-tournaments/${t.id}/close`, 'POST', { expectedRevision: scored.revision });
  const before = await ok(`/all-stars/rankings?teamId=${team.id}`, 'GET', undefined, null);
  assert.ok(before.rankings.some(row => row.playerId === trialId));
  await ok(`/teams/${team.id}/trials/${trialId}/resolve`, 'PUT', { action: 'dismiss' }, 'admin');
  members = await ok(`/teams/${team.id}`, 'GET', undefined, 'judge');
  assert.ok(!members.players.some(p => p.id === trialId));
  const after = await ok(`/all-stars/rankings?teamId=${team.id}`, 'GET', undefined, null);
  assert.ok(!after.rankings.some(row => row.playerId === trialId));
  const publicDetails = await ok(`/tournaments/${t.id}`, 'GET', undefined, null);
  assert.ok(publicDetails.standings.some(row => row.player === trialId));
  assert.ok(publicDetails.rounds[0].matches.some(row =>
    row.player1Name === 'TrialGuest Candidate' || row.player2Name === 'TrialGuest Candidate'));
  assert.equal((await Player.findById(trialId)).teamMembershipStatus, 'dismissed');
  assert.equal((await Player.findById(trialId)).isActive, true);

  let next = await ok('/internal-tournaments', 'POST', { teamId: team.id }, 'judge', 201);
  const trial2 = await ok(`/internal-tournaments/${next.id}/trial-players`,
    'POST', { expectedRevision: next.revision, firstName: 'TrialPermanent', lastName: 'Member' }, 'judge', 201);
  next = trial2.tournament;
  const approved = await ok(`/teams/${team.id}/trials/${trial2.player.id}/resolve`,
    'PUT', { action: 'confirm', playerNumber: 'guest-2026' }, 'admin');
  assert.equal(approved.teamMembershipStatus, 'permanent');
  assert.equal(approved.playerNumber, 'guest-2026');
  assert.equal(String(approved.team), team.id);
  assert.equal((await request(`/internal-tournaments/${next.id}/trial-players`, 'POST',
    { expectedRevision: next.revision, playerId: approved.id }, 'judge')).status, 409);
});


test('club-only public Events pagination includes legacy null types and excludes teams', async () => {
  const key = 'club-filter-' + randomUUID().slice(0, 8);
  const date = new Date(Date.now() + 86400000);
  const base = {
    description: 'public filter fixture', date, location: 'רחובות',
    image: '/event.png', registrationDeadline: date,
  };
  await Tournament.create([
    { ...base, title: key + ' regular', type: 'quarterly' },
    { ...base, title: key + ' legacy', type: null },
    { ...base, title: key + ' internal', type: 'team_internal', maxParticipants: 128 },
  ]);
  const all = await ok(`/tournaments?search=${key}&pageSize=10`, 'GET', undefined, null);
  assert.equal(all.total, 3);
  const first = await ok(`/tournaments?type=quarterly&search=${key}&pageSize=1&page=1`, 'GET', undefined, null);
  const second = await ok(`/tournaments?type=quarterly&search=${key}&pageSize=1&page=2`, 'GET', undefined, null);
  assert.equal(first.total, 2);
  assert.equal(first.totalPages, 2);
  assert.equal(second.total, 2);
  assert.equal(second.items.length, 1);
  assert.ok([...first.items, ...second.items].every(row => row.type === 'quarterly'));
  assert.ok(![...first.items, ...second.items].some(row => row.title.endsWith('internal')));
});


test('admin overview returns the inter-team workspace for the nearest Swiss meeting',async()=>{
 const {adminOverview}=await import('../services/overview.js');
 const date=new Date('2000-01-01T12:00:00Z');
 const fixture=await Tournament.create({title:'Overview route fixture',description:'Test',date,location:'Test',registrationDeadline:date,image:'/event.png',type:'inter_team',engineVersion:'swiss-v1',source:'live',status:'upcoming',phase:'setup',maxParticipants:128});
 try {
  const overview=await adminOverview(new Date('1999-12-31T12:00:00Z'));
  assert.equal(overview.nearest.id,fixture.id);
  assert.equal(overview.nearest.managementPath,`/manage/inter-team/${fixture.id}`);
 } finally {await fixture.deleteOne();}
});


test('badge program public explanation and verified image are independent of individual badges',async()=>{
 const path='/badges/program';
 const empty=await ok(path,'GET',undefined,null);
 assert.equal(empty.description,'');assert.equal(empty.image,'');
 assert.equal((await request(path,'PUT',{description:'Denied'},null)).status,401);
 assert.equal((await request(path,'PUT',{description:'Denied'},'judge')).status,403);
 assert.equal((await request(path,'PUT',{description:'x'.repeat(5001)},'admin')).status,400);
 assert.equal((await request('/media/presign','POST',{purpose:'badge-program-image',contentType:'image/png',size:png.length},'admin')).status,400);
 const image=await uploaded('badge-program-image',empty.id);
 const saved=await ok(path,'PUT',{description:'מערך התגים',imageUploadId:image.uploadId},'admin');
 assert.equal(saved.image,image.url);
 assert.deepEqual(await ok(path,'GET',undefined,null),saved);
 assert.deepEqual(Object.keys(saved).sort(),['description','descriptionHtml','id','image']);
 assert.equal(saved.descriptionHtml,'<p>מערך התגים</p>');
 const changed=await ok(path,'PUT',{description:'הסבר חדש'},'admin');
 assert.equal(changed.image,image.url);
 const wrong=await uploaded('badge-image');
 assert.equal((await request(path,'PUT',{description:'Bad',imageUploadId:wrong.uploadId},'admin')).status,400);
 const replaced=await uploaded('badge-program-image',empty.id);
 await ok(path,'PUT',{description:'הסבר חדש',imageUploadId:replaced.uploadId},'admin');
 assert.ok(removedMedia.includes(image.storageKey));
 const cleared=await ok(path,'PUT',{description:'',imageUploadId:null},'admin');
 assert.equal(cleared.image,'');assert.ok(removedMedia.includes(replaced.storageKey));
});

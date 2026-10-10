import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as connectSocket } from 'socket.io-client';
import { configureTournamentLive } from '../services/tournamentLive.js';
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
    { firstName: 'Unassigned', lastName: 'Child', city: 'City' },
    'admin',
    201,
  );
  assert.equal(unassigned.user, null);
  const club = await ok(
    '/players/quarterly',
    'POST',
    { firstName: 'Club', lastName: 'Child', club: 'Club' },
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
    (await ok('/players?type=quarterly')).every((p) => p.playerType === 'team'),
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
  assert.equal(
    (
      await request(`/internal-tournaments/${t.id}/participants`, 'PUT', {
        expectedRevision: t.revision,
        playerIds: children.slice(0, 4).map((p) => p.id),
      })
    ).status,
    409,
  );
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
  assert.equal(t.finalStandings.length, 3);
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
  const regularList = await ok('/tournaments', 'GET', undefined, null);
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
  const registered = await ok(
    `/tournaments/${regular.id}/register`,
    'POST',
    {},
    'player',
  );
  assert.equal(registered.currentParticipants, 1);
  assert.deepEqual(await ok(`/tournaments/${regular.id}/register`, 'GET', undefined, 'player'), {registered:true});
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
          player: linkedUser.id,
          playerName: 'Renamed Linked',
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
  assert.equal(regularResults[0].playerName, 'Renamed Linked');
  let ranks = await ok('/all-stars/rankings', 'GET', undefined, null);
  assert.equal(ranks.rankings.length, 3);
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
  ranks = await ok('/all-stars/rankings', 'GET', undefined, null);
  assert.equal(ranks.rankings.length, 4);
  assert.equal(
    ranks.rankings.reduce((sum, row) => sum + row.points, 0),
    t.finalStandings.reduce((sum, row) => sum + row.points, 0) + 30,
  );
  await Season.updateMany({}, { status: 'closed' });
  await Season.create({ name: 'Next badge season', createdBy: admin._id });
  assert.deepEqual(
    (await ok('/all-stars/rankings', 'GET', undefined, null)).rankings,
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
  assert.equal(teamRank.rankings.length, 1);
  assert.equal(teamRank.rankings[0].playerId, children[0].id);
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
    { firstName: 'Roster', lastName: 'Race' },
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
    ]);
    judge.connect();
    admin.connect();
    await ready;
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
    for (const event of await updates) {
      assert.equal(event.id, t.id);
      assert.equal(event.revision, t.revision);
    }
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
    const before = await ok('/all-stars/rankings', 'GET', undefined, null);
    assert.ok(
      before.rankings.some(
        (row) => row.playerId === players[0].id && row.points >= 9,
      ),
    );
    const list = await ok('/tournaments/management');
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
      !(await ok('/all-stars/rankings', 'GET', undefined, null)).rankings.some(
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

test('media endpoint enforces admin auth, type and body size before provider access', async () => {
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6n4kAAAAASUVORK5CYII=',
    'base64',
  );
  const send = (bytes, role, mime = 'image/png') =>
    fetch(`${origin}/api/media/images`, {
      method: 'POST',
      headers: {
        'Content-Type': mime,
        ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}),
      },
      body: bytes,
    });
  assert.equal((await send(image, null)).status, 401);
  assert.equal((await send(image, 'player')).status, 403);
  assert.equal((await send(image, 'judge')).status, 403);
  assert.equal(
    (await send(Buffer.from('<svg/>'), 'admin', 'image/svg+xml')).status,
    400,
  );
  assert.equal(
    (await send(Buffer.alloc(5 * 1024 * 1024 + 1), 'admin')).status,
    413,
  );
  if (!process.env.CLOUDINARY_API_SECRET)
    assert.equal((await send(image, 'admin')).status, 503);
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
    ['/players/quarterly', 'POST', { firstName: 'Extra', lastName: 'Child', club: 'Club' }],
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
  assert.equal((await ok('/tournaments/management')).find(row => row.id === t.id).canManage, true);
  t = await ok(`/internal-tournaments/${t.id}/participants`, 'PUT', {
    expectedRevision: t.revision, playerIds: children.slice(0, 2).map(child => child.id),
  });
  const { updatedAt: beforeLockTime, ...beforeTeamData } = beforeTeam;
  const { updatedAt: afterLockTime, ...afterTeamData } = (await Team.findById(team.id)).toObject();
  assert.ok(afterLockTime >= beforeLockTime); // Existing document lock updates timestamps only.
  assert.deepEqual(afterTeamData, beforeTeamData);
  assert.deepEqual(await Player.find({ team: team.id }).sort({ _id: 1 }).lean(), beforePlayers);
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', { expectedRevision: t.revision });
  assert.equal((await request(`/internal-tournaments/${t.id}/participants`, 'PUT', {
    expectedRevision: t.revision, playerIds: children.map(child => child.id),
  })).status, 409);
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
    assert.equal((await ok('/tournaments/management')).find(row => row.id === event.id).canManage, false);
    assert.equal((await ok('/tournaments/management', 'GET', undefined, 'admin')).find(row => row.id === event.id).canManage, true);
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
    assert.equal((await ok('/tournaments/management')).find(row => row.id === opened.id).canManage, false);
    assert.equal((await ok('/tournaments/management', 'GET', undefined, 'admin')).find(row => row.id === opened.id).canManage, true);
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
    assert.equal((await request(`/internal-tournaments/${t.id}/participants`, 'PUT', { expectedRevision: t.revision, playerIds: roster.map(p => p.player) })).status, 409);
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
  assert.ok(!(await ok('/tournaments/management')).some(row => row.id === t.id));
  assert.ok(!(await ok(`/internal-tournaments?teamId=${team.id}`)).some(row => row.id === t.id));
  const replacement = await ok('/internal-tournaments', 'POST', { teamId: team.id }, 'judge', 201);
  assert.notEqual(replacement.id, t.id);
  const indexes = await Tournament.collection.indexes();
  assert.ok(indexes.some(index => index.name === 'one_open_internal_per_team_active'));
  assert.ok(!indexes.some(index => index.name === 'one_open_internal_per_team'));
  assert.equal((await ok(`/teams/${team.id}`)).openInternalTournament.id, replacement.id);
  const historical = await ok('/internal-tournaments/historical', 'POST', { teamId: team.id, date: '2026-10-04', results: players.map((p,i) => ({ player:p.id, position:i+1, points:6-i*3 })) }, 'admin', 201);
  assert.ok((await ok('/all-stars/rankings', 'GET', undefined, null)).rankings.some(row => row.playerId === players[0].id));
  await ok(`/tournaments/${historical.id}`, 'DELETE', undefined, 'admin');
  assert.ok(!(await ok('/all-stars/rankings', 'GET', undefined, null)).rankings.some(row => row.playerId === players[0].id));
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
  assert.deepEqual(Object.keys(publicData).sort(), ['id','firstName','lastName','city','team','overallRanking','teamRanking','badges'].sort());
  assert.equal(publicData.firstName, player.firstName);
  assert.equal(publicData.overallRanking, null);
  const club = await Player.create({ firstName:'Private',lastName:'Club',club:'Test',playerType:'quarterly' });
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

test('public Events and details expose all types and only each tournament standings', async () => {
  const team = await ok('/teams', 'POST', { name: 'Public event team' }, 'admin', 201);
  const players = await ok(`/teams/${team.id}/players`, 'POST', { players: ['A','B'].map(firstName => ({firstName,lastName:'Public'})) }, 'admin', 201);
  let t = await ok('/internal-tournaments', 'POST', {teamId:team.id}, 'judge', 201);
  const upcoming = await ok(`/tournaments/${t.id}`, 'GET', undefined, null);
  assert.equal(upcoming.lifecycle, 'upcoming');
  assert.deepEqual(upcoming.standings, []);
  t = await ok(`/internal-tournaments/${t.id}/rounds`, 'POST', {expectedRevision:t.revision});
  const match = t.rounds[0].matches[0];
  t = await ok(`/internal-tournaments/${t.id}/rounds/1/matches/${match._id}`, 'PUT', {expectedResultRevision:match.resultRevision, result:{winner:'player1', score1:2,score2:0}});
  const active = await ok(`/tournaments/${t.id}`, 'GET', undefined, null);
  assert.equal(active.lifecycle, 'active');
  assert.equal(active.standings.length, 2);
  assert.equal(active.standings[0].points, 3);
  assert.ok(active.standings.every(s => players.some(p => p.id === s.player)));
  const forbidden = /"(?:teacher|createdBy|staff|revision|resultRevision|enteredBy|deletedAt|deletedBy|invalidatedRounds|audit|participants|playerParticipants|rounds|canManage)"\s*:/;
  assert.ok(!forbidden.test(JSON.stringify(active)));
  t = await ok(`/internal-tournaments/${t.id}/close`, 'POST', {expectedRevision:t.revision});
  const completed = await ok(`/tournaments/${t.id}`, 'GET', undefined, null);
  assert.equal(completed.lifecycle, 'completed');
  assert.deepEqual(completed.standings, active.standings);
  assert.deepEqual(await ok(`/tournaments/${t.id}/results`, 'GET', undefined, null), completed.standings);
  const inter = await Tournament.create({ title:'Inter-team public',description:'Public',location:'Club',image:'/event.png',date:new Date(Date.now()+86400000),registrationDeadline:new Date(),maxParticipants:16,type:'inter_team' });
  const list = await ok('/tournaments', 'GET', undefined, null);
  assert.ok(list.some(e => e.id === t.id && e.type === 'team_internal'));
  assert.ok(list.some(e => e.id === inter.id && e.type === 'inter_team'));
  assert.ok(list.some(e => e.type === 'quarterly'));
  assert.ok(!forbidden.test(JSON.stringify(list)));
  await ok(`/tournaments/${t.id}`, 'DELETE', undefined, 'admin');
  assert.equal((await request(`/tournaments/${t.id}`, 'GET', undefined, null)).status, 404);
  assert.ok(!(await ok('/tournaments', 'GET', undefined, null)).some(e => e.id === t.id));
});

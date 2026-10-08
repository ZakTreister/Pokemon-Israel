import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { createServer } from 'vite';
const storage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.localStorage = storage;
globalThis.window = {
  location: { origin: 'http://localhost:5173' },
  localStorage: storage,
  setInterval,
  clearInterval,
};
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  plugins: [
    {
      name: 'fixture-live-transport',
      enforce: 'pre',
      load(id) {
        if (id.endsWith('/src/services/tournamentLive.ts'))
          return `export function subscribeTournament(id, changed, connectionChanged) {
      globalThis.fixtureLive = { changed, connectionChanged }; connectionChanged(true);
      return () => { globalThis.fixtureLive = null; };
    }`;
      },
    },
  ],
});
const el = React.createElement;
const flush = () => new Promise((resolve) => setImmediate(resolve));
let renderer;
try {
  const load = async (path) => await vite.ssrLoadModule(`/src/${path}`);
  const { store } = await load('store/index.ts');
  const { default: Manage } = await load(
    'pages/manage/ManageDashboardPage.tsx',
  );
  const { ToastProvider } = await load('components/ui/ToastProvider.tsx');
  const { ConfirmProvider } = await load('components/ui/ConfirmProvider.tsx');
  const { internalTournaments: service } = await load(
    'services/internalTournaments.ts',
  );
  const { default: teams } = await load('features/teams/teamsService.ts');
  const id = '012345678901234567890123';
  const teamId = '012345678901234567890124';
  const players = [
    { id: 'p1', firstName: 'ילד', lastName: 'אחד' },
    { id: 'p2', firstName: 'ילד', lastName: 'שני' },
  ];
  const team = {
    id: teamId,
    name: 'נבחרת בדיקה',
    isActive: true,
    playerCount: 2,
    players,
  };
  let serverState = {
    id,
    team: teamId,
    title: 'טורניר בדיקה',
    teamNameSnapshot: team.name,
    date: '2026-10-07',
    currentParticipants: 2,
    phase: 'setup',
    status: 'upcoming',
    source: 'live',
    revision: 3,
    rounds: [],
    invalidatedRounds: [],
    standings: [],
    playerParticipants: players.map((p) => ({
      player: p.id,
      nameSnapshot: `${p.firstName} ${p.lastName}`,
    })),
  };
  teams.getTeam = async () => structuredClone(team);
  service.rankings = async () => ({ rankings: [] });
  service.get = async (requested) => {
    assert.equal(requested, id);
    return structuredClone(serverState);
  };
  let startCalls = 0,
    finishStart;
  service.create = (requested) => {
    assert.equal(requested, teamId);
    startCalls++;
    return new Promise((resolve) => {
      finishStart = resolve;
    });
  };
  service.pair = async (requested, revision) => {
    assert.equal(requested, id);
    assert.equal(revision, serverState.revision);
    serverState = {
      ...serverState,
      phase: 'running',
      revision: revision + 1,
      rounds: [
        {
          number: 1,
          matches: [
            {
              _id: 'match1',
              table: 1,
              player1: 'p1',
              player2: 'p2',
              result: null,
            },
          ],
        },
      ],
    };
    return structuredClone(serverState);
  };
  let navigate;
  function Location() {
    navigate = useNavigate();
    return el('output', { id: 'location' }, useLocation().pathname);
  }
  function mount(role) {
    const initial = store.getState();
    const fixture = {
      ...initial,
      teams: {
        ...initial.teams,
        isLoading: false,
        teams: [team],
        manageablePlayers: players.map((p) => ({
          ...p,
          team: { id: teamId },
          isActive: true,
        })),
      },
      auth: {
        ...initial.auth,
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'staff', name: 'Staff', role },
      },
    };
    const fixtureStore = {
      getState: () => fixture,
      subscribe: () => () => {},
      dispatch: (action) => action,
    };
    return TestRenderer.create(
      el(
        Provider,
        { store: fixtureStore },
        el(
          MemoryRouter,
          {
            initialEntries: ['/manage/teams'],
            future: { v7_startTransition: true, v7_relativeSplatPath: true },
          },
          el(
            ToastProvider,
            {},
            el(
              ConfirmProvider,
              {},
              el(Location),
              el(
                Routes,
                {},
                el(Route, { path: '/manage/*', element: el(Manage) }),
              ),
            ),
          ),
        ),
      ),
    );
  }
  const text = (node) =>
    typeof node === 'string'
      ? node
      : Array.isArray(node)
        ? node.map(text).join('')
        : (node?.children || []).map(text).join('');
  const button = (label) =>
    renderer.root.findAllByType('button').find((node) => text(node) === label);
  // Admin and judge get the same operational start action; configuration remains distinct.
  for (const role of ['admin', 'judge']) {
    await act(async () => {
      renderer = mount(role);
      await flush();
    });
    assert.ok(button('התחל טורניר'));
    assert.equal(!!button('נבחרת חדשה'), role === 'admin');
    const rosterLink = renderer.root
      .findAllByType('a')
      .find((node) => text(node) === 'סגל');
    assert.equal(rosterLink.props.href, `/manage/teams/${teamId}`);
    await act(async () => {
      rosterLink.props.onClick({
        button: 0,
        defaultPrevented: false,
        preventDefault() {},
        metaKey: false,
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
      });
      await flush();
    });
    assert.equal(startCalls, 0, 'Roster navigation never creates a tournament');
    assert.ok(text(renderer.toJSON()).includes('סגל פעיל ודירוג בנבחרת'));
    act(() => renderer.unmount());
  }
  await act(async () => {
    renderer = mount('judge');
    await flush();
  });
  const start = button('התחל טורניר').props.onClick;
  act(() => {
    start();
    start();
  });
  assert.equal(startCalls, 1, 'Repeated start clicks create one tournament');
  assert.equal(button('פותח טורניר…').props.disabled, true);
  await act(async () => {
    finishStart(structuredClone(serverState));
    await flush();
  });
  assert.equal(
    text(renderer.root.findByProps({ id: 'location' })),
    `/manage/tournaments/${id}`,
  );
  assert.ok(text(renderer.toJSON()).includes('נוכחות לפני סיבוב 1'));
  await act(async () => {
    button('הגרל סיבוב 1').props.onClick();
    await flush();
  });
  const pageText = () => text(renderer.toJSON());
  assert.ok(
    pageText().indexOf('דירוג ותוצאות') < pageText().indexOf('שולחן 1'),
  );
  assert.ok(
    pageText().indexOf('שולחן 1') < pageText().indexOf('הגרל סיבוב נוסף'),
  );
  assert.ok(
    pageText().indexOf('הגרל סיבוב נוסף') <
      pageText().indexOf('מידע על שמירה וסנכרון'),
  );
  assert.equal(renderer.root.findAllByProps({ role: 'alert' }).length, 0);
  assert.equal((pageText().match(/חזרה לטורנירים/g) || []).length, 1);
  assert.ok(!JSON.stringify(renderer.toJSON()).includes('min-h-16'));
  const match = renderer.root.findByProps({ role: 'article' });
  for (let ancestor = match.parent; ancestor; ancestor = ancestor.parent) {
    if (typeof ancestor.type === 'string')
      assert.ok(
        !(
          ancestor.props.className?.includes('bg-card') &&
          ancestor.props.className?.includes('shadow-panel')
        ),
        'No redundant outer card around matches',
      );
  }
  assert.equal(button('הגרל סיבוב נוסף').props.disabled, true);
  const winner = match.findAllByType('button')[0];
  act(() => winner.props.onClick());
  act(() =>
    match.findByType('select').props.onChange({ target: { value: '1-0' } }),
  );
  service.result = async () => {
    throw new Error('Network Error');
  };
  await act(async () => {
    await button('שמור תוצאה').props.onClick();
  });
  assert.ok(pageText().includes('השמירה לא אושרה'));
  assert.ok(!pageText().includes('Network Error'));
  assert.equal(
    renderer.root.findByProps({ 'aria-label': 'סיבוב נוכחי' }).props.disabled,
    true,
  );
  assert.equal(match.findByType('select').props.value, '1-0');
  service.result = async (requested, revision, round, matchId, result) => {
    assert.equal(requested, id);
    assert.equal(revision, 4);
    assert.equal(round, 1);
    assert.equal(matchId, 'match1');
    serverState = {
      ...serverState,
      revision: 5,
      rounds: [
        {
          number: 1,
          matches: [{ ...serverState.rounds[0].matches[0], result }],
        },
      ],
    };
    return structuredClone(serverState);
  };
  await act(async () => {
    await button('נסה לשמור שוב').props.onClick();
  });
  assert.equal(renderer.root.findAllByProps({ role: 'alert' }).length, 0);
  assert.equal(button('הגרל סיבוב נוסף').props.disabled, false);
  let cancelCalls = 0;
  service.cancelRound = async (requested, revision, roundNumber) => {
    cancelCalls++;
    assert.equal(requested, id);
    assert.equal(revision, serverState.revision);
    assert.equal(roundNumber, 1);
    serverState = {
      ...serverState,
      revision: revision + 1,
      rounds: [],
      phase: 'running',
    };
    return structuredClone(serverState);
  };
  act(() => button('בטל סיבוב').props.onClick());
  assert.ok(pageText().includes('הסגל יישאר נעול'));
  await act(async () => {
    button('ביטול').props.onClick();
    await flush();
  });
  assert.equal(cancelCalls, 0);
  act(() => button('בטל סיבוב').props.onClick());
  await act(async () => {
    renderer.root
      .findAllByType('button')
      .filter((b) => text(b) === 'בטל סיבוב')
      .at(-1)
      .props.onClick();
    await flush();
  });
  assert.equal(cancelCalls, 1);
  assert.ok(!pageText().includes('נוכחות לפני סיבוב 1'));
  assert.ok(!button('שמור נוכחות'));
  assert.equal(button('הגרל סיבוב 1').props.disabled, false);
  assert.equal(button('סיים טורניר').props.disabled, true);
  await act(async () => {
    button('הגרל סיבוב 1').props.onClick();
    await flush();
  });
  serverState = { ...serverState, revision: serverState.revision + 1, rounds: [
    ...serverState.rounds,
    { number: 2, matches: [{ ...serverState.rounds[0].matches[0], _id: 'match2' }] },
  ] };
  await act(async () => { globalThis.fixtureLive.changed(); await flush(); });
  assert.ok(!button('בטל סיבוב'), 'An older selected round cannot be cancelled');
  await act(async () => renderer.root.findByProps({ 'aria-label': 'סיבוב נוכחי' }).props.onChange({ target: { value: '2' } }));
  assert.ok(button('בטל סיבוב'));
  act(() => globalThis.fixtureLive.connectionChanged(false));
  assert.ok(pageText().includes('עדכון חי מנותק'));
  act(() => globalThis.fixtureLive.connectionChanged(true));
  assert.ok(!pageText().includes('עדכון חי מנותק'));
  serverState = {
    ...serverState,
    revision: serverState.revision + 1,
    status: 'completed',
    phase: 'completed',
  };
  await act(async () => {
    globalThis.fixtureLive.changed();
    await flush();
  });
  assert.ok(pageText().includes('דירוג סופי'));
  assert.ok(!button('שמור תוצאה'));
  assert.ok(!button('הגרל סיבוב נוסף'));
  assert.ok(!button('סיים טורניר'));
  act(() => renderer.unmount());
  renderer = null;
  for (const state of [
    { source: null, phase: 'setup', status: 'upcoming' },
    { source: 'live', phase: null, status: 'upcoming' },
    { source: 'historical', phase: 'running', status: 'upcoming' },
    { source: 'live', phase: 'running', status: 'completed' },
    { source: 'live', phase: 'completed', status: 'upcoming' },
  ]) {
    serverState = { ...serverState, ...state };
    await act(async () => {
      renderer = mount('judge');
      await flush();
    });
    await act(async () => {
      navigate(`/manage/tournaments/${id}`);
      await flush();
    });
    assert.ok(text(renderer.toJSON()).includes(serverState.title));
    for (const action of [
      'שמור נוכחות',
      'הגרל סיבוב 1',
      'שמור תוצאה',
      'הגרל סיבוב נוסף',
      'סיים טורניר',
      'בטל סיבוב',
    ]) {
      assert.ok(
        !button(action),
        `Judge must not operate ${JSON.stringify(state)}: ${action}`,
      );
    }
    assert.equal(
      renderer.root
        .findAllByType('input')
        .filter((input) => input.props.type === 'checkbox').length,
      0,
    );
    act(() => renderer.unmount());
    renderer = null;
  }
  console.log(
    'Internal tournament UI checks passed: role-aware roster/start actions, single creation, direct match cards, operational order, retry protection and live reconciliation.',
  );
} finally {
  if (renderer) act(() => renderer.unmount());
  await vite.close();
}

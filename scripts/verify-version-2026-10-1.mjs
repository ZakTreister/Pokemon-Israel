import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { MemoryRouter, useNavigate, useLocation, Link } from 'react-router-dom';
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
const storage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.localStorage = storage;
const scrolls = [];
globalThis.window = {
  localStorage: storage,
  location: { origin: 'http://localhost:5173' },
  history: { scrollRestoration: 'auto' },
  scrollTo: (value) => scrolls.push(value),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};
let anchorScrolls = 0,
  anchorReady = true,
  observerCallback,
  observerDisconnected = false;
globalThis.document = {
  body: {},
  getElementById: (id) =>
    id === 'details' && anchorReady
      ? { scrollIntoView: () => anchorScrolls++ }
      : null,
};
globalThis.MutationObserver = class {
  constructor(callback) {
    observerCallback = callback;
  }
  observe() {
    observerDisconnected = false;
  }
  disconnect() {
    observerDisconnected = true;
  }
};
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
});
const el = React.createElement;
const text = (node) =>
  !node
    ? ''
    : typeof node === 'string'
      ? node
      : Array.isArray(node)
        ? node.map(text).join('')
        : (node.children || []).map(text).join('');
const flush = () => new Promise((resolve) => setImmediate(resolve));
let renderer;
try {
  const load = (file) => vite.ssrLoadModule(`/src/${file}`);
  const mount = async (element) => {
    await act(async () => {
      renderer = TestRenderer.create(element);
      await flush();
    });
  };
  const unmount = () => {
    act(() => renderer.unmount());
    renderer = null;
  };
  const button = (label) =>
    renderer.root.findAllByType('button').find((node) => text(node) === label);
  const router = (child) =>
    el(
      MemoryRouter,
      { future: { v7_startTransition: true, v7_relativeSplatPath: true } },
      child,
    );
  const { default: RouteScroll } = await load(
    'components/layout/RouteScroll.tsx',
  );
  let navigate;
  function RouteContent() {
    navigate = useNavigate();
    const [local, setLocal] = React.useState(0);
    return el(
      React.Fragment,
      {},
      el(RouteScroll),
      el('output', {}, useLocation().pathname),
      el('button', { onClick: () => setLocal(local + 1) }, `local ${local}`),
      el(Link, { to: '/players/one' }, 'player'),
    );
  }
  await mount(router(el(RouteContent)));
  assert.equal(window.history.scrollRestoration, 'manual');
  assert.equal(scrolls.length, 1);
  act(() => button('local 0').props.onClick());
  assert.equal(scrolls.length, 1, 'same-page state must not reset scroll');
  act(() =>
    renderer.root.findByType('a').props.onClick({
      button: 0,
      defaultPrevented: false,
      preventDefault() {},
    }),
  );
  assert.equal(
    scrolls.length,
    2,
    'Link navigation uses the same central boundary',
  );
  act(() => navigate('/teams/one'));
  assert.equal(scrolls.length, 3);
  act(() => navigate('/players/one'));
  act(() => navigate(-1));
  act(() => navigate(1));
  assert.equal(
    scrolls.length,
    6,
    'programmatic navigation and back/forward reset centrally',
  );
  act(() => navigate('/players/one#details'));
  assert.equal(anchorScrolls, 1);
  assert.equal(scrolls.length, 6, 'explicit anchor does not go to top');
  anchorReady = false;
  act(() => navigate('/teams/one#details'));
  anchorReady = true;
  observerCallback();
  assert.equal(anchorScrolls, 2, 'async route content honors explicit anchors');
  assert.ok(observerDisconnected);
  unmount();
  assert.equal(window.history.scrollRestoration, 'auto');

  const { default: Hero } = await load(
    'features/home/components/HeroArtwork.tsx',
  );
  const { settleCardOffset } = await load('features/home/utils/cardDrag.ts');
  assert.deepEqual(
    [-500, -50, -15, 20, 55, 900].map(settleCardOffset),
    [-80, -80, 0, 0, 80, 80],
  );
  await mount(el(Hero));
  const drag = () =>
    renderer.root.find(
      (node) => typeof node.type === 'string' && !!node.props.onPointerDown,
    );
  let captured = false;
  const target = {
    setPointerCapture: () => (captured = true),
    hasPointerCapture: () => captured,
    releasePointerCapture: () => (captured = false),
  };
  const event = (x, y, type = 'pointermove') => ({
    isPrimary: true,
    button: 0,
    pointerId: 1,
    clientX: x,
    clientY: y,
    type,
    currentTarget: target,
  });
  act(() => drag().props.onPointerDown(event(100, 100, 'pointerdown')));
  act(() => drag().props.onPointerMove(event(151, 103)));
  assert.equal(drag().props.style.transform, 'translateX(51px)');
  assert.ok(captured);
  act(() => drag().props.onPointerUp(event(151, 103, 'pointerup')));
  assert.equal(drag().props.style.transform, 'translateX(80px)');
  assert.ok(!captured);
  act(() => drag().props.onPointerDown(event(100, 100, 'pointerdown')));
  act(() => drag().props.onPointerMove(event(105, 140)));
  assert.equal(
    drag().props.style.transform,
    'translateX(80px)',
    'vertical scrolling is not hijacked',
  );
  act(() => drag().props.onPointerDown(event(100, 100, 'pointerdown')));
  act(() => drag().props.onPointerMove(event(0, 101)));
  act(() => drag().props.onPointerCancel(event(0, 101, 'pointercancel')));
  assert.equal(drag().props.style.transform, 'translateX(80px)');
  assert.equal(drag().props.style.touchAction, 'pan-y');
  assert.ok(
    drag().props.className.includes('motion-safe:transition-transform'),
  );
  const main = renderer.root.findByProps({
    className: 'cs-trading-card cs-trading-card-main',
  });
  assert.equal(main.findByType('img').props.src, '/pokemon_kids_logo.png');
  assert.equal(main.findByType('img').props.draggable, false);
  assert.equal(
    renderer.root.findAll((node) => node.props.className === 'cs-pokeball')
      .length,
    1,
  );
  const css = await readFile(
    new URL('../src/index.css', import.meta.url),
    'utf8',
  );
  assert.ok(
    css.includes('width: 190px;') &&
      css.includes('height: 284px;') &&
      css.includes('width: 142px;') &&
      css.includes('height: 220px;'),
  );
  assert.ok(
    !css.includes('cs-float'),
    'hero has no automatic floating animation',
  );
  unmount();

  const { default: api } = await load('services/api.ts');
  const { store } = await load('store/index.ts');
  const { ToastProvider } = await load('components/ui/ToastProvider.tsx');
  const { ConfirmProvider } = await load('components/ui/ConfirmProvider.tsx');
  const state = {
    ...store.getState(),
    auth: { ...store.getState().auth, user: { id: 'admin', role: 'admin' } },
    players: { players: [], isLoading: false, error: null },
  };
  const fixtureStore = {
    getState: () => state,
    subscribe: store.subscribe,
    dispatch: store.dispatch,
  };
  const provided = (child) =>
    el(
      Provider,
      { store: fixtureStore },
      el(ToastProvider, {}, el(ConfirmProvider, {}, router(child))),
    );
  const { default: teams } = await load('features/teams/teamsService.ts');
  const { default: playersService } = await load(
    'features/players/playersService.ts',
  );
  const { teamPlayerCreateSchema, teamPlayerEditSchema } = await load(
    'features/players/utils/teamPlayerForm.ts',
  );
  const values = {
    firstName: 'לביא',
    lastName: 'כהן',
    city: 'חיפה',
    playerNumber: '',
  };
  assert.ok(!teamPlayerCreateSchema.safeParse(values).success);
  assert.ok(
    teamPlayerEditSchema.safeParse(values).success,
    'legacy backfill is optional on editing',
  );
  assert.equal(
    teamPlayerCreateSchema.parse({ ...values, playerNumber: ' 0007 ' })
      .playerNumber,
    '0007',
  );
  teams.getTeams = async () => [
    { id: 'active', name: 'פעילה', isActive: true },
    { id: 'inactive', name: 'לא פעילה', isActive: false },
  ];
  playersService.getPlayers = async () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  });
  playersService.duplicates = async () => [];
  let created;
  playersService.createTeamPlayer = async (input) => {
    created = input;
    return { id: 'created', ...input };
  };
  const { default: AdminPlayers } = await load('pages/admin/AdminPlayers.tsx');
  await mount(provided(el(AdminPlayers)));
  await act(async () => {
    button('הוסף שחקן נבחרת').props.onClick();
    await flush();
  });
  const dialog = () => renderer.root.findByProps({ role: 'dialog' });
  const nameInputs = dialog().findAllByType('input');
  assert.equal(
    nameInputs.find((input) => input.props['aria-label'] === 'מספר שחקן').props
      .required,
    true,
  );
  assert.ok(
    !dialog()
      .findAllByType('option')
      .some((option) => option.props.value === 'inactive'),
  );
  for (const [index, value] of [
    [0, 'לביא'],
    [1, 'כהן'],
  ])
    act(() => nameInputs[index].props.onChange({ target: { value } }));
  act(() =>
    dialog()
      .findByProps({ 'aria-label': 'מספר שחקן' })
      .props.onChange({ target: { value: '0007' } }),
  );
  await act(async () => {
    dialog()
      .findByType('form')
      .props.onSubmit({ preventDefault() {} });
    await flush();
  });
  assert.equal(created, undefined);
  assert.ok(text(dialog()).includes('יש לבחור נבחרת'));
  act(() =>
    dialog()
      .findByType('select')
      .props.onChange({ target: { value: 'active' } }),
  );
  await act(async () => {
    dialog()
      .findByType('form')
      .props.onSubmit({ preventDefault() {} });
    await flush();
  });
  assert.equal(created.teamId, 'active');
  assert.equal(created.playerNumber, '0007');
  unmount();

  const { default: Members } = await load(
    'features/teams/components/TeamMembersTable.tsx',
  );
  const team = {
    id: 'team',
    players: [
      {
        id: 'one',
        firstName: 'לביא',
        lastName: 'כהן',
        city: 'חיפה',
        playerNumber: '0007',
      },
    ],
  };
  let changed = 0,
    edited,
    removed;
  playersService.updatePlayer = async (id, input) => {
    edited = { id, input };
    return { ...team.players[0], ...input };
  };
  teams.removePlayer = async (teamId, playerId) => {
    removed = { teamId, playerId };
    return team.players[0];
  };
  await mount(
    provided(
      el(Members, { team, editable: true, onChanged: async () => changed++ }),
    ),
  );
  assert.deepEqual(renderer.root.findAllByType('th').map(text), [
    'מיקום ↑',
    'שם מלא',
    'עיר',
    'מספר שחקן',
    'נקודות',
    'טורנירים',
    'פעולות',
  ]);
  assert.ok(text(renderer.toJSON()).includes('0007'));
  act(() => button('עריכת שחקן').props.onClick());
  act(() =>
    dialog()
      .findByProps({ 'aria-label': 'מספר שחקן' })
      .props.onChange({ target: { value: 'AB-17' } }),
  );
  await act(async () => {
    dialog()
      .findByType('form')
      .props.onSubmit({ preventDefault() {} });
    await flush();
  });
  assert.deepEqual(edited, {
    id: 'one',
    input: {
      firstName: 'לביא',
      lastName: 'כהן',
      city: 'חיפה',
      playerNumber: 'AB-17',
      description: '',
      dateOfBirth: '',
      photoUploadId: undefined,
      deckUploadId: undefined,
      joinedAt: '',
      pokemon: [],
      isActive: true,
    },
  });
  assert.equal(changed, 1);
  await act(async () => {
    button('הסרה מהנבחרת').props.onClick();
    await flush();
  });
  assert.equal(removed, undefined, 'unassignment requires confirmation');
  await act(async () => {
    button('הסר').props.onClick();
    await flush();
  });
  assert.deepEqual(removed, { teamId: 'team', playerId: 'one' });
  assert.equal(changed, 2);
  unmount();
  await mount(
    provided(el(Members, { team, editable: false, onChanged: async () => {} })),
  );
  assert.ok(!button('עריכת שחקן') && !button('הסרה מהנבחרת'));
  assert.equal(renderer.root.findAllByType('th').length, 6);
  unmount();
  const ranks = [
    {
      playerId: 'two',
      playerName: 'שני',
      position: 2,
      points: 3,
      tournaments: 1,
    },
    {
      playerId: 'one',
      playerName: 'ראשון',
      position: 1,
      points: 6,
      tournaments: 2,
    },
  ];
  await mount(
    provided(
      el(Members, {
        team: {
          id: 'team',
          players: ranks.map((rank) => ({
            id: rank.playerId,
            firstName: rank.playerName,
            lastName: '',
          })),
        },
        rankings: ranks,
        editable: false,
        onChanged: async () => {},
      }),
    ),
  );
  assert.deepEqual(renderer.root.findAllByType('th').map(text), [
    'מיקום ↑',
    'שם מלא',
    'עיר',
    'מספר שחקן',
    'נקודות',
    'טורנירים',
  ]);
  assert.ok(
    text(renderer.root.findByType('tbody').findAllByType('tr')[0]).startsWith(
      '1ראשון',
    ),
  );
  assert.equal(ranks[0].position, 2, 'sorting is view-only');
  unmount();

  const { publicTournaments } = await load('services/publicTournaments.ts');
  const { default: Events } = await load('pages/TournamentsPage.tsx');
  api.get = async () => ({
    data: {
      items: [
        {
          id: 'event',
          title: 'אירוע פנימי',
          date: '2026-10-01',
          type: 'team_internal',
          lifecycle: 'active',
          image: '/huge-event.png',
          currentParticipants: 4,
          canRegister: false,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    },
  });
  await mount(router(el(Events)));
  assert.equal(renderer.root.findAllByType('article').length, 1);
  assert.equal(renderer.root.findAllByType('img').length, 0);
  assert.ok(text(renderer.toJSON()).includes('תוצאות הטורניר'));
  assert.ok(!button('מחק'));
  unmount();
  const { publicTeams } = await load('services/publicTeams.ts');
  const { internalTournaments } = await load('services/internalTournaments.ts');
  let rankingCalls = 0;
  internalTournaments.rankings = async () => {
    rankingCalls++;
    throw new Error('global ranking removed');
  };
  publicTeams.list = async () => [
    { id: 'team', name: 'נבחרת', playerCount: 1 },
  ];
  const { default: AllStars } = await load('pages/AllStarsPage.tsx');
  await mount(router(el(AllStars)));
  assert.equal(rankingCalls, 0);
  assert.ok(
    renderer.root
      .findAllByType('a')
      .some((a) => a.props.href === '/teams/team'),
  );
  unmount();
  // API responses are mocked above; this suite makes no server/socket requests.
  assert.ok(api);
  console.log(
    '2026.10.1 UI checks passed: central SPA/anchor/POP scrolling, drag/snap/artwork, required player number/team creation, contextual edit/unassign, canonical team ranking and compact public Events without a global ranking.',
  );
} finally {
  if (renderer) act(() => renderer.unmount());
  await vite.close();
}

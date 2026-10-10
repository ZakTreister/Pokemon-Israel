import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createServer } from 'vite';
const storage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.localStorage = storage;
globalThis.window = {
  localStorage: storage,
  location: { origin: 'http://localhost:5173' },
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
      : (node.children || []).map(text).join('');
const flush = () => new Promise((resolve) => setImmediate(resolve));
const router = (element, path = '/') =>
  el(
    MemoryRouter,
    {
      initialEntries: [path],
      future: { v7_startTransition: true, v7_relativeSplatPath: true },
    },
    element,
  );
let renderer;
try {
  const load = (file) => vite.ssrLoadModule(`/src/${file}`);
  const { default: Table } = await load('components/ui/DataTable.tsx');
  const { sortTableRows } = await load('components/ui/tableSorting.ts');
  const rows = [
    { id: 'b', position: 2, points: 10, name: 'ב' },
    { id: 'a', position: 1, points: 2, name: 'א' },
  ];
  const snapshot = structuredClone(rows);
  const columns = [
    { key: 'position', label: 'מקום', value: (row) => row.position },
    { key: 'points', label: 'נקודות', value: (row) => row.points },
    { key: 'name', label: 'שחקן', value: (row) => row.name },
  ];
  act(() => {
    renderer = TestRenderer.create(
      el(Table, { rows, columns, rowKey: (row) => row.id }),
    );
  });
  const firstRow = () =>
    renderer.root
      .findByType('tbody')
      .findAllByType('tr')[0]
      .findAllByType('td')
      .map((cell) => text(cell));
  assert.deepEqual(firstRow(), ['1', '2', 'א']);
  const buttons = () => renderer.root.findAllByType('button');
  act(() => buttons()[1].props.onClick());
  assert.deepEqual(
    firstRow(),
    ['1', '2', 'א'],
    'Numeric sort, not lexicographic',
  );
  act(() => buttons()[1].props.onClick());
  assert.deepEqual(firstRow(), ['2', '10', 'ב']);
  assert.equal(
    renderer.root.findAllByType('th')[1].props['aria-sort'],
    'descending',
  );
  assert.deepEqual(rows, snapshot);
  assert.deepEqual(
    sortTableRows(rows, columns[2], false).map((row) => row.id),
    ['a', 'b'],
  );
  act(() => renderer.unmount());
  renderer = null;

  const { default: CTA } = await load('components/layout/FloatingTrialCTA.tsx');
  const { TRIAL_REGISTRATION_URL } = await load('config/publicSite.ts');
  for (const path of [
    '/',
    '/rankings',
    '/all-stars',
    '/teams/team',
    '/all-stars/players/player',
    '/tournaments/event',
    '/news',
    '/about',
    '/store',
    '/birthday',
  ]) {
    act(() => {
      renderer = TestRenderer.create(router(el(CTA), path));
    });
    const link = renderer.root.findByType('a');
    assert.equal(link.props.href, TRIAL_REGISTRATION_URL);
    assert.ok(text(link).includes('הירשמו לשיעור ניסיון'));
    act(() => renderer.unmount());
    renderer = null;
  }
  for (const path of [
    '/manage',
    '/manage/teams',
    '/manage/tournaments/live',
    '/manage/teams/team/historical',
    '/admin/players',
    '/login',
    '/dashboard',
  ]) {
    act(() => {
      renderer = TestRenderer.create(router(el(CTA), path));
    });
    assert.equal(renderer.toJSON(), null);
    act(() => renderer.unmount());
    renderer = null;
  }

  const { default: api } = await load('services/api.ts');
  const { default: PublicPlayer } = await load('pages/AllStarsPlayerPage.tsx');
  const { default: AllStars } = await load('pages/AllStarsPage.tsx');
  const { publicTournaments } = await load('services/publicTournaments.ts');
  publicTournaments.list = async () => [];
  const { default: Teams } = await load('pages/TeamPage.tsx');
  const { publicTeams } = await load('services/publicTeams.ts');
  const { internalTournaments } = await load('services/internalTournaments.ts');
  const { store } = await load('store/index.ts');
  const fixture = {
    ...store.getState(),
    auth: { ...store.getState().auth, user: null },
  };
  const fixtureStore = {
    getState: () => fixture,
    subscribe: () => () => {},
    dispatch: (action) => action,
  };
  const provider = (element) => el(Provider, { store: fixtureStore }, element);
  const profile = {
    id: 'player',
    firstName: 'לביא',
    lastName: 'כהן',
    city: 'חיפה',
    team: { id: 'team', name: 'נבחרת' },
    teamRanking: { position: 1, points: 10, tournaments: 2 },
    overallRanking: { position: 3, points: 10, tournaments: 2 },
    badges: [
      { name: 'תג', description: 'הצלחה', icon: '★', awardedAt: '2026-10-01' },
    ],
  };
  let loaded;
  api.get = async (path) => {
    loaded = path;
    return { data: profile };
  };
  await act(async () => {
    renderer = TestRenderer.create(
      router(
        el(
          Routes,
          {},
          el(Route, {
            path: '/all-stars/players/:playerId',
            element: el(PublicPlayer),
          }),
        ),
        '/all-stars/players/player',
      ),
    );
    await flush();
  });
  assert.equal(loaded, '/api/players/public/player');
  assert.ok(text(renderer.toJSON()).includes('לביא כהן'));
  assert.ok(text(renderer.toJSON()).includes('מקום 3'));
  assert.ok(text(renderer.toJSON()).includes('הצלחה'));
  assert.ok(
    renderer.root
      .findAllByType('a')
      .some((a) => a.props.href === '/teams/team'),
  );
  act(() => renderer.unmount());
  renderer = null;
  internalTournaments.rankings = async () => ({
    rankings: [
      {
        playerId: 'player',
        playerName: 'לביא כהן',
        position: 1,
        points: 10,
        tournaments: 2,
        team: profile.team,
      },
    ],
  });
  publicTeams.list = async () => [];
  publicTeams.get = async () => ({
    id: 'team',
    name: 'נבחרת',
    isActive: true,
    playerCount: 1,
    players: [{ id: 'player', firstName: 'לביא', lastName: 'כהן' }],
  });
  for (const [Component, path, route] of [
    [AllStars, '/all-stars', '/all-stars'],
    [Teams, '/teams/team', '/teams/:id'],
  ]) {
    await act(async () => {
      renderer = TestRenderer.create(
        provider(
          router(
            el(Routes, {}, el(Route, { path: route, element: el(Component) })),
            path,
          ),
        ),
      );
      await flush();
    });
    assert.ok(
      renderer.root
        .findAllByType('a')
        .some((a) => a.props.href === '/all-stars/players/player'),
    );
    act(() => renderer.unmount());
    renderer = null;
  }

  // Real management delete handler passes default false, and explicit true only.
  const { default: ManageTournaments } = await load(
    'pages/manage/ManageTournaments.tsx',
  );
  const { ConfirmProvider } = await load('components/ui/ConfirmProvider.tsx');
  fixture.auth.user = { role: 'admin' };
  api.get = async () => ({
    data: [
      {
        id: 'event',
        title: 'טורניר',
        date: '2026-10-01',
        type: 'team_internal',
        lifecycle: 'completed',
        canManage: true,
      },
    ],
  });
  const deletions = [];
  api.delete = async (path, options) => {
    deletions.push({ path, permanent: options.params.permanent });
  };
  await act(async () => {
    renderer = TestRenderer.create(
      provider(
        router(
          el(ConfirmProvider, {}, el(ManageTournaments)),
          '/manage/tournaments',
        ),
      ),
    );
    await flush();
  });
  const button = (label) =>
    renderer.root
      .findAllByType('button')
      .filter((node) => text(node) === label);
  act(() => button('מחק')[0].props.onClick());
  assert.equal(renderer.root.findByProps({ type: 'checkbox' }).props.checked, false);
  await act(async () => {
    button('מחק').at(-1).props.onClick();
    await flush();
  });
  assert.equal(deletions[0].permanent, false);
  act(() => button('מחק')[0].props.onClick());
  assert.equal(renderer.root.findByProps({ type: 'checkbox' }).props.checked, false);
  act(() =>
    renderer.root
      .findByProps({ type: 'checkbox' })
      .props.onChange({ target: { checked: true } }),
  );
  await act(async () => {
    button('מחק').at(-1).props.onClick();
    await flush();
  });
  assert.equal(deletions[1].permanent, true);
  act(() => renderer.unmount());
  renderer = null;
  console.log(
    'Public Stage A checks passed: immutable numeric/locale sorting, canonical place order, public profile links/data, CTA scope, default soft and opt-in permanent deletion.',
  );
} finally {
  if (renderer) act(() => renderer.unmount());
  await vite.close();
}

import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
      : Array.isArray(node)
        ? node.map(text).join('')
        : (node.children || []).map(text).join('');
const flush = () => new Promise((resolve) => setImmediate(resolve));
let renderer;
try {
  const load = (file) => vite.ssrLoadModule(`/src/${file}`);
  const { default: Table } = await load('components/ui/DataTable.tsx');
  function Location() {
    return el('output', { id: 'location' }, useLocation().pathname);
  }
  const router = (element, path = '/') =>
    el(
      MemoryRouter,
      {
        initialEntries: [path],
        future: { v7_startTransition: true, v7_relativeSplatPath: true },
      },
      el(Location),
      element,
    );
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
  const location = () => text(renderer.root.findByProps({ id: 'location' }));
  let edits = 0;
  const table = () =>
    el(Table, {
      rows: [{ id: 'team-player', name: 'ילד נבחרת' }],
      rowKey: (row) => row.id,
      rowLink: (row) => `/all-stars/players/${row.id}`,
      columns: [
        { key: 'name', label: 'שחקן', value: (row) => row.name },
        {
          key: 'action',
          label: 'פעולה',
          value: () => '',
          render: () => el('button', { onClick: () => edits++ }, 'ערוך'),
        },
      ],
    });
  const row = () => renderer.root.findByType('tbody').findByType('tr');
  await mount(router(table()));
  assert.equal(row().props.tabIndex, 0);
  act(() => {
    renderer.root
      .findAllByType('button')
      .find((button) => text(button) === 'ערוך')
      .props.onClick();
    row().props.onClick({
      defaultPrevented: false,
      target: { closest: () => ({ tagName: 'BUTTON' }) },
    });
  });
  assert.equal(edits, 1);
  assert.equal(location(), '/');
  act(() =>
    row().props.onClick({
      defaultPrevented: true,
      target: { closest: () => null },
    }),
  );
  assert.equal(location(), '/');
  act(() =>
    row().props.onClick({
      defaultPrevented: false,
      target: { closest: () => null },
    }),
  );
  assert.equal(location(), '/all-stars/players/team-player');
  unmount();
  for (const key of ['Enter', ' ']) {
    await mount(router(table()));
    let prevented = false;
    const target = {};
    act(() =>
      row().props.onKeyDown({
        key,
        target,
        currentTarget: target,
        preventDefault: () => {
          prevented = true;
        },
      }),
    );
    assert.ok(prevented);
    assert.equal(location(), '/all-stars/players/team-player');
    unmount();
  }
  await mount(
    router(
      el(Table, {
        rows: [{ id: 'club', name: 'חוג' }],
        columns: [{ key: 'name', label: 'שחקן', value: (row) => row.name }],
        rowKey: (row) => row.id,
      }),
    ),
  );
  assert.equal(row().props.tabIndex, undefined);
  assert.equal(row().props.onClick, undefined);
  unmount();

  const { publicTournaments } = await load('services/publicTournaments.ts');
  const { filterTournaments } = await vite.ssrLoadModule(
    '/shared/tournamentDomain.js',
  );
  const events = ['quarterly', 'team_internal', 'inter_team'].map(
    (type, i) => ({
      id: `event-${i}`,
      title: `אירוע ${i}`,
      description: '',
      date: '2026-10-01',
      location: i === 1 ? 'חיפה' : 'תל אביב',
      image: '/event.png',
      type,
      lifecycle: ['upcoming', 'active', 'completed'][i],
      team: 'team',
      teamNameSnapshot: i === 1 ? 'כחולים' : '',
      currentParticipants: 2,
      registrationDeadline: '2026-11-01',
      canRegister: i === 0,
      standings: [],
      teamPlayers: i === 1,
    }),
  );
  assert.deepEqual(
    filterTournaments(events, {
      type: 'team_internal',
      status: 'active',
      search: 'חיפה',
    }).map((e) => e.id),
    ['event-1'],
  );
  assert.deepEqual(
    filterTournaments(events, {
      type: 'team_internal',
      status: 'completed',
      search: '',
    }),
    [],
  );
  publicTournaments.list = async () => structuredClone(events);
  const { default: Events } = await load('pages/TournamentsPage.tsx');
  await mount(router(el(Events), '/tournaments'));
  assert.equal(renderer.root.findAllByType('article').length, 3);
  const selects = renderer.root.findAllByType('select');
  await act(async () => {
    selects[0].props.onChange({ target: { value: 'active' } });
    await flush();
  });
  await act(async () => {
    renderer.root
      .findAllByType('select')[1]
      .props.onChange({ target: { value: 'team_internal' } });
    await flush();
  });
  await act(async () => {
    renderer.root
      .findByType('input')
      .props.onChange({ target: { value: 'כחולים' } });
    await flush();
  });
  assert.equal(renderer.root.findAllByType('article').length, 1);
  assert.ok(text(renderer.toJSON()).includes('אירוע 1'));
  unmount();

  const { store } = await load('store/index.ts');
  const initial = store.getState();
  const fixture = {
    ...initial,
    auth: { ...initial.auth, user: null },
    teams: { ...initial.teams, isLoading: false, teams: [] },
  };
  const fixtureStore = {
    getState: () => fixture,
    subscribe: () => () => {},
    dispatch: (action) => action,
  };
  const provider = (element) => el(Provider, { store: fixtureStore }, element);
  const { Routes, Route } = await import('react-router-dom');
  const { ConfirmProvider } = await load('components/ui/ConfirmProvider.tsx');
  const { default: Detail } = await load('pages/TournamentDetailsPage.tsx');
  for (const lifecycle of ['upcoming', 'active', 'completed']) {
    publicTournaments.get = async () => ({
      ...events[1],
      lifecycle,
      standings:
        lifecycle === 'upcoming'
          ? []
          : [
              {
                player: 'player',
                playerName: 'תוצאת האירוע',
                position: 1,
                points: 3,
                omp: 0.5556,
                gwp: 0.75,
                ogp: 0.5111,
              },
            ],
    });
    await mount(
      provider(
        router(
          el(
            Routes,
            {},
            el(Route, {
              path: '/tournaments/:id',
              element: el(ConfirmProvider, {}, el(Detail)),
            }),
          ),
          '/tournaments/event-1',
        ),
      ),
    );
    const rendered = text(renderer.toJSON());
    if (lifecycle === 'upcoming') {
      assert.ok(!rendered.includes('תוצאת האירוע'));
      assert.equal(renderer.root.findAllByType('table').length, 0);
    } else {
      assert.ok(rendered.includes('תוצאת האירוע'));
      assert.ok(
        rendered.includes(lifecycle === 'active' ? 'בתהליך' : 'תוצאות סופיות'),
      );
      assert.ok(rendered.includes('55.56%'));
    }
    assert.ok(!rendered.includes('דירוג All Stars'));
    unmount();
  }

  publicTournaments.get = async () => ({
    ...events[0],
    lifecycle: 'completed',
    standings: [
      {
        player: 'legacy-0',
        playerName: 'שחקן חוג',
        position: 1,
        points: 4,
        omp: null,
        gwp: null,
        ogp: null,
        deck: {
          id: 'deck',
          archetype: 'דק קיים',
          iconImage1: '/deck-icon.png',
        },
      },
    ],
  });
  await mount(
    provider(
      router(
        el(
          Routes,
          {},
          el(Route, {
            path: '/tournaments/:id',
            element: el(ConfirmProvider, {}, el(Detail)),
          }),
        ),
        '/tournaments/event-0',
      ),
    ),
  );
  assert.ok(text(renderer.toJSON()).includes('דק קיים'));
  assert.ok(
    renderer.root
      .findAllByType('img')
      .some((image) => image.props.src === '/deck-icon.png'),
  );
  unmount();

  const { default: teamsService } = await load(
    'features/teams/teamsService.ts',
  );
  const { ToastProvider } = await load('components/ui/ToastProvider.tsx');
  const { default: TeacherTeams } = await load('pages/manage/TeacherTeams.tsx');
  const teams = [
    {
      id: 'first',
      name: 'נבחרת ראשונה',
      isActive: true,
      playerCount: 2,
      teacher: { id: 'staff', name: 'מורה', role: 'judge' },
    },
    {
      id: 'second',
      name: 'נבחרת שנייה',
      isActive: true,
      playerCount: 2,
      teacher: { id: 'staff', name: 'מורה', role: 'judge' },
      openInternalTournament: { id: 'open', phase: 'running' },
    },
  ];
  teamsService.getMyTeams = async () => structuredClone(teams);
  const { internalTournaments } = await load('services/internalTournaments.ts');
  internalTournaments.create = async () => {
    throw new Error('Continue must not create');
  };
  await mount(router(el(ToastProvider, {}, el(TeacherTeams)), '/manage'));
  assert.equal(renderer.root.findAllByType('article').length, 2);
  assert.ok(!text(renderer.toJSON()).includes('הגדרות'));
  assert.ok(!text(renderer.toJSON()).includes('חברי נבחרת חדשים'));
  const button = (label) =>
    renderer.root.findAllByType('button').find((node) => text(node) === label);
  await act(async () => button('המשך טורניר').props.onClick());
  assert.equal(location(), '/manage/tournaments/open');
  unmount();

  fixture.auth.user = { id: 'staff', name: 'מנהל', role: 'admin' };
  fixture.teams.teams = teams;
  fixture.teams.manageablePlayers = [
    {
      id: 'child',
      firstName: 'ילד לא מוצג',
      lastName: 'אוטומטית',
      team: { id: 'first' },
      isActive: true,
    },
  ];
  teamsService.getTeachers = async () => [
    { id: 'staff', name: 'מנהל', role: 'admin' },
    { id: 'judge', name: 'שופט', role: 'judge' },
  ];
  const { default: ManageTeams } = await load('pages/manage/ManageTeams.tsx');
  await mount(
    provider(router(el(ToastProvider, {}, el(ManageTeams)), '/manage/teams')),
  );
  assert.ok(!text(renderer.toJSON()).includes('ילד לא מוצג'));
  for (const label of [
    'שם וסמל',
    'שייך שחקן',
    'הסר מהנבחרת',
    'הזנת טורניר היסטורי',
  ])
    assert.ok(!text(renderer.toJSON()).includes(label));
  act(() => button('נבחרת חדשה').props.onClick());
  assert.equal(button('צור').props.disabled, true);
  assert.equal(renderer.root.findByType('select').props.required, true);
  assert.equal(renderer.root.findAllByType('option').length, 3);
  unmount();

  const { default: TeamPage } = await load('pages/TeamPage.tsx');
  teamsService.getTeam = async () => ({
    ...teams[0],
    players: [{ id: 'child', firstName: 'ילד', lastName: 'נבחרת' }],
  });
  internalTournaments.rankings = async () => ({ rankings: [] });
  await mount(
    provider(
      router(
        el(
          ToastProvider,
          {},
          el(
            ConfirmProvider,
            {},
            el(
              Routes,
              {},
              el(Route, { path: '/manage/teams/:id', element: el(TeamPage) }),
            ),
          ),
        ),
        '/manage/teams/first',
      ),
    ),
  );
  assert.ok(!text(renderer.toJSON()).includes('שם, סמל ומורה'));
  assert.ok(!text(renderer.toJSON()).includes('הזנת טורניר היסטורי'));
  await act(async () => {
    button('היסטוריית טורנירים').props.onClick();
    await flush();
  });
  assert.ok(text(renderer.toJSON()).includes('הזנת טורניר היסטורי'));
  await act(async () => {
    button('הגדרות נבחרת').props.onClick();
    await flush();
  });
  assert.ok(text(renderer.toJSON()).includes('שם, סמל ומורה'));
  console.log(
    'Recent Stage A UI checks passed: whole-row keyboard/navigation isolation, combined Event filters, event-specific lifecycle results, compact teacher/team cards, required teacher selection and settings/history disclosure.',
  );
} finally {
  if (renderer) act(() => renderer.unmount());
  await vite.close();
}

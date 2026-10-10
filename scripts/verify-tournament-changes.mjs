import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
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
});
const el = React.createElement;
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));
let renderer;
try {
  const load = (file) => vite.ssrLoadModule(`/src/${file}`);
  const {
    parseHistoricalStandings,
    matchHistoricalPlayers,
    historicalMappingsResolved,
  } = await load('features/tournaments/utils/historicalStandings.ts');
  const team = {
    id: 'team1',
    name: 'Team One',
    isActive: true,
    playerCount: 3,
  };
  const player = (id, firstName, lastName, teamId = 'team1') => ({
    id,
    firstName,
    lastName,
    team: { id: teamId, name: teamId },
    isActive: true,
  });
  const players = [
    player('a', 'Dan', 'Cohen'),
    player('b', 'Dan', 'Cohen'),
    player('c', 'Dana', 'Levy'),
    player('former', 'Maya', 'Else', 'team2'),
  ];
  for (const text of [
    '1: Dan Cohen 9\n2: Dana Levy 6',
    '1. Dan Cohen 9\r\n2) Dana Levy 6',
    'Dan Cohen\t9\nDana Levy\t6',
  ]) {
    const parsed = parseHistoricalStandings(text);
    assert.deepEqual(parsed.errors, []);
    assert.deepEqual(
      parsed.rows.map((row) => [row.position, row.pastedName, row.points]),
      [
        [1, 'Dan Cohen', 9],
        [2, 'Dana Levy', 6],
      ],
    );
  }
  const percentages = parseHistoricalStandings(
    'Rank Player Points OMP OGP GWP\n1 Dan Cohen 9 66.67% 50% 75%\n2 Dana Levy 6 33.33% 40% 50%',
  );
  assert.deepEqual(percentages.errors, []);
  assert.ok(Math.abs(percentages.rows[0].omp - 0.6667) < 1e-12);
  assert.equal(percentages.rows[0].ogp, 0.5);
  assert.equal(percentages.rows[0].gwp, 0.75);
  assert.equal(
    parseHistoricalStandings('Dan Cohen 9 66.67%\nDana Levy 6').rows[0].omp,
    undefined,
  );
  for (const text of [
    'Dan Cohen\nDana Levy 6',
    'Dan Cohen -1\nDana Levy 0',
    'Dan Cohen 1.5\nDana Levy 1',
    '1 Dan Cohen 6\n1 Dana Levy 3',
    '1 Dan Cohen 3\n2 Dana Levy 9',
  ])
    assert.ok(parseHistoricalStandings(text).errors.length);
  const hebrewPlayers = [
    player('l', 'לביא', 'כהן'),
    player('i', 'איתי', 'לוי'),
    player('other', 'לביא', 'אחר', 'team2'),
  ];
  for (const separator of ['\t', ' ', '  ']) {
    const sample = [
      'Player Points OMP GWP OGP',
      'לביא 10 55.56 75 51.11',
      'איתי 7 58.33 60 58.75',
    ]
      .map((line) => line.replaceAll(' ', separator))
      .join('\n');
    const result = parseHistoricalStandings(sample);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
    assert.ok(Math.abs(result.rows[0].omp - 0.5556) < 1e-12);
    assert.equal(result.rows[0].gwp, 0.75);
    assert.ok(Math.abs(result.rows[0].ogp - 0.5111) < 1e-12);
    assert.deepEqual(
      matchHistoricalPlayers(result.rows, hebrewPlayers, 'team1').map(
        (row) => row.player,
      ),
      ['l', 'i'],
    );
    const ambiguous = [...hebrewPlayers, player('duplicate', 'לביא', 'לוי')];
    assert.equal(
      matchHistoricalPlayers(result.rows, ambiguous, 'team1')[0].player,
      '',
    );
  }
  const reordered = parseHistoricalStandings(
    'GWP Points Player OGP OMP\n75 10 לביא כהן 51.11 55,56%\n100 7 איתי לוי 0 58.33',
  );
  assert.deepEqual(reordered.errors, []);
  assert.equal(reordered.rows[0].pastedName, 'לביא כהן');
  assert.equal(reordered.rows[1].gwp, 1);
  assert.equal(reordered.rows[1].ogp, 0);
  assert.ok(Math.abs(reordered.rows[0].omp - 0.5556) < 1e-12);
  const smallPercentage = parseHistoricalStandings(
    'Player Points OMP\nDana 9.0 0.5\nDan 6 100%',
  );
  assert.deepEqual(smallPercentage.errors, []);
  assert.equal(smallPercentage.rows[0].omp, 0.005);
  assert.equal(smallPercentage.rows[1].omp, 1);
  assert.equal(
    matchHistoricalPlayers(
      parseHistoricalStandings('DANA, 9\nDan 6').rows,
      players,
      'team1',
    )[0].player,
    'c',
  );
  const missing = parseHistoricalStandings(
    'Player\tPoints\tOMP\tGWP\tOGP\nלביא\t10\t\t75\t51.11\nאיתי\t7\tinvalid\t101\t58.75',
  );
  assert.deepEqual(missing.errors, []);
  assert.equal(missing.warnings.length, 3);
  assert.equal(missing.rows[0].omp, undefined);
  assert.equal(missing.rows[0].gwp, 0.75);
  assert.equal(missing.rows[1].ogp, 0.5875);
  const repeatedName = parseHistoricalStandings('לביא 10\nלביא 7');
  assert.ok(
    matchHistoricalPlayers(repeatedName.rows, hebrewPlayers, 'team1').every(
      (row) => !row.player,
    ),
  );
  const parsed = parseHistoricalStandings(
    'Player\tPoints\tOMP\tGWP\tOGP\nDan Cohen\t9\t55.56\t75\t51.11\nDana\t6\t58.33%\t60\t58.75\nMaya Else\t3\t0\t100\t50',
  );
  const matched = matchHistoricalPlayers(parsed.rows, players, 'team1');
  assert.deepEqual(
    matched.map((row) => row.player),
    ['', 'c', ''],
  );
  assert.equal(historicalMappingsResolved(matched), false);
  assert.equal(
    matchHistoricalPlayers(
      parseHistoricalStandings('Dana Levy 6\nDana Levy 3').rows,
      players,
      'team1',
    ).every((row) => !row.player),
    true,
  );
  assert.equal(
    matchHistoricalPlayers(
      parseHistoricalStandings('DANA, LEVY 6\nDan Cohen 3').rows,
      players,
      'team1',
    )[0].player,
    'c',
  );
  assert.equal(
    matchHistoricalPlayers(
      parseHistoricalStandings('Dana Lev 6\nDan Cohen 3').rows,
      players,
      'team1',
    )[0].player,
    '',
  );
  assert.equal(
    historicalMappingsResolved([{ player: 'a' }, { player: 'a' }]),
    false,
  );

  const { default: api } = await load('services/api.ts');
  const { internalTournaments: service } = await load(
    'services/internalTournaments.ts',
  );
  let recovered;
  api.post = async () => {
    throw {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          code: 'OPEN_INTERNAL_TOURNAMENT',
          existingTournamentId: 'existing',
        },
      },
    };
  };
  api.get = async (url) => {
    recovered = url;
    return { data: { id: 'existing' } };
  };
  assert.equal((await service.create(team.id)).id, 'existing');
  assert.equal(recovered, '/api/internal-tournaments/existing');

  const { default: teamsService } = await load(
    'features/teams/teamsService.ts',
  );
  const { default: Historical } = await load(
    'pages/manage/HistoricalTournamentPage.tsx',
  );
  const { store } = await load('store/index.ts');
  const { default: ManageTeams } = await load('pages/manage/ManageTeams.tsx');
  teamsService.getTeams = async () => [team];
  teamsService.getManageablePlayers = async () => players;
  let payload;
  let finishSave;
  let saves = 0;
  service.historical = async (...args) => {
    saves++;
    payload = args;
    return new Promise((resolve) => {
      finishSave = resolve;
    });
  };
  const text = (node) =>
    !node
      ? ''
      : typeof node === 'string'
        ? node
        : (node.children || []).map(text).join('');
  const button = (label) =>
    renderer.root.findAllByType('button').find((node) => text(node) === label);
  const selector = (index) =>
    renderer.root.findByProps({ 'aria-label': `התאמת שחקן שורה ${index}` });
  function Location() {
    return el('output', { id: 'location' }, useLocation().pathname);
  }
  const fixture = {
    ...store.getState(),
    auth: {
      ...store.getState().auth,
      user: { role: 'admin' },
      isLoading: false,
      isAuthenticated: true,
    },
  };
  const fixtureStore = {
    getState: () => fixture,
    subscribe: () => () => {},
    dispatch: (action) => action,
  };
  await act(async () => {
    renderer = TestRenderer.create(
      el(
        Provider,
        { store: fixtureStore },
        el(
          MemoryRouter,
          {
            initialEntries: ['/manage/teams/team1/historical'],
            future: { v7_startTransition: true, v7_relativeSplatPath: true },
          },
          el(Location),
          el(
            Routes,
            {},
            el(Route, {
              path: '/manage/teams/:teamId/historical',
              element: el(Historical),
            }),
            el(Route, {
              path: '/manage/tournaments/:id',
              element: el('p', {}, 'Saved tournament'),
            }),
          ),
        ),
      ),
    );
    await flush();
  });
  await act(async () =>
    renderer.root.findByType('textarea').props.onChange({
      target: {
        value:
          'Player\tPoints\tOMP\tGWP\tOGP\nDan Cohen\t9\t55.56\t75\t51.11\nDana\t6\t58.33%\t60\t58.75\nMaya Else\t3\t0\t100\t50',
      },
    }),
  );
  await act(async () => button('עבד והתאם שחקנים').props.onClick());
  assert.ok(text(renderer.root.findByType('table')).includes('55.56%'));
  assert.ok(text(renderer.root.findByType('table')).includes('75.00%'));
  assert.equal(selector(1).props.value, '');
  assert.equal(selector(2).props.value, 'c');
  assert.equal(selector(3).props.value, '');
  assert.equal(button('שמור טורניר היסטורי שהסתיים').props.disabled, true);
  await act(async () => selector(1).props.onChange({ target: { value: 'a' } }));
  assert.equal(
    selector(3)
      .findAllByType('option')
      .find((option) => option.props.value === 'a').props.disabled,
    true,
  );
  await act(async () =>
    renderer.root
      .findAllByType('input')
      .find((node) => node.props.type === 'date')
      .props.onChange({ target: { value: '2026-10-04' } }),
  );
  const checkbox = renderer.root
    .findAllByType('input')
    .find((node) => node.props.type === 'checkbox');
  await act(async () => checkbox.props.onChange({ target: { checked: true } }));
  await act(async () =>
    selector(3).props.onChange({ target: { value: 'former' } }),
  );
  assert.equal(button('שמור טורניר היסטורי שהסתיים').props.disabled, false);
  await act(async () =>
    renderer.root
      .findByType('textarea')
      .props.onChange({ target: { value: 'changed' } }),
  );
  assert.equal(button('שמור טורניר היסטורי שהסתיים').props.disabled, true);
  await act(async () =>
    renderer.root.findByType('textarea').props.onChange({
      target: {
        value:
          'Player\tPoints\tOMP\tGWP\tOGP\nDan Cohen\t9\t55.56\t75\t51.11\nDana\t6\t58.33%\t60\t58.75\nMaya Else\t3\t0\t100\t50',
      },
    }),
  );
  await act(async () => {
    renderer.root.findByType('form').props.onSubmit({ preventDefault() {} });
    renderer.root.findByType('form').props.onSubmit({ preventDefault() {} });
  });
  assert.equal(saves, 1);
  assert.equal(button('שומר...').props.disabled, true);
  assert.deepEqual(
    payload[2].map((row) => [row.player, row.position, row.points]),
    [
      ['a', 1, 9],
      ['c', 2, 6],
      ['former', 3, 3],
    ],
  );
  assert.ok(Math.abs(payload[2][0].omp - 0.5556) < 1e-12);
  assert.equal(payload[2][0].gwp, 0.75);
  assert.ok(Math.abs(payload[2][0].ogp - 0.5111) < 1e-12);
  assert.ok(payload[2].every((row) => !('pastedName' in row)));
  await act(async () => {
    finishSave({ id: 'saved' });
    await flush();
  });
  assert.equal(
    text(renderer.root.findByProps({ id: 'location' })),
    '/manage/tournaments/saved',
  );
  act(() => renderer.unmount());
  renderer = null;

  // Continue uses only navigation, including when the roster is currently too small.
  const { ToastProvider } = await load('components/ui/ToastProvider.tsx');
  const { ConfirmProvider } = await load('components/ui/ConfirmProvider.tsx');
  const continued = {
    ...team,
    playerCount: 0,
    openInternalTournament: { id: 'existing', phase: 'running' },
  };
  fixture.teams = {
    ...fixture.teams,
    isLoading: false,
    teams: [continued],
    manageablePlayers: [],
  };
  fixture.auth.user.role = 'judge';
  service.create = async () => {
    throw new Error('Continue must never create');
  };
  await act(async () => {
    renderer = TestRenderer.create(
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
                el(Route, { path: '/manage/teams', element: el(ManageTeams) }),
                el(Route, {
                  path: '/manage/tournaments/:id',
                  element: el('p', {}, 'Existing tournament'),
                }),
              ),
            ),
          ),
        ),
      ),
    );
  });
  assert.ok(!button('התחל טורניר'));
  assert.equal(button('המשך טורניר').props.disabled, false);
  await act(async () => button('המשך טורניר').props.onClick());
  assert.equal(
    text(renderer.root.findByProps({ id: 'location' })),
    '/manage/tournaments/existing',
  );
  act(() => renderer.unmount());
  renderer = null;
  const { publicTournaments } = await load('services/publicTournaments.ts');
  publicTournaments.list = async () => [];
  const { default: TeamPage } = await load('pages/TeamPage.tsx');
  teamsService.getTeam = async () => ({ ...continued, players: [] });
  service.rankings = async () => ({ rankings: [] });
  await act(async () => {
    renderer = TestRenderer.create(
      el(
        Provider,
        { store: fixtureStore },
        el(
          MemoryRouter,
          {
            initialEntries: ['/manage/teams/team1'],
            future: { v7_startTransition: true, v7_relativeSplatPath: true },
          },
          el(Location),
          el(
            Routes,
            {},
            el(Route, { path: '/manage/teams/:id', element: el(ToastProvider, {}, el(TeamPage)) }),
            el(Route, {
              path: '/manage/tournaments/:id',
              element: el('p', {}, 'Existing tournament'),
            }),
          ),
        ),
      ),
    );
    await flush();
  });
  assert.ok(!button('התחל טורניר'));
  assert.equal(button('המשך טורניר').props.disabled, false);
  await act(async () => button('המשך טורניר').props.onClick());
  assert.equal(
    text(renderer.root.findByProps({ id: 'location' })),
    '/manage/tournaments/existing',
  );
  console.log(
    'Tournament changes UI checks passed: pasted standings, safe/ambiguous matching, transferred players, duplicate mapping/save prevention, original points, stale create recovery and continue navigation.',
  );
} finally {
  if (renderer) act(() => renderer.unmount());
  await vite.close();
}

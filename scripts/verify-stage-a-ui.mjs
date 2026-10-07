import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createServer } from 'vite';
const storage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.localStorage = storage;
globalThis.window = {
  location: { origin: 'http://localhost:5173' },
  localStorage: storage,
};
// React Router warns about client layout effects during server rendering. The
// checks below intentionally render markup only, without a browser or screenshots.
const originalError = console.error;
console.error = (...args) => {
  if (!String(args[0]).includes('useLayoutEffect does nothing on the server'))
    originalError(...args);
};
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const element = React.createElement;
try {
  const { store } = await vite.ssrLoadModule('/src/store/index.ts');
  const { ThemeProvider } = await vite.ssrLoadModule(
    '/src/components/ThemeProvider.tsx',
  );
  const { ConfirmProvider } = await vite.ssrLoadModule(
    '/src/components/ui/ConfirmProvider.tsx',
  );
  const { ToastProvider } = await vite.ssrLoadModule(
    '/src/components/ui/ToastProvider.tsx',
  );
  const load = async (file) =>
    (await vite.ssrLoadModule(`/src/${file}`)).default;
  const render = (
    Component,
    path = '/',
    role = null,
    overrides = {},
    props = {},
  ) => {
    const initial = store.getState();
    const state = {
      ...initial,
      ...overrides,
      auth: {
        ...initial.auth,
        isAuthenticated: !!role,
        isLoading: false,
        user: role
          ? { id: 'fixture-staff', name: 'Fixture staff', role }
          : null,
      },
    };
    const fixtureStore = {
      getState: () => state,
      subscribe: () => () => {},
      dispatch: (action) => action,
    };
    return renderToStaticMarkup(
      element(
        Provider,
        { store: fixtureStore },
        element(
          MemoryRouter,
          { initialEntries: [path] },
          element(
            ThemeProvider,
            {},
            element(
              ToastProvider,
              {},
              element(
                ConfirmProvider,
                {},
                element(
                  Routes,
                  {},
                  element(Route, {
                    path: path.startsWith('/manage') ? '/manage/*' : '*',
                    element: element(Component, props),
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  };
  const Header = await load('components/layout/Header.tsx');
  const publicHeader = render(Header);
  const menu = [
    'הליגה הישראלית',
    'All Stars',
    'אירועים',
    'חדשות',
    'חנות',
    'על הליגה',
    'הזמנת יום הולדת',
  ];
  let last = -1;
  for (const label of menu) {
    const index = publicHeader.indexOf(label);
    assert.ok(index > last, `Public menu order: ${label}`);
    last = index;
  }
  assert.ok(!publicHeader.includes('href="/manage"'));
  assert.equal((publicHeader.match(/בהקמה/g) || []).length, 3);
  assert.equal((publicHeader.match(/absolute -top-1 left-0 whitespace-nowrap rounded-\[3px\] border border-blue-200/g) || []).length, 3);
  assert.equal((publicHeader.match(/class="cs-nav-link"/g) || []).length, 7);
  assert.ok(!publicHeader.includes('shadow-button'), 'Header controls use contextual styling');
  assert.ok(render(Header, '/', 'judge').includes('href="/manage"'));
  const Manage = await load('pages/manage/ManageDashboardPage.tsx');
  for (const role of ['admin', 'judge']) {
    const markup = render(Manage, '/manage', role);
    assert.ok(
      markup.indexOf('סקירה כללית') < markup.indexOf('נבחרות All-Stars'),
    );
    assert.ok(markup.indexOf('נבחרות All-Stars') < markup.indexOf('טורנירים'));
    assert.ok(!markup.includes('href="/manage/seasons"'));
    assert.ok(!markup.includes('href="/manage/internal-tournaments"'));
    assert.ok(!markup.includes('href="/manage/historical"'));
    assert.equal(markup.includes('href="/manage/badges"'), role === 'admin');
    assert.ok(markup.includes('סגור תפריט ניהול'));
  }
  const nested = render(
    Manage,
    '/manage/teams/012345678901234567890123/history',
    'judge',
  );
  assert.match(
    nested,
    /href="\/manage\/teams"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/manage\/teams"/,
  );
  assert.ok(!nested.includes('הזנת טורניר היסטורי'));
  assert.ok(render(Manage, '/manage/teams/012345678901234567890123/history', 'admin').includes('הזנת טורניר היסטורי'));
  for (const role of ['admin', 'judge']) {
    const direct = render(Manage, '/manage/teams/012345678901234567890123/historical', role);
    assert.equal(direct.includes('שמור טורניר היסטורי שהסתיים'), role === 'admin');
  }
  assert.ok(nested.includes('נבחרת'));
  assert.equal((nested.match(/חזרה ל/g) || []).length, 1);
  // Exercise the actual editor while a save is pending and after a network
  // failure, including a concurrent server revision and a cancelled correction.
  const Editor = await load('components/MatchEditor.tsx');
  const Button = await load('components/ui/Button.tsx');
  for (const variant of [
    'default',
    'secondary',
    'outline',
    'destructive',
    'ghost',
    'link',
    'success',
    'cta',
    'live',
  ]) {
    assert.match(
      render(Button, '/', null, {}, { variant, contextual: false, children: 'פעולה' }),
      /shadow-button/,
    );
  }
  for (const variant of ['default', 'outline', 'destructive', 'cta', 'live']) {
    assert.ok(!render(Button, '/', null, {}, { variant, contextual: true, children: 'פעולה' }).includes('shadow-button'));
  }
  assert.ok(!render(Button, '/', null, {}, { size: 'icon', children: 'סגור' }).includes('shadow-button'));
  const { requestError } = await vite.ssrLoadModule(
    '/src/utils/requestError.ts',
  );
  assert.ok(
    !requestError(new Error('Network Error')).includes('Network Error'),
  );
  assert.match(requestError(new Error('Network Error')), /חיבור/);
  let finish;
  let calls = 0;
  let sent;
  const fixture = {
    _id: 'match',
    table: 1,
    player1: 'a',
    player2: 'b',
    result: null,
  };
  let props = {
    match: fixture,
    revision: 3,
    name: (id) => (id === 'a' ? 'שחקן ראשון' : 'שחקן שני'),
    disabled: false,
    readOnly: false,
    discard: async () => {},
    save: (result, revision) => {
      calls++;
      sent = { result, revision };
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  };
  let editor;
  act(() => {
    editor = TestRenderer.create(element(Editor, props));
  });
  const buttons = () => editor.root.findAllByType('button');
  act(() => buttons()[0].props.onClick());
  act(() =>
    editor.root
      .findByType('select')
      .props.onChange({ target: { value: '1-0' } }),
  );
  let pending;
  const submit = buttons()[3].props.onClick;
  act(() => {
    pending = submit();
    void submit();
  });
  assert.equal(calls, 1, 'Rapid duplicate submission is prevented');
  assert.equal(sent.revision, 3);
  assert.equal(sent.result.score1, 1);
  assert.ok(buttons().every((button) => button.props.disabled));
  assert.match(JSON.stringify(editor.toJSON()), /שומר את התוצאה/);
  assert.ok(!JSON.stringify(editor.toJSON()).includes('טרם הוזנה תוצאה'));
  await act(async () => {
    finish('failed');
    await pending;
  });
  assert.equal(
    editor.root.findByType('select').props.value,
    '1-0',
    'Failure preserves the draft',
  );
  assert.match(JSON.stringify(editor.toJSON()), /השמירה לא אושרה/);
  props = {
    ...props,
    revision: 4,
    match: {
      ...fixture,
      result: { winner: 'player2', score1: 0, score2: 2, drawnGames: 0 },
    },
  };
  act(() => editor.update(element(Editor, props)));
  assert.equal(
    editor.root.findByType('select').props.value,
    '1-0',
    'Concurrent canonical update must not overwrite a draft',
  );
  await act(async () => {
    await buttons()[4].props.onClick();
  });
  assert.equal(
    editor.root.findByType('select').props.value,
    '0-2',
    'Discard adopts the canonical result',
  );
  act(() => buttons()[0].props.onClick());
  act(() =>
    editor.root
      .findByType('select')
      .props.onChange({ target: { value: '2-1' } }),
  );
  act(() => {
    pending = buttons()[3].props.onClick();
  });
  assert.equal(sent.revision, 4);
  await act(async () => {
    finish('cancelled');
    await pending;
  });
  assert.equal(
    editor.root.findByType('select').props.value,
    '2-1',
    'Cancelled confirmation preserves draft',
  );
  act(() => {
    pending = buttons()[3].props.onClick();
  });
  await act(async () => {
    props = {
      ...props,
      revision: 5,
      match: { ...fixture, result: sent.result },
    };
    editor.update(element(Editor, props));
    finish('saved');
    await pending;
  });
  assert.match(JSON.stringify(editor.toJSON()), /התוצאה נשמרה בשרת/);
  act(() => editor.unmount());
  const ManageTeams = await load('pages/manage/ManageTeams.tsx');
  const teamState = store.getState();
  const teamFixture = {
    teams: { ...teamState.teams, isLoading: false, teams: [{ id: 'fixture-team', name: 'נבחרת בדיקה', isActive: true, playerCount: 1 }], manageablePlayers: [{ id: 'fixture-player', firstName: 'ילד', lastName: 'בדיקה', team: { id: 'fixture-team', name: 'נבחרת בדיקה' }, type: 'team', isActive: true }] },
  };
  const teamRow = render(ManageTeams, '/', 'admin', teamFixture);
  const judgeTeamRow = render(ManageTeams, '/', 'judge', teamFixture);
  assert.ok(judgeTeamRow.includes('סגל וטורנירים'));
  assert.ok(judgeTeamRow.includes('ילד'));
  for (const forbidden of ['נבחרת חדשה', 'שם וסמל', 'שייך שחקן', 'השבת', 'הסר מהנבחרת']) assert.ok(!judgeTeamRow.includes(forbidden));
  const TournamentList = await load('pages/manage/ManageTournaments.tsx');
  assert.ok(!render(TournamentList, '/', 'judge').includes('Excel'));
  assert.ok(render(TournamentList, '/', 'admin').includes('Excel'));
  for (const label of ['סגל וטורנירים', 'שם וסמל', 'השבת', 'שייך שחקן']) {
    const labelIndex = teamRow.indexOf(label);
    assert.ok(labelIndex >= 0, `Team row action: ${label}`);
    const actionStart = Math.max(teamRow.lastIndexOf('<button', labelIndex), teamRow.lastIndexOf('<a ', labelIndex));
    assert.ok(teamRow.slice(actionStart, labelIndex).includes('shadow-button'), `Grouped action must have shadow: ${label}`);
  }
  const removeIndex = teamRow.indexOf('aria-label="הסר מהנבחרת"');
  assert.ok(removeIndex >= 0);
  assert.ok(!teamRow.slice(teamRow.lastIndexOf('<button', removeIndex), removeIndex).includes('shadow-button'), 'Inline removal outside the action group stays flat');
  const Home = await load('pages/HomePage.tsx');
  const future = new Date(Date.now() + 86400000).toISOString();
  const state = store.getState();
  const home = render(Home, '/', null, {
    tournaments: {
      ...state.tournaments,
      isLoading: false,
      tournaments: [
        {
          id: 'internal',
          title: 'Must not feature internal',
          date: future,
          type: 'team_internal',
          status: 'upcoming',
        },
        {
          id: 'regular',
          title: 'Nearest club event',
          date: future,
          type: 'quarterly',
          status: 'upcoming',
          location: 'Club',
          currentParticipants: 2,
          maxParticipants: 16,
        },
      ],
    },
    updates: {
      ...state.updates,
      isLoading: false,
      updates: [
        {
          id: 'news-fixture',
          title: 'Latest fixture update',
          content: 'Safe text',
          date: future,
        },
      ],
    },
  });
  assert.ok(home.includes('Nearest club event'));
  assert.ok(!home.includes('Must not feature internal'));
  assert.ok(home.includes('/news/news-fixture'));
  assert.ok(home.includes('מובילי הליגה הישראלית'));
  assert.ok(home.includes('הרשמה לחוג הקרוב לביתכם'));
  assert.ok(!home.includes('הדקים המובילים'));
  const Construction = await load('pages/ConstructionPage.tsx');
  for (const title of ['חנות', 'על הליגה', 'הזמנת יום הולדת'])
    assert.ok(render(Construction, '/', null, {}, { title }).includes('בהקמה'));
  console.log(
    'Stage A UI checks passed: public menu, role-aware management, nested team context, homepage sources, shared button surfaces, duplicate-save protection, pending/failure/cancelled saves and canonical result recovery.',
  );
} finally {
  await vite.close();
  console.error = originalError;
}

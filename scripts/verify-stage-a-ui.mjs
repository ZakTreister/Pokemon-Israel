import assert from 'node:assert/strict';
import React from 'react';
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
  assert.ok(nested.includes('הזנת טורניר היסטורי'));
  assert.ok(nested.includes('חזרה לנבחרת'));
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
    'Stage A UI checks passed: public menu, role-aware management, nested team context, homepage sources and static pages.',
  );
} finally {
  await vite.close();
  console.error = originalError;
}

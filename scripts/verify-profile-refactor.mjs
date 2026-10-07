import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { createServer } from 'vite';

const values = new Map([['token', 'fixture-session']]);
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
let reloads = 0;
globalThis.window = {
  localStorage,
  location: {
    origin: 'http://localhost:5173',
    reload: () => {
      reloads++;
    },
  },
};
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const element = React.createElement;
let tree;
try {
  const load = (file) => vite.ssrLoadModule(`/src/${file}`);
  const { validateProfile, profileUpdate } = await load(
    'features/user/utils/profile.ts',
  );
  const valid = {
    name: ' שם ',
    username: ' user ',
    currentPassword: 'old',
    newPassword: 'new123',
    confirmPassword: 'new123',
  };
  const cases = [
    [{ name: ' ' }, false, 'שם ושם משתמש הם שדות חובה'],
    [{ username: ' ' }, false, 'שם ושם משתמש הם שדות חובה'],
    [{ username: 'ab' }, false, 'שם המשתמש חייב להיות לפחות 3 תווים'],
    [{ currentPassword: '' }, true, 'יש להזין את הסיסמה הנוכחית'],
    [{ newPassword: '' }, true, 'יש להזין סיסמה חדשה'],
    [{ newPassword: 'short' }, true, 'הסיסמה החדשה חייבת להיות לפחות 6 תווים'],
    [{ confirmPassword: 'different' }, true, 'הסיסמאות החדשות אינן תואמות'],
    [{ currentPassword: '', newPassword: '', confirmPassword: '' }, false, ''],
    [{}, true, ''],
    [{ username: ' a ' }, false, ''], // Preserve the existing raw-length check before payload trimming.
  ];
  for (const [patch, changePassword, expected] of cases)
    assert.equal(
      validateProfile({ ...valid, ...patch }, changePassword),
      expected,
    );
  assert.deepEqual(profileUpdate(valid, false), {
    name: 'שם',
    username: 'user',
  });
  assert.deepEqual(profileUpdate(valid, true), {
    name: 'שם',
    username: 'user',
    password: 'new123',
  });

  const { default: api } = await load('services/api.ts');
  const { store } = await load('store/index.ts');
  const { checkAuth } = await load('features/auth/authSlice.ts');
  const { default: Dashboard } = await load(
    'pages/player/PlayerDashboardPage.tsx',
  );
  const { default: ProtectedRoute } = await load(
    'components/auth/ProtectedRoute.tsx',
  );
  const { ToastProvider } = await load('components/ui/ToastProvider.tsx');
  let profile = {
    id: 'legacy-account',
    name: 'ישן',
    username: 'legacy',
    role: 'player',
  };
  const requests = [];
  let failure = null;
  let releaseSave;
  api.get = async (url) => {
    requests.push(['GET', url]);
    if (url === '/api/auth/profile') return { data: { ...profile } };
    if (url === '/api/users/stats')
      return {
        data: {
          totalTournaments: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          winRate: 0,
          points: 0,
          bestRank: 0,
          achievements: [],
        },
      };
    if (url === '/api/users/tournaments' || url === '/api/tournaments')
      return { data: [] };
    throw new Error(`Unexpected fixture request: ${url}`);
  };
  api.post = async (url, payload) => {
    requests.push(['POST', url, payload]);
    if (failure?.response?.status === 401) throw failure;
    return { data: { token: 'must-not-replace-session' } };
  };
  api.put = async (url, payload) => {
    requests.push(['PUT', url, payload]);
    if (failure) throw failure;
    if (releaseSave)
      await new Promise((resolve) => {
        releaseSave = resolve;
      });
    profile = { ...profile, name: payload.name, username: payload.username };
    return { data: { ...profile } };
  };
  await store.dispatch(checkAuth());
  function LocationProbe() {
    return element('output', { id: 'route' }, useLocation().pathname);
  }
  await act(async () => {
    tree = TestRenderer.create(
      element(
        Provider,
        { store },
        element(
          MemoryRouter,
          { initialEntries: ['/dashboard'] },
          element(
            ToastProvider,
            {},
            element(LocationProbe),
            element(
              Routes,
              {},
              element(
                Route,
                { element: element(ProtectedRoute) },
                element(Route, {
                  path: '/dashboard',
                  element: element(Dashboard),
                }),
              ),
            ),
          ),
        ),
      ),
    );
  });
  const text = (node) =>
    node.children
      .map((child) => (typeof child === 'string' ? child : text(child)))
      .join('');
  const button = (label) =>
    tree.root.findAllByType('button').find((node) => text(node) === label);
  const input = (placeholder) =>
    tree.root
      .findAllByType('input')
      .find((node) => node.props.placeholder === placeholder);
  const type = async (placeholder, value) => {
    await act(async () =>
      input(placeholder).props.onChange({ target: { value } }),
    );
  };
  const click = async (label) => {
    await act(async () => {
      await button(label).props.onClick();
    });
  };
  await click('עריכת פרופיל');
  await type('הזן שם מלא', ' חדש ');
  await type('הזן שם משתמש (לפחות 3 תווים)', ' updated ');
  const beforeSave = requests.length;
  // Observe pending state before releasing the real page's asynchronous save.
  releaseSave = true;
  let save;
  await act(async () => {
    save = button('שמור שינויים').props.onClick();
  });
  assert.equal(button('מעדכן פרופיל...').props.disabled, true);
  assert.equal(button('ביטול').props.disabled, true);
  await act(async () => {
    releaseSave();
    await save;
  });
  releaseSave = null;
  assert.equal(reloads, 0);
  assert.equal(
    tree.root.findByProps({ id: 'route' }).children.join(''),
    '/dashboard',
  );
  assert.equal(store.getState().auth.user.name, 'חדש');
  assert.equal(store.getState().auth.user.username, 'updated');
  assert.equal(store.getState().auth.token, 'fixture-session');
  assert.equal(localStorage.getItem('token'), 'fixture-session');
  assert.match(text(tree.root.findByType('h1')), /חדש/);
  assert.equal(tree.root.findAllByProps({ role: 'dialog' }).length, 0);
  assert.deepEqual(requests.slice(beforeSave), [
    ['PUT', '/api/auth/profile', { name: 'חדש', username: 'updated' }],
    ['GET', '/api/auth/profile'],
    ['GET', '/api/users/stats'],
    ['GET', '/api/users/tournaments'],
    ['GET', '/api/tournaments'],
  ]);

  await click('עריכת פרופיל');
  await act(async () =>
    tree.root
      .findByProps({ id: 'changePassword' })
      .props.onChange({ target: { checked: true } }),
  );
  await type('הזן סיסמה נוכחית', 'incorrect');
  await type('הזן סיסמה חדשה (לפחות 6 תווים)', 'new123');
  await type('הזן שוב את הסיסמה החדשה', 'new123');
  await act(async () =>
    tree.root.findAllByProps({ 'aria-label': 'הצג סיסמה' })[0].props.onClick(),
  );
  assert.equal(input('הזן סיסמה נוכחית').props.type, 'text');
  failure = { response: { status: 401 } };
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0] !== 'Error updating profile:') originalError(...args);
  };
  try {
    const beforeFailure = requests.length;
    await click('שמור שינויים');
    assert.deepEqual(requests.slice(beforeFailure), [
      [
        'POST',
        '/api/auth/login',
        { username: 'updated', password: 'incorrect' },
      ],
    ]);
    assert.equal(input('הזן סיסמה נוכחית').props.value, 'incorrect');
    assert.match(
      text(tree.root.findByProps({ role: 'dialog' })),
      /הסיסמה הנוכחית שגויה/,
    );
    assert.equal(button('שמור שינויים').props.disabled, false);
    failure = {
      response: { status: 400, data: { message: 'username taken' } },
    };
    await click('שמור שינויים');
    assert.match(
      text(tree.root.findByProps({ role: 'dialog' })),
      /שם המשתמש כבר קיים במערכת/,
    );
  } finally {
    console.error = originalError;
  }
  failure = null;
  const beforePasswordSave = requests.length;
  await click('שמור שינויים');
  assert.deepEqual(requests.slice(beforePasswordSave, beforePasswordSave + 2), [
    ['POST', '/api/auth/login', { username: 'updated', password: 'incorrect' }],
    [
      'PUT',
      '/api/auth/profile',
      { name: 'חדש', username: 'updated', password: 'new123' },
    ],
  ]);
  assert.equal(localStorage.getItem('token'), 'fixture-session');
  assert.equal(reloads, 0);
  await click('עריכת פרופיל');
  assert.equal(
    tree.root.findByProps({ id: 'changePassword' }).props.checked,
    false,
  );
  await click('ביטול');
  assert.equal(tree.root.findAllByProps({ role: 'dialog' }).length, 0);
  console.log(
    'Profile refactor checks passed: original validation/payloads, pending and retry states, password verification order, token preservation and SPA auth/data reconciliation.',
  );
} finally {
  if (tree) await act(async () => tree.unmount());
  await vite.close();
}

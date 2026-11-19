import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

// Exercise both browser fullscreen and a no-fullscreen mobile fallback.
const listeners = new Map();
const documentMock = {
  body: { style: { overflow: '' } },
  fullscreenElement: null,
  documentElement: {
    async requestFullscreen() {
      documentMock.fullscreenElement = documentMock.documentElement;
      listeners.get('fullscreenchange')?.forEach((fn) => fn());
    },
  },
  addEventListener(name, fn) {
    const entries = listeners.get(name) ?? new Set();
    entries.add(fn);
    listeners.set(name, entries);
  },
  removeEventListener(name, fn) {
    listeners.get(name)?.delete(fn);
  },
  async exitFullscreen() {
    this.fullscreenElement = null;
    listeners.get('fullscreenchange')?.forEach((fn) => fn());
  },
};
globalThis.document = documentMock;
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const el = React.createElement;
const flush = () => new Promise((resolve) => setImmediate(resolve));
let renderer;
try {
  const { default: FullscreenPairings } = await vite.ssrLoadModule(
    '/src/components/tournaments/FullscreenPairings.tsx',
  );

  // An input or a pending result editor must not remount/lose its local draft
  // as the operator switches from normal view to fullscreen and back.
  function EditorFixture() {
    const [draft, setDraft] = React.useState('');
    React.useEffect(() => {
      globalThis.editorMounts = (globalThis.editorMounts ?? 0) + 1;
    }, []);
    return el('input', {
      'aria-label': 'תוצאת משחק',
      value: draft,
      onChange: (nextValue) => setDraft(nextValue),
    });
  }

  const mount = (enabled = true) => TestRenderer.create(
    el(FullscreenPairings, {
      title: 'ניהול טורניר',
      enabled,
      children: el(EditorFixture),
    }),
  );
  const button = () => renderer.root.findAllByType('button')[0];
  const surface = () => renderer.root.findByProps({ 'aria-label': 'ניהול טורניר' });
  const input = () => renderer.root.findByProps({ 'aria-label': 'תוצאת משחק' });
  globalThis.editorMounts = 0;

  await act(async () => { renderer = mount(); });
  assert.equal(button().props['aria-label'], 'הגדל מסך ניהול טורניר');
  await act(async () => { input().props.onChange('2-1'); });
  assert.equal(input().props.value, '2-1');

  await act(async () => { button().props.onClick(); await flush(); });
  assert.equal(documentMock.fullscreenElement, documentMock.documentElement);
  assert.equal(button().props['aria-label'], 'צמצם מסך ניהול טורניר');
  assert.match(surface().props.className, /fixed inset-0/);
  assert.equal(input().props.value, '2-1');
  assert.equal(globalThis.editorMounts, 1);
  assert.equal(documentMock.body.style.overflow, 'hidden');

  await act(async () => { await documentMock.exitFullscreen(); });
  assert.equal(input().props.value, '2-1');
  assert.equal(globalThis.editorMounts, 1);
  assert.equal(documentMock.body.style.overflow, '');

  documentMock.documentElement.requestFullscreen = undefined;
  await act(async () => { button().props.onClick(); await flush(); });
  assert.equal(button().props['aria-label'], 'צמצם מסך ניהול טורניר');
  assert.equal(input().props.value, '2-1');
  assert.equal(documentMock.body.style.overflow, 'hidden');
  await act(async () => {
    listeners.get('keydown')?.forEach((fn) => fn({ key: 'Escape' }));
  });
  assert.equal(button().props['aria-label'], 'הגדל מסך ניהול טורניר');
  assert.equal(input().props.value, '2-1');
  assert.equal(documentMock.body.style.overflow, '');
  await act(async () => { renderer.unmount(); });

  await act(async () => { renderer = mount(false); });
  assert.equal(renderer.root.findAllByType('button').length, 0);
  assert.equal(renderer.root.findAllByType('input').length, 1);
  await act(async () => { renderer.unmount(); });

  const club = await readFile('src/pages/manage/InternalTournamentPage.tsx', 'utf8');
  const interTeam = await readFile('src/pages/manage/InterTeamManagePage.tsx', 'utf8');
  const matchEditor = await readFile('src/components/MatchEditor.tsx', 'utf8');

  assert.match(club, /<FullscreenPairings enabled=\{club\} title=\{`ניהול טורניר/);
  assert.match(club, /readOnly=\{readOnly\}/);
  assert.match(club, /round\.matches\.map/);
  assert.match(club, /subscribeTournament\(/);
  assert.match(club, /הגרל סיבוב נוסף/);
  assert.doesNotMatch(club, /readOnly=\{readOnly \|\| presenting\}/);
  assert.match(matchEditor, /שמור תוצאה/);

  assert.match(interTeam, /<FullscreenPairings title=\{`ניהול מפגש/);
  assert.match(interTeam, /readOnly=\{data\.phase==='completed'\}/);
  assert.match(interTeam, /subscribeTournament\(/);
  assert.match(interTeam, /ספסל/);
  assert.match(interTeam, /שמור צימודים/);
  assert.match(interTeam, /סיים מפגש/);
  assert.match(interTeam, /matchPoints\(result\)/);
  assert.doesNotMatch(interTeam, /!presenting/);
  console.log('Interactive management fullscreen checks passed');
} finally {
  if (renderer) await act(async () => { renderer.unmount(); });
  await vite.close();
  delete globalThis.document;
}

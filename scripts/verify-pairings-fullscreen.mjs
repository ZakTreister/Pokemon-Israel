import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

// Keep the focused mode independent of actual browser layout; exercise the
// browser Fullscreen API contract using a simulated document + React renderer.
const listeners = new Map();
const documentMock = {
  body: { style: { overflow: '' } },
  fullscreenElement: null,
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
const surface = {
  async requestFullscreen() {
    documentMock.fullscreenElement = surface;
    listeners.get('fullscreenchange')?.forEach((fn) => fn());
  },
};
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
  const mount = (enabled = true) => TestRenderer.create(
    el(FullscreenPairings, {
      title: 'צימודים',
      enabled,
      children: (presenting) =>
        el('div', { id: 'match-table', 'data-presentation': presenting }, 'שחקן א מול שחקן ב'),
    }),
    {
      createNodeMock(element) {
        return element.type === 'div' && element.props['aria-label'] === 'צימודים'
          ? surface : {};
      },
    },
  );
  const button = () => renderer.root.findAllByType('button')[0];
  const main = () => renderer.root.findByProps({ 'aria-label': 'צימודים' });
  const table = () => renderer.root.findByProps({ id: 'match-table' });
  await act(async () => { renderer = mount(); });
  assert.equal(button().props['aria-label'], 'הגדל צימודים למסך מלא');
  assert.equal(table().props['data-presentation'], false);

  await act(async () => { button().props.onClick(); await flush(); });
  assert.equal(documentMock.fullscreenElement, surface);
  assert.equal(button().props['aria-label'], 'צמצם תצוגת צימודים');
  assert.equal(table().props['data-presentation'], true);
  assert.match(main().props.className, /fixed inset-0/);

  // Browser Escape or an external fullscreen exit must restore the normal UI.
  await act(async () => { await documentMock.exitFullscreen(); });
  assert.equal(table().props['data-presentation'], false);

  // When the native API is unavailable, keep a fullscreen-like overlay and
  // restore body scrolling on Escape.
  surface.requestFullscreen = undefined;
  await act(async () => { button().props.onClick(); await flush(); });
  assert.equal(table().props['data-presentation'], true);
  assert.equal(documentMock.body.style.overflow, 'hidden');
  await act(async () => {
    listeners.get('keydown')?.forEach((fn) => fn({ key: 'Escape' }));
  });
  assert.equal(table().props['data-presentation'], false);
  assert.equal(documentMock.body.style.overflow, '');
  await act(async () => { renderer.unmount(); });

  await act(async () => { renderer = mount(false); });
  assert.equal(renderer.root.findAllByType('button').length, 0);
  assert.equal(table().props['data-presentation'], false);
  await act(async () => { renderer.unmount(); });

  const club = await readFile('src/pages/manage/InternalTournamentPage.tsx', 'utf8');
  const interTeam = await readFile('src/pages/manage/InterTeamManagePage.tsx', 'utf8');
  assert.match(club, /<FullscreenPairings enabled=\{club\}/);
  assert.match(club, /readOnly=\{readOnly \|\| presenting\}/);
  assert.match(interTeam, /<FullscreenPairings title=/);
  assert.match(interTeam, /readOnly=\{presenting\|\|data\.phase==='completed'\}/);
  assert.match(interTeam, /!presenting&&data\.phase/);
  assert.match(interTeam, /matchPoints\(result\)/);
  console.log('Pairings fullscreen UI checks passed');
} finally {
  if (renderer) await act(async () => { renderer.unmount(); });
  await vite.close();
  delete globalThis.document;
}

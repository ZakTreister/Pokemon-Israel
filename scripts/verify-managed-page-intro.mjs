import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

const storage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.localStorage = storage;
globalThis.window = { localStorage: storage, location: { origin: 'http://localhost:5173' } };
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
let renderer;
try {
  const { default: Intro } = await vite.ssrLoadModule('/src/components/content/ManagedPageIntro.tsx');
  const { staticPageTextsService, staticTextPages } = await vite.ssrLoadModule('/src/services/staticPageTexts.ts');
  assert.deepEqual(staticTextPages.map(page => page.id), ['all-stars', 'rankings']);
  const calls = [];
  staticPageTextsService.get = async id => {
    calls.push(id);
    return { title: 'כותרת ' + id, subtitle: 'משנה', bodyHtml: '<p>תוכן ' + id + '</p>' };
  };
  for (const pageId of ['all-stars', 'rankings']) {
    await act(async () => { renderer = TestRenderer.create(React.createElement(Intro, { pageId })); });
    const [hero, body] = renderer.toJSON();
    assert.equal(hero.type, 'section');
    assert.match(hero.props.className, pageId === 'all-stars' ? /purple/ : /bg-hero-navy/);
    assert.equal(body.type, 'div');
    const html = renderer.root.find(node => node.type === 'div' && node.props.dangerouslySetInnerHTML?.__html === '<p>תוכן ' + pageId + '</p>');
    assert.ok(body.children[0].children[0].props.className.includes('cs-public-card'));
    assert.ok(html);
    act(() => renderer.unmount());
    renderer = null;
  }
  assert.deepEqual(calls, ['all-stars', 'rankings']);
  staticPageTextsService.get = async () => ({ title: '', subtitle: '', bodyHtml: '' });
  await act(async () => { renderer = TestRenderer.create(React.createElement(Intro, { pageId: 'rankings' })); });
  assert.equal(renderer.toJSON(), null);
  act(() => renderer.unmount());
  renderer = null;
  staticPageTextsService.get = async () => ({ title: 'כותרת', subtitle: '', bodyHtml: '' });
  await act(async () => { renderer = TestRenderer.create(React.createElement(Intro, { pageId: 'rankings' })); });
  assert.equal(renderer.toJSON().type, 'section');
  console.log('Managed league introductions: saved text, palette, card order and empty states passed.');
} finally {
  if (renderer) act(() => renderer.unmount());
  await vite.close();
}

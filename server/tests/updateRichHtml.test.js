import test from 'node:test';
import assert from 'node:assert/strict';
import { updateFields } from '../services/updateFields.js';

test('rich update stores safe HTML and a plain excerpt', () => {
  const html = '<h2>שלום</h2><p><strong>עדכון</strong> &amp; <a href="https://example.com">קישור</a></p>';
  const fields = updateFields({ title: 'חדשות', descriptionHtml: html });
  assert.equal(fields.descriptionHtml, html);
  assert.equal(fields.content, 'שלום\nעדכון & קישור');
});
test('rejects unsafe update HTML', () => {
  for (const descriptionHtml of ['<script>alert(1)</script>', '<a href="javascript:alert(1)">x</a>', '<p onclick="alert(1)">x</p>']) {
    assert.throws(() => updateFields({ title: 'חדשות', descriptionHtml }));
  }
});
test('legacy plain text and partial edits remain compatible', () => {
  const legacy = updateFields({ title: 'חדשות', description: '<literal>\ntext' });
  assert.equal(legacy.content, '<literal>\ntext');
  assert.equal(legacy.descriptionHtml, undefined);
  const existing = { title: 'חדשות', content: 'old', descriptionHtml: '<p>old</p>' };
  assert.equal(Object.hasOwn(updateFields({ title: 'new' }, existing), 'descriptionHtml'), false);
  const replacement = updateFields({ description: 'new text' }, existing);
  assert.equal(replacement.descriptionHtml, undefined);
  assert.equal(replacement.content, 'new text');
  assert.equal(updateFields({ descriptionHtml: '' }, existing).content, '');
});

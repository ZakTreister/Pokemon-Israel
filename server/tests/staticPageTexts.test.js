import test from 'node:test';
import assert from 'node:assert/strict';
import { staticPageDefaults, staticPageTextFields, legacyBadgeHtml } from '../services/staticPageTexts.js';
import { sanitizeRichHtml } from '../../shared/richHtml.js';

test('fixed page defaults do not create arbitrary pages', () => {
  assert.deepEqual(staticPageDefaults('all-stars'), { title: '', subtitle: '', bodyHtml: '' });
  assert.throws(() => staticPageDefaults('other'), { statusCode: 404 });
  assert.throws(() => staticPageDefaults('constructor'), { statusCode: 404 });
});
test('managed texts validate title and safe HTML, allowing blank optional fields', () => {
  assert.deepEqual(staticPageTextFields({ title: ' כותרת ', subtitle: '', bodyHtml: '<p><strong>שלום</strong></p>' }), { title: 'כותרת', subtitle: '', bodyHtml: '<p><strong>שלום</strong></p>' });
  assert.throws(() => staticPageTextFields({ title: ' ', subtitle: '', bodyHtml: '' }), { statusCode: 400 });
  assert.throws(() => staticPageTextFields({ title: 'כותרת', subtitle: '', bodyHtml: '<script>alert(1)</script>' }), { statusCode: 400 });
});
test('legacy badge description is treated as text, not markup', () => {
  const html = legacyBadgeHtml('A & B\n<b>literal</b>');
  assert.equal(html, '<p>A &amp; B<br>&lt;b&gt;literal&lt;/b&gt;</p>');
  assert.equal(sanitizeRichHtml(html), html);
  assert.equal(legacyBadgeHtml(''), '');
});

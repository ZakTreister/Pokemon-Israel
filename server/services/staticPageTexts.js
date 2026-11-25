import { richBody } from './contentFields.js';
import { fail } from '../utils/httpError.js';

const pageKeys = new Set(['all-stars', 'rankings']);

export function staticPageDefaults(key) {
  if (!pageKeys.has(key)) fail(404, 'עמוד לא נמצא');
  return { title: '', subtitle: '', bodyHtml: '' };
}

export function staticPageTextFields(input) {
  const { title, subtitle, bodyHtml } = input ?? {};
  if (typeof title !== 'string' || !title.trim() || title.length > 180 ||
      typeof subtitle !== 'string' || subtitle.length > 5000) {
    fail(400, 'יש להזין כותרת וטקסט תקינים');
  }
  return { title: title.trim(), subtitle: subtitle.trim(), bodyHtml: richBody(bodyHtml) };
}

// Preserve literal legacy plain text, including line breaks and angle brackets.
export function legacyBadgeHtml(description = '') {
  if (!description) return '';
  const escaped = description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<p>' + escaped.replace(/\r\n|\r|\n/g, '<br>') + '</p>';
}

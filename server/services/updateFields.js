import { richBody } from './contentFields.js';
import { fail } from '../utils/httpError.js';
// Keep a plain-text excerpt for cards, feeds and legacy clients.
function htmlExcerpt(html) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return html.replace(/<\/?(?:p|h2|h3|h4|li|blockquote|ul|ol|br|hr)>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
      const key = entity.toLowerCase();
      if (key[0] !== '#') return entities[key] ?? match;
      const code = key[1] === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '\uFFFD';
    }).replace(/\n{2,}/g, '\n').trim();
}
export function updateFields(input, existing = {}) {
  const title = input.title ?? existing.title ?? '';
  const hasHtml = input.descriptionHtml !== undefined;
  const hasPlain = input.description !== undefined || input.content !== undefined;
  const descriptionHtml = hasHtml ? richBody(input.descriptionHtml) : undefined;
  const content = hasHtml ? htmlExcerpt(descriptionHtml) : input.description ?? input.content ?? existing.content ?? '';
  const ctaText = input.ctaText ?? existing.ctaText ?? '';
  const ctaUrl = input.ctaUrl ?? existing.ctaUrl ?? '';
  if (typeof title !== 'string' || !title.trim())
    fail(400, 'כותרת היא שדה חובה');
  if ([content, ctaText, ctaUrl].some((value) => typeof value !== 'string'))
    fail(400, 'יש להזין טקסט תקין');
  if (!!ctaText.trim() !== !!ctaUrl.trim())
    fail(400, 'יש להזין גם טקסט וגם קישור לקריאה לפעולה');
  if (ctaUrl.trim()) {
    let url;
    try {
      url = new URL(ctaUrl.trim());
    } catch {
      fail(400, 'קישור לא תקין');
    }
    if (!['http:', 'https:'].includes(url.protocol))
      fail(400, 'הקישור חייב להתחיל ב-http או https');
  }
  for(const key of ['showInFieldNews','imageInGallery'])if(input[key]!==undefined&&typeof input[key]!=='boolean')fail(400,'סימון תצוגה לא תקין');
  return {
    ...(input.showInFieldNews!==undefined?{showInFieldNews:input.showInFieldNews}:{}),
    ...(input.imageInGallery!==undefined?{imageInGallery:input.imageInGallery}:{}),
    title: title.trim(),
    content: content.trim(),
    ...(hasHtml ? { descriptionHtml } : hasPlain && existing.descriptionHtml !== undefined ? { descriptionHtml: undefined } : {}),
    ctaText: ctaText.trim(),
    ctaUrl: ctaUrl.trim(),
  };
}

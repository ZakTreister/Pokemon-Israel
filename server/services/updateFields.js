import { fail } from '../utils/httpError.js';
export function updateFields(input, existing = {}) {
  const title = input.title ?? existing.title ?? '';
  const content = input.description ?? input.content ?? existing.content ?? '';
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
    ctaText: ctaText.trim(),
    ctaUrl: ctaUrl.trim(),
  };
}

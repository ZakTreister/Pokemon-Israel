import { z } from 'zod';
import { sanitizeRichHtml } from '../../../../shared/richHtml.js';

export function legacyUpdateHtml(value: string): string {
  if (!value) return '';
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const html = value.split(/(https?:\/\/[^\s<>]+)/g).map(part => {
    if (/^https?:\/\//.test(part)) {
      try { return sanitizeRichHtml('<a href="' + escape(part) + '">' + escape(part) + '</a>'); }
      catch { /* Keep invalid legacy URLs as literal text. */ }
    }
    return escape(part).replace(/\r\n|\r|\n/g, '<br>');
  }).join('');
  return '<p>' + html + '</p>';
}
export const updateFormSchema = z
  .object({
    title: z.string().trim().min(1, 'כותרת היא חובה'),
    description: z.string(),
    ctaText: z.string().trim(),
    ctaUrl: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (!!value.ctaText !== !!value.ctaUrl)
      ctx.addIssue({
        code: 'custom',
        message: 'יש להזין גם טקסט וגם קישור לקריאה לפעולה',
      });
    if (value.ctaUrl) {
      try {
        if (!['http:', 'https:'].includes(new URL(value.ctaUrl).protocol))
          throw new Error();
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'יש להזין קישור HTTP או HTTPS תקין',
        });
      }
    }
  });

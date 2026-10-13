import { z } from 'zod';
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

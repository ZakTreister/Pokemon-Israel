import { z } from 'zod';
export const teamPlayerEditSchema = z.object({
  firstName: z.string().trim().min(1, 'שם פרטי הוא חובה').max(50),
  lastName: z.string().trim().min(1, 'שם משפחה הוא חובה').max(50),
  city: z.string().trim().max(100),
  playerNumber: z.string().trim(),
});
export const teamPlayerCreateSchema = teamPlayerEditSchema.extend({
  playerNumber: z.string().trim().min(1, 'מספר שחקן הוא חובה'),
});

import { z } from 'zod';
export const normalizePokemon = (name: string) =>
  name.trim().replace(/ +/g, ' ');
export const pokemonImageUrl = (name: string) =>
  `https://r2.limitlesstcg.net/pokemon/gen9/${normalizePokemon(name).toLowerCase().replace(/ /g, '-')}.png`;
const dateOnly = z.string().refine(
  (value) =>
    !value ||
    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value &&
      value <=
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jerusalem',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date())),
  'יש להזין תאריך תקין שאינו בעתיד',
);
export const playerEditSchema = z.object({
  firstName: z.string().trim().min(1, 'שם פרטי הוא חובה').max(50),
  lastName: z.string().trim().min(1, 'שם משפחה הוא חובה').max(50),
  city: z.string().trim().max(100),
  isActive: z.boolean(),
  playerNumber: z.string().trim(),
  description: z.string().max(500, 'התיאור מוגבל ל-500 תווים'),
  dateOfBirth: dateOnly,
  joinedAt: dateOnly,
  pokemon: z
    .array(
      z
        .string()
        .transform(normalizePokemon)
        .pipe(
          z
            .string()
            .regex(
              /^[A-Za-z ]+$/,
              'שמות פוקימונים: אותיות באנגלית ורווחים בלבד',
            ),
        ),
    )
    .max(6, 'ניתן להוסיף עד 6 פוקימונים'),
});

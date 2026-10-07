import type { RequestError } from '../types/api';
export function requestError(error: unknown) {
  const value = error as RequestError;
  const message = value?.response?.data?.message;
  if (typeof message === 'string' && /[א-ת]/.test(message)) return message;
  if (!value?.response)
    return 'לא הצלחנו להתחבר לשרת. בדקו את החיבור ונסו שוב. אם ניסיתם לשמור שינוי, רעננו כדי לבדוק אם נשמר לפני ניסיון נוסף.';
  return 'הפעולה לא הושלמה. נסו שוב; אם הבעיה נמשכת, פנו למנהל הליגה.';
}

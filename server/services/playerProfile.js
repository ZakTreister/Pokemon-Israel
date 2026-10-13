import { fail } from '../utils/httpError.js';
export function calendarDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type) => parts.find((p) => p.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function validateBirthDate(value, today = calendarDate()) {
  if (value === null || value === '') return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail(400, 'תאריך לידה חייב להיות תאריך תקין');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value ||
    value > today
  )
    fail(400, 'תאריך לידה חייב להיות תאריך תקין שאינו בעתיד');
  return value;
}
export function profileFields(input) {
  const fields = {};
  if (input.description !== undefined) {
    if (typeof input.description !== 'string' || input.description.length > 500)
      fail(400, 'התיאור מוגבל ל-500 תווים');
    fields.description = input.description.trim();
  }
  if (input.dateOfBirth !== undefined)
    fields.dateOfBirth = validateBirthDate(input.dateOfBirth);
  return fields;
}
export function playerAge(dateOfBirth, today = calendarDate()) {
  if (!dateOfBirth) return undefined;
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  const [currentYear, currentMonth, currentDay] = today.split('-').map(Number);
  return (
    currentYear -
    year -
    (currentMonth < month || (currentMonth === month && currentDay < day)
      ? 1
      : 0)
  );
}

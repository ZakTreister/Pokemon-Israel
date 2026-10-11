// A display attribute, not an identity key: no numeric range or uniqueness rule.
export function playerNumber(value, required = false) {
  if (value === undefined || value === null) {
    if (!required) return '';
  } else if (typeof value === 'string' && (value.trim() || !required))
    return value.trim();
  const error = new Error('יש להזין מספר שחקן כטקסט');
  error.statusCode = 400;
  throw error;
}

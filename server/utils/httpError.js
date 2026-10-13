export function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

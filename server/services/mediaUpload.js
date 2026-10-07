import { createHash, randomUUID } from 'node:crypto';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};
export function validateImage(buffer, mime) {
  if (
    !Buffer.isBuffer(buffer) ||
    !buffer.length ||
    buffer.length > MAX_IMAGE_BYTES
  )
    fail(400, 'יש לבחור תמונה עד 5MB');
  const actual = buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? 'image/png'
    : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
      ? 'image/jpeg'
      : buffer.subarray(0, 4).toString() === 'RIFF' &&
          buffer.subarray(8, 12).toString() === 'WEBP'
        ? 'image/webp'
        : null;
  if (!actual || actual !== mime)
    fail(400, 'ניתן להעלות PNG, JPEG או WebP בלבד');
}
export async function uploadImage(buffer, mime, transport = fetch) {
  validateImage(buffer, mime);
  const {
    CLOUDINARY_CLOUD_NAME: cloud,
    CLOUDINARY_API_KEY: key,
    CLOUDINARY_API_SECRET: secret,
  } = process.env;
  if (!cloud || !key || !secret || !/^[a-z\d_-]+$/i.test(cloud))
    fail(503, 'העלאת תמונות אינה מוגדרת עדיין. יש לפנות למנהל המערכת');
  const params = {
    folder: 'cardschool',
    public_id: randomUUID(),
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const signature = createHash('sha1')
    .update(
      Object.entries(params)
        .map(([name, value]) => `${name}=${value}`)
        .join('&') + secret,
    )
    .digest('hex');
  const form = new FormData();
  for (const [name, value] of Object.entries(params)) form.append(name, value);
  form.append('api_key', key);
  form.append('signature', signature);
  form.append('file', new Blob([buffer], { type: mime }), 'image');
  let response, result;
  try {
    response = await transport(
      `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
      { method: 'POST', body: form, signal: AbortSignal.timeout(20000) },
    );
    result = await response.json();
  } catch {
    fail(502, 'העלאת התמונה נכשלה. נסו שוב');
  }
  if (
    !response.ok ||
    result.resource_type !== 'image' ||
    !result.public_id ||
    typeof result.secure_url !== 'string' ||
    !result.secure_url.startsWith('https://res.cloudinary.com/')
  )
    fail(502, 'העלאת התמונה נכשלה. נסו שוב');
  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

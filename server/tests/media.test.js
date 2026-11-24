import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateImage,
  MAX_IMAGE_BYTES,
  uploadNamespace,
} from '../services/mediaUpload.js';
import { publicMediaUrl } from '../services/storage/mediaMetadata.js';
import { s3Storage } from '../services/storage/s3Storage.js';
const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6n4kAAAAASUVORK5CYII=',
  'base64',
);
test('image types, signatures and size limits reject unsafe or mismatched uploads', () => {
  validateImage(image, 'image/png');
  validateImage(Buffer.from([255, 216, 255, 1]), 'image/jpeg');
  validateImage(Buffer.from('RIFF0000WEBP'), 'image/webp');
  for (const [bytes, type] of [
    [Buffer.from('<svg/>'), 'image/svg+xml'],
    [image, 'image/jpeg'],
    [Buffer.alloc(MAX_IMAGE_BYTES + 1), 'image/png'],
    [Buffer.alloc(0), 'image/png'],
  ])
    assert.throws(() => validateImage(bytes, type));
});
test('purpose namespaces and CloudFront URLs never turn private media into public URLs', () => {
  assert.equal(uploadNamespace('team-logo'), 'public/teams');
  assert.equal(uploadNamespace('badge-image'), 'public/badges');
  assert.equal(uploadNamespace('player-photo', 'team'), 'public/players');
  assert.throws(() => uploadNamespace('player-photo', 'quarterly'));
  assert.equal(uploadNamespace('player-deck', 'team'), 'public/players');
  assert.equal(uploadNamespace('update-image'), 'public/updates');
  assert.throws(() => uploadNamespace('export'));
  assert.throws(() => uploadNamespace('player-photo', 'admin'));
  assert.equal(
    publicMediaUrl({ storageKey: 'private/players/123/photo.png' }),
    '',
  );
  assert.equal(
    publicMediaUrl({ storageKey: 'public/teams/123/logo.png' }),
    'https://d1grgd8g6bpbb7.cloudfront.net/teams/123/logo.png',
  );
});
test('real AWS SDK presigns a short-lived exact-key/content-type/size POST without ACL or secret credentials', async () => {
  const config = {
    AWS_REGION: 'eu-north-1',
    AWS_S3_BUCKET: 'cardschool-public-prod',
    AWS_ACCESS_KEY_ID: 'TEST_ONLY_ACCESS',
    AWS_SECRET_ACCESS_KEY: 'test-only-signing-secret',
  };
  const previous = Object.fromEntries(
    Object.keys(config).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, config);
  try {
    const signed = await s3Storage.presign({
      key: 'private/uploads/test/image.png',
      contentType: 'image/png',
      size: 123,
    });
    const policy = JSON.parse(
      Buffer.from(signed.fields.Policy, 'base64').toString(),
    );
    assert.ok(
      policy.conditions.some(
        (value) =>
          JSON.stringify(value) ===
          JSON.stringify(['content-length-range', 123, 123]),
      ),
    );
    assert.ok(
      policy.conditions.some(
        (value) =>
          JSON.stringify(value) ===
          JSON.stringify(['eq', '$Content-Type', 'image/png']),
      ),
    );
    assert.ok(
      signed.url.includes('cardschool-public-prod') &&
        signed.url.includes('eu-north-1'),
    );
    assert.equal(signed.fields.key, 'private/uploads/test/image.png');
    assert.ok(!('acl' in signed.fields));
    assert.ok(new Date(policy.expiration) - Date.now() <= 300000);
    assert.ok(!JSON.stringify(signed).includes(config.AWS_SECRET_ACCESS_KEY));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

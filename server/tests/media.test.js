import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  validateImage,
  uploadImage,
  MAX_IMAGE_BYTES,
} from '../services/mediaUpload.js';
const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6n4kAAAAASUVORK5CYII=',
  'base64',
);
test('image types, signatures and size limits reject unsafe or mismatched uploads', () => {
  validateImage(image, 'image/png');
  for (const [bytes, type] of [
    [Buffer.from('<svg/>'), 'image/svg+xml'],
    [image, 'image/jpeg'],
    [Buffer.alloc(MAX_IMAGE_BYTES + 1), 'image/png'],
    [Buffer.alloc(0), 'image/png'],
  ])
    assert.throws(() => validateImage(bytes, type));
});
test('Cloudinary upload is signed server-side and returns only reusable image metadata', async () => {
  const keys = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];
  const saved = keys.map((key) => process.env[key]);
  Object.assign(process.env, {
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  });
  try {
    const result = await uploadImage(
      image,
      'image/png',
      async (url, request) => {
        assert.equal(
          url,
          'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
        );
        const form = request.body;
        const signed = ['folder', 'public_id', 'timestamp']
          .map((key) => `${key}=${form.get(key)}`)
          .join('&');
        assert.equal(
          form.get('signature'),
          createHash('sha1')
            .update(signed + 'test-secret')
            .digest('hex'),
        );
        assert.equal(form.get('api_key'), 'test-key');
        assert.equal(form.get('api_secret'), null);
        assert.equal(form.get('file').size, image.length);
        return new Response(
          JSON.stringify({
            resource_type: 'image',
            public_id: `cardschool/${form.get('public_id')}`,
            secure_url:
              'https://res.cloudinary.com/test-cloud/image/upload/example.png',
            width: 1,
            height: 1,
            format: 'png',
          }),
        );
      },
    );
    assert.equal(result.width, 1);
    assert.equal(result.format, 'png');
    assert.ok(result.publicId);
    assert.equal(result.api_secret, undefined);
    await assert.rejects(
      uploadImage(
        image,
        'image/png',
        async () =>
          new Response(
            JSON.stringify({ error: { message: 'provider details' } }),
            { status: 400 },
          ),
      ),
      { statusCode: 502 },
    );
    delete process.env.CLOUDINARY_API_SECRET;
    await assert.rejects(uploadImage(image, 'image/png'), { statusCode: 503 });
  } finally {
    keys.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    });
  }
});

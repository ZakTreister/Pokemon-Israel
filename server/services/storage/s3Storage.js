import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const configured = () => {
  if (!process.env.AWS_S3_BUCKET) {
    const error = new Error('העלאת תמונות אינה מוגדרת. פנו למנהל המערכת');
    error.statusCode = 503;
    throw error;
  }
  const {
    AWS_ACCESS_KEY_ID: accessKeyId,
    AWS_SECRET_ACCESS_KEY: secretAccessKey,
    AWS_SESSION_TOKEN: sessionToken,
  } = process.env;
  return {
    bucket: process.env.AWS_S3_BUCKET,
    client: new S3Client({
      region: process.env.AWS_REGION || 'eu-north-1',
      ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
              ...(sessionToken ? { sessionToken } : {}),
            },
          }
        : {}),
    }),
  };
};
// Generic object operations; purpose/type/permissions belong to the media domain.
export const s3Storage = {
  async presign({ key, contentType, size }) {
    const { bucket, client } = configured();
    return createPresignedPost(client, {
      Bucket: bucket,
      Key: key,
      Expires: 300,
      Fields: { 'Content-Type': contentType },
      Conditions: [
        ['eq', '$Content-Type', contentType],
        ['content-length-range', size, size],
      ],
    });
  },
  async inspect(key) {
    const { bucket, client } = configured();
    const head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    const object = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: 'bytes=0-11',
        IfMatch: head.ETag,
      }),
    );
    return {
      etag: head.ETag,
      size: head.ContentLength,
      contentType: head.ContentType,
      prefix: Buffer.from(await object.Body.transformToByteArray()),
    };
  },
  async promote(from, to, contentType, etag) {
    const { bucket, client } = configured();
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: to,
        CopySource: `${bucket}/${from.split('/').map(encodeURIComponent).join('/')}`,
        CopySourceIfMatch: etag,
        ContentType: contentType,
        MetadataDirective: 'REPLACE',
        CacheControl: to.startsWith('public/')
          ? 'public, max-age=31536000, immutable'
          : 'private, no-store',
      }),
    );
  },
  async remove(key) {
    const { bucket, client } = configured();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
  async readUrl(key) {
    const { bucket, client } = configured();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 300 },
    );
  },
};

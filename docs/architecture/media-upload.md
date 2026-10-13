# Reusable File and Media Upload — AWS S3

## Goal
Provide one reusable upload/storage mechanism for Cardschool that is not limited to images.

The first required upload-capability consumers are:
- team logo / emblem
- child/player photo
- badge/tag image

Media is optional on all three owning entities. A team, player/child or badge may exist without an image. What is mandatory in this implementation is that the authorized management UI provides the ability to upload, replace and remove an image for each of them.

The storage abstraction must also be suitable for future file types such as PDF, spreadsheets/exports and managed documents without building a separate upload stack for each feature.

Do not build team-logo-only, badge-only or player-photo-only upload implementations.

## Provider and production topology
Use Amazon S3 as the canonical object store.

Current production resources:
- S3 bucket: `cardschool-public-prod`
- S3 region: `eu-north-1`
- the bucket remains private; S3 Block Public Access stays enabled
- public assets live under the `public/` prefix
- private assets live under the `private/` prefix
- public delivery uses CloudFront
- CloudFront domain: `https://d1grgd8g6bpbb7.cloudfront.net`
- the CloudFront S3 origin path is `/public`, so CloudFront must not expose the `private/` prefix

The bucket name contains the word `public` for historical/setup reasons; this does not mean the S3 bucket itself is public.

## Server environment
Use server-side environment variables:

- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `MEDIA_BASE_URL`

Current production non-secret values are:

- `AWS_REGION=eu-north-1`
- `AWS_S3_BUCKET=cardschool-public-prod`
- `MEDIA_BASE_URL=https://d1grgd8g6bpbb7.cloudfront.net`

Never commit AWS credentials. Never expose AWS access keys to the browser.

If the backend is later hosted on AWS, prefer an IAM role/workload identity and remove long-lived access keys from the deployment environment.

## Upload architecture
Prefer direct browser-to-S3 uploads authorized by the Cardschool backend.

Expected flow:

1. the authenticated frontend asks the Cardschool API to create an upload authorization
2. the backend checks the user's authorization and validates the requested upload purpose, content type and declared size
3. the backend creates a short-lived S3 presigned upload
4. the browser uploads the file directly to S3
5. the application persists the resulting storage metadata against the owning domain entity
6. public files are displayed through `MEDIA_BASE_URL`; private files must never be turned into permanent public URLs

Do not proxy normal file bytes through the Node/Express server when a presigned direct upload is practical.

## Generic upload API
Use a generic upload/storage API rather than a provider-specific image endpoint.

The request should identify the upload purpose, for example:

- `team-logo`
- `player-photo`
- `badge-image`

Future purposes may include documents and exports.

A presign request should carry only the metadata required to validate and authorize the upload, typically:

- purpose
- owning entity ID when the entity already exists
- original file name
- MIME/content type
- byte size

The backend chooses the final S3 key. Never trust a browser-supplied storage key or bucket name.

The implementation may use presigned PUT or presigned POST. Whichever mechanism is used must keep authorization server-side, keep the signature short-lived, and enforce/verify the allowed media type and size. If the chosen presign mechanism cannot strongly enforce size before upload, verify the uploaded object before attaching it to the domain entity and delete invalid objects.

## Storage metadata
Application/domain models must not depend on Cloudinary concepts such as `publicId`.

Use provider-neutral storage metadata. The canonical persisted identifier is the S3 object key, for example:

```ts
{
  storageKey: "public/teams/<team-id>/logo-<uuid>.webp",
  contentType: "image/webp",
  size: 123456
}
```

For public files, a display URL may be derived from `MEDIA_BASE_URL` plus the key with the leading `public/` removed.

Example:

```text
S3 key:
public/teams/123/logo-abc.webp

Public URL:
https://d1grgd8g6bpbb7.cloudfront.net/teams/123/logo-abc.webp
```

Do not treat the public URL as the canonical storage identity.

For private files, persist only the storage metadata required to authorize future access. Do not persist a permanent public URL.

Legacy Cloudinary URL/public-ID fields may remain readable during migration, but new uploads use the AWS storage representation. Migrate/clean up legacy fields intentionally rather than breaking existing records.

## Key layout
Use predictable purpose-specific prefixes while keeping generated file names opaque enough to avoid collisions.

Recommended public layout:

```text
public/
  teams/<team-id>/
  badges/<badge-id>/
  players/<player-id>/
```

Recommended private layout:

```text
private/
  players/<player-id>/
  registrations/
  documents/
  exports/
```

Never put sensitive personal identifiers such as national ID in an S3 key, file name generated by the application, object metadata or public URL.

## Required image-upload capabilities

The image itself is never a required field for team, player/child or badge creation/editing. Do not block save/creation because no image was selected.


### Team logo
- admin can upload, replace and remove a team logo
- store it under `public/teams/<team-id>/...`
- the public team DTO/UI may expose the CloudFront URL
- judges remain read-only for permanent team media

### Badge/tag image
- super-admin can upload, replace and remove the image while creating/editing a badge definition
- store it under `public/badges/<badge-id>/...`
- badge image display uses the shared media URL behavior
- do not require administrators to paste a remote image URL as the primary flow

### Child/player photo
- admin can upload, replace and remove a photo on the Player record
- this capability applies to both team players and regular/club children
- All Stars/team-player photos that are approved for the existing public player profile may use `public/players/<player-id>/...`
- regular/club child photos have no approved public profile and must not be exposed through public DTOs/pages; keep those objects private under `private/players/<player-id>/...`
- changing a player's type must not accidentally expose a previously private child photo; any visibility transition must be explicit and authorized

## Reusable frontend
Keep one reusable upload UI/service abstraction.

For image purposes it should:
- select an image from the device
- show a preview
- show uploading/progress/busy state
- allow replacement/removal
- show concise Hebrew errors
- enforce the same client-side type/size rules as a convenience, while treating backend validation as authoritative

Team, player and badge screens should reuse this component rather than implementing three different upload widgets.

The frontend should not know AWS credentials and should not construct privileged S3 operations itself.

## Image validation
For the three required image consumers, allow only approved raster image formats.

Initial supported formats:
- JPEG
- PNG
- WebP

Default maximum size:
- 5 MB per image unless a product-specific rule explicitly changes it

Validate content type and actual uploaded object/content where practical; do not rely only on file extension or browser-provided MIME type.

SVG remains disallowed for user/admin uploads unless a later security review explicitly approves sanitization/handling.

## Authorization
Backend authorization is mandatory before issuing an upload authorization.

Current product rules:
- team logo: admin only
- player/child photo: admin only
- badge/tag image: super-admin/admin authority used by the existing badge-management surface; judges may not mutate it

A presigned URL is an authorization capability. Keep it:
- short-lived
- limited to one intended key
- limited to the intended operation
- generated only after domain permission checks

## Replacement and deletion
Replacing/removing media must update the owning domain record safely.

After the new object is successfully attached:
- delete an old S3 object when it is no longer referenced and it is safe to do so
- never delete the old object before the new upload/update has succeeded
- failures in cleanup must not corrupt the domain record; cleanup may be retried/logged

Do not allow arbitrary object deletion by accepting a raw storage key from the browser without checking ownership.

## Future files
The underlying storage service must remain generic enough to add non-image purposes later.

Future file types must define their own:
- allowed MIME/types
- maximum size
- public/private visibility
- authorization rules
- retention/lifecycle behavior

Do not enable arbitrary unrestricted file uploads merely because S3 supports them.

## Cloudinary migration
Cloudinary is no longer the target provider for new uploads.

Implementation work for this version must:
- remove the Cloudinary dependency from the active upload path
- replace Cloudinary-specific server signing/upload code with AWS S3 presigning/storage logic
- replace `publicId` assumptions with provider-neutral storage keys
- preserve existing records during migration
- remove Cloudinary environment-variable requirements after no active code path depends on them

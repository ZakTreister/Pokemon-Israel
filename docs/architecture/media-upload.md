# Reusable Media Upload — Cloudinary

## Goal
Provide one reusable image-upload mechanism that can be used across the product.

Stage A requires it for team logos.
Future consumers may include:
- child/player photos
- badge images
- news/update images
- other managed content images

Do not build a team-logo-only one-off uploader.

## Provider
Use Cloudinary.

The deployment owner will provide the required Cloudinary environment variables in `.env`.

Recommended server-side environment names:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Adapt names only if the existing deployment convention requires it.

## Security
- Never expose `CLOUDINARY_API_SECRET` to the browser.
- Never commit credentials.
- Validate authenticated/authorized upload access on the backend.
- Restrict uploads to image media and reasonable file sizes/types.
- Prefer generated Cloudinary URLs/public IDs as persisted application data, not raw image bytes in MongoDB.
- If client-direct signed uploads are used, signature generation must happen on the server.
- Unsigned unrestricted upload presets must not be treated as an authorization boundary.

## Reusable application API
Create/reuse a generic media-upload service and UI component rather than embedding provider details into every feature.

The reusable result should expose enough data for consumers to persist the uploaded image, typically:
- secure URL
- Cloudinary public ID
- width/height or format when useful

## Stage A integration
At minimum, integrate the shared upload flow into team create/edit for the team logo.

Do not implement every future image-consuming feature merely because the uploader is reusable.

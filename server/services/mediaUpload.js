import { fail } from '../utils/httpError.js';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import MediaUpload from '../models/mediaUploadModel.js';
import {LEAGUE_LOGOS} from '../../shared/siteSettings.js';
import {BADGE_PROGRAM_ID} from '../models/badgeProgramModel.js';
import { s3Storage } from './storage/s3Storage.js';
import { publicMediaUrl } from './storage/mediaMetadata.js';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
export { fail } from '../utils/httpError.js';
const validId = (value) =>
  typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
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
export function uploadNamespace(purpose, playerType) {
  if (purpose === 'rich-content-image') return 'public/content-pages';
  if (purpose === 'team-logo' || purpose==='team-cover') return 'public/teams';
  if (purpose === 'update-image' || purpose === 'update-media') return 'public/updates';
  if (purpose === 'event-media') return 'public/events';
  if (purpose === 'gallery-media') return 'public/gallery';
  if (purpose === 'content-page-media') return 'public/content-pages';
  if (purpose === 'player-deck' && playerType === 'team')
    return 'public/players';
  if (LEAGUE_LOGOS.some(logo=>logo.purpose===purpose)) return 'public/site-logos';
  if (purpose === 'badge-image' || purpose === 'badge-program-image') return 'public/badges';
  if (purpose === 'player-photo' && playerType === 'team')
    return 'public/players';
  fail(400, 'מטרת העלאה לא נתמכת');
}
async function owner(purpose, id) {
  const name =
    (purpose === 'team-logo' || purpose === 'team-cover')
      ? 'Team'
      : purpose === 'event-media'
        ? 'Event'
        : purpose === 'gallery-media' ? 'Gallery'
        : purpose === 'content-page-media' ? 'ContentPage'
        : purpose === 'update-media'
          ? 'Update'
          : purpose === 'badge-image'
        ? 'BadgeDefinition'
        : purpose === 'update-image'
          ? 'Update'
          : 'Player';
  return mongoose.model(name).findById(id);
}
const storageFor = (req) => req.app.get('mediaStorage') || s3Storage;
function imageMetadata(grant) {
  return {
    storageKey: grant.storageKey,
    contentType: grant.contentType,
    size: grant.size,
  };
}
export async function presignUpload(req) {
  const { purpose, entityId, contentType, size } = req.body;
  if (
    ![
      ...LEAGUE_LOGOS.map(logo=>logo.purpose),
      'team-logo',
      'team-cover',
      'player-photo',
      'player-deck',
      'badge-image',
      'badge-program-image',
      'update-image',
      'update-media',
      'event-media',
      'content-page-media',
      'gallery-media',
      'rich-content-image',
    ].includes(purpose)
  )
    fail(400, 'מטרת העלאה לא נתמכת');
  // Video files are not supported in this release. Videos are YouTube links only.
  if (!Object.hasOwn(IMAGE_TYPES,contentType) || !Number.isInteger(size) || size<1 || size>MAX_IMAGE_BYTES)
    fail(400, 'ניתן להעלות תמונות PNG, JPEG או WebP עד 5MB בלבד. לסרטונים יש להוסיף קישור YouTube');
  let entity, id;
  const leagueLogo=LEAGUE_LOGOS.find(logo=>logo.purpose===purpose);
  if(leagueLogo){
    if(entityId!==leagueLogo.entityId)fail(400,'מזהה לוגו לא חוקי');
    id=new mongoose.Types.ObjectId(leagueLogo.entityId);
  } else if (purpose === 'badge-program-image') {
    if (entityId !== BADGE_PROGRAM_ID) fail(400, 'מזהה מערך תגים לא חוקי');
    id = new mongoose.Types.ObjectId(BADGE_PROGRAM_ID);
  } else if (purpose === 'rich-content-image') {
    if(entityId!==undefined)fail(400,'אין לשייך העלאה עצמאית לרשומה');
    id=new mongoose.Types.ObjectId();
  } else if (entityId !== undefined) {
    if (!validId(entityId)) fail(400, 'מזהה רשומה לא חוקי');
    entity = await owner(purpose, entityId);
    if (!entity) fail(404, 'הרשומה לא נמצאה');
    id = entity._id;
  } else id = new mongoose.Types.ObjectId();
  const namespace = uploadNamespace(
    purpose,
    entity?.playerType || req.body.playerType,
  );
  const uploadId = new mongoose.Types.ObjectId();
  const filename = `${randomUUID()}.${IMAGE_TYPES[contentType]}`;
  const storageKey = `${namespace}/${id}/${purpose === 'player-deck' ? 'deck/' : ''}${filename}`;
  // Unverified bytes are never publicly reachable. Promotion freezes the final
  // key so a still-valid browser authorization cannot overwrite verified media.
  const uploadKey = `private/uploads/${uploadId}/${filename}`;
  const upload = await storageFor(req).presign({
    key: uploadKey,
    contentType,
    size,
  });
  await MediaUpload.create({
    _id: uploadId,
    purpose,
    entityId: id,
    createdBy: req.user._id,
    uploadKey,
    storageKey,
    contentType,
    size,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
  return {
    uploadId: String(uploadId),
    entityId: String(id),
    upload,
    expiresIn: 300,
  };
}
export async function completeUpload(req) {
  if (!validId(req.params.id)) fail(404, 'ההעלאה לא נמצאה');
  const query = {
    _id: req.params.id,
    createdBy: req.user._id,
    expiresAt: { $gt: new Date() },
  };
  let grant = await MediaUpload.findOne(query);
  if (!grant) fail(404, 'אישור ההעלאה פג. העלו את התמונה מחדש');
  // Also reject video grants issued by an older server version.
  if (!Object.hasOwn(IMAGE_TYPES, grant.contentType)) fail(400, 'העלאת סרטונים אינה נתמכת. השתמשו בקישור YouTube');
  const storage = storageFor(req);
  if (grant.status !== 'verified') {
    grant = await MediaUpload.findOneAndUpdate(
      { ...query, status: 'pending' },
      { $set: { status: 'verifying' } },
      { new: true },
    );
    if (!grant) fail(409, 'ההעלאה נבדקת. נסו שוב בעוד רגע');
    try {
      const object = await storage.inspect(grant.uploadKey);
      if (
        object.size !== grant.size ||
        object.size > MAX_IMAGE_BYTES ||
        object.contentType !== grant.contentType
      )
        fail(400, 'קובץ התמונה אינו תואם לאישור ההעלאה');
      validateImage(object.prefix, grant.contentType);
      if (typeof object.etag !== 'string' || !object.etag)
        fail(502, 'לא הצלחנו לאמת את גרסת הקובץ. נסו להעלות שוב');
      await storage.promote(
        grant.uploadKey,
        grant.storageKey,
        grant.contentType,
        object.etag,
      );
      grant.status = 'verified';
      await grant.save();
    } catch (error) {
      if (error.statusCode === 400) {
        await storage.remove(grant.uploadKey).catch(() => {});
        await MediaUpload.deleteOne({ _id: grant._id });
      } else
        await MediaUpload.updateOne(
          { _id: grant._id, status: 'verifying' },
          { $set: { status: 'pending' } },
        );
      if (error.statusCode) throw error;
      fail(502, 'לא הצלחנו לאמת את ההעלאה. בדקו את החיבור ונסו שוב');
    }
    await storage.remove(grant.uploadKey).catch(() => {});
  }
  return {
    uploadId: grant.id,
    entityId: String(grant.entityId),
    ...imageMetadata(grant),
    url: publicMediaUrl(grant) || (await storage.readUrl(grant.storageKey)),
  };
}
export async function resolveUpload(req, purpose, id, currentMedia) {
  const field =
    purpose === 'league-kids-logo' ? 'kidsLogoUploadId'
    : purpose === 'league-all-stars-logo' ? 'allStarsLogoUploadId'
    : purpose === 'team-logo'
      ? 'logoUploadId'
      : purpose === 'team-cover'
        ? 'coverUploadId'
      : (purpose === 'badge-image' || purpose === 'badge-program-image')
        ? 'imageUploadId'
        : purpose === 'update-image'
          ? 'imageUploadId'
          : purpose === 'player-deck'
            ? 'deckUploadId'
            : 'photoUploadId';
  const value = req.body[field];
  if (value === undefined) return null;
  if (value === null) return { media: null, id };
  if (!validId(value)) fail(400, 'אישור תמונה לא חוקי');
  const grant = await MediaUpload.findOne({
    _id: value,
    purpose,
    createdBy: req.user._id,
    status: 'verified',
    expiresAt: { $gt: new Date() },
  });
  if (
    !grant ||
    (id && String(grant.entityId) !== String(id)) ||
    (grant.consumed && currentMedia?.storageKey !== grant.storageKey)
  )
    fail(400, 'התמונה אינה שייכת לרשומה או שאישור ההעלאה פג');
  if (purpose === 'player-photo' || purpose === 'player-deck') {
    const type = id
      ? (await owner(purpose, id))?.playerType
      : req.body.playerType;
    if (
      !grant.storageKey.startsWith(
        `${uploadNamespace(purpose, type)}/${grant.entityId}/`,
      )
    )
      fail(400, 'הרשאת התמונה אינה תואמת לסוג השחקן');
  }
  return {
    media: imageMetadata(grant),
    id: grant.entityId,
    grantId: grant._id,
  };
}
export async function finishAttachment(req, attachment, previous) {
  if (!attachment) return;
  if (attachment.grantId)
    await MediaUpload.updateOne(
      { _id: attachment.grantId },
      { $set: { consumed: true } },
    );
  if (
    !previous?.storageKey ||
    previous.storageKey === attachment.media?.storageKey
  )
    return;
  // Cleanup only after persistence, and only if no domain record still refers to it.
  try {
    const key = previous.storageKey;
    const referenced = await Promise.all(
      ['Team', 'Player', 'BadgeDefinition', 'Update', 'Player', 'Team', 'Event', 'Event', 'Update','ContentPage','Gallery','BadgeProgram','SiteSettings','SiteSettings'].map(
        (name, index) =>
          mongoose.models[name]?.exists({
            [`${['logoMedia', 'photoMedia', 'imageMedia', 'imageMedia', 'deckMedia', 'coverMedia', 'coverMedia', 'mediaItems.media', 'mediaItems.media','mediaItems.media','mediaItems.media','imageMedia','kidsLogoMedia','allStarsLogoMedia'][index]}.storageKey`]:
              key,
          }),
      ),
    );
    const url = publicMediaUrl(previous);
    // Historical tournament artwork stores a public URL snapshot, not a media
    // subdocument. Include soft-deleted/audit records when checking references.
    const historicalReference =
      url && mongoose.models.Tournament
        ? await mongoose.models.Tournament.collection.findOne(
            { $or: [{ image: url }, { teamLogoSnapshot: url }] },
            { projection: { _id: 1 } },
          )
        : null;
    if (!referenced.some(Boolean) && !historicalReference)
      await storageFor(req).remove(key);
  } catch {
    console.warn('Media cleanup deferred after successful attachment');
  }
}
export async function privatePlayerPhoto(req) {
  if (!validId(req.params.id)) fail(404, 'שחקן לא נמצא');
  const player = await mongoose.model('Player').findById(req.params.id);
  if (!player || player.playerType !== 'team') fail(404, 'שחקן נבחרת לא נמצא');
  return {
    url:
      publicMediaUrl(player.photoMedia) ||
      (player.photoMedia
        ? await storageFor(req).readUrl(player.photoMedia.storageKey)
        : ''),
  };
}

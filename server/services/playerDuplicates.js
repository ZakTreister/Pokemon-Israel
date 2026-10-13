import Player, { normalizeField } from '../models/playerModel.js';
export async function migratePlayerIdentityIndex() {
  const indexes = await Player.collection.indexes();
  for (const index of indexes)
    if (index.unique && index.key.normalizedClub)
      await Player.collection.dropIndex(index.name).catch((error) => {
        if (error.code !== 27) throw error;
      });
}
export async function likelyPlayers(input, playerType) {
  const query = { playerType, deletedAt: null };
  // Regex matches legacy names as well as new normalized records, without a migration prerequisite.
  const literal = (value) =>
    normalizeField(value)
      .split(' ')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+');
  for (const key of ['firstName', 'lastName', 'city'])
    query[key] = new RegExp(`^\\s*${literal(input[key] || '')}\\s*$`, 'i');
  return Player.find(query)
    .select('firstName lastName city playerType team isActive')
    .sort({ _id: 1 });
}
export async function warnDuplicate(req, res, type) {
  await migratePlayerIdentityIndex();
  const matches = await likelyPlayers(req.body, type);
  if (matches.length && req.body.allowDuplicate !== true) {
    res.status(409).json({
      code: 'PLAYER_DUPLICATE',
      message:
        'נמצא שחקן עם פרטים דומים. ערכו את השחקן הקיים או אשרו יצירה בכל זאת.',
      matches,
    });
    return true;
  }
  return false;
}

import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { fail } from '../utils/httpError.js';
// A standalone-Mongo lease serializes awards with Season close/deletion/opening.
export async function withBadgeSeasonLock(operation) {
  const locks = mongoose.connection.collection('domainLocks');
  await locks
    .updateOne(
      { _id: 'badge-season' },
      { $setOnInsert: { token: null, expiresAt: new Date(0) } },
      { upsert: true },
    )
    .catch((error) => {
      if (error.code !== 11000) throw error;
    });
  const token = randomUUID();
  let acquired = false;
  for (let i = 0; i < 80; i++) {
    const lock = await locks.findOneAndUpdate(
      {
        _id: 'badge-season',
        $or: [{ token: null }, { expiresAt: { $lte: new Date() } }],
      },
      { $set: { token, expiresAt: new Date(Date.now() + 30000) } },
      { returnDocument: 'after', includeResultMetadata: false },
    );
    if (lock?.token === token) {
      acquired = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!acquired) fail(409, 'פעולת תגים אחרת מתבצעת. נסו שוב בעוד רגע');
  try {
    return await operation();
  } finally {
    await locks.updateOne(
      { _id: 'badge-season', token },
      { $set: { token: null, expiresAt: new Date(0) } },
    );
  }
}
export async function ensureBadgeAwardIndex(Award) {
  await Award.init();
  await Award.collection.createIndex(
    { player: 1, badge: 1, season: 1 },
    {
      name: 'one_current_badge_per_player_season',
      unique: true,
      partialFilterExpression: {
        season: { $type: 'objectId' },
        revokedAt: null,
      },
    },
  );
  const indexes = await Award.collection.indexes();
  for (const index of indexes) {
    if (
      index.unique &&
      Object.keys(index.key).length === 2 &&
      index.key.player === 1 &&
      index.key.badge === 1
    )
      await Award.collection.dropIndex(index.name).catch((error) => {
        if (error.codeName !== 'IndexNotFound') throw error;
      });
  }
}

export async function ensureSeasonIndex(Season) {
  await Season.init();
  await Season.collection.createIndex(
    { status: 1 },
    {
      name: 'one_active_badge_season',
      unique: true,
      partialFilterExpression: { status: 'active', deletedAt: null },
    },
  );
  for (const index of await Season.collection.indexes()) {
    if (
      index.name !== 'one_active_badge_season' &&
      index.unique &&
      Object.keys(index.key).length === 1 &&
      index.key.status === 1
    )
      await Season.collection.dropIndex(index.name).catch((error) => {
        if (error.codeName !== 'IndexNotFound') throw error;
      });
  }
}

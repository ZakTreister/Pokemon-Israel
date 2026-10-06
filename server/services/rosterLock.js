import { randomUUID } from "node:crypto";
import Team from "../models/teamModel.js";

// Shared by assignment, activation and deactivation. Ordered document locks keep
// cross-team operations safe on standalone MongoDB without transactions.
export async function withRosterLocks(teamIds, operation) {
  const ids = [...new Set(teamIds.filter(Boolean).map(String))].sort();
  const token = randomUUID();
  const held = [];
  try {
    for (const id of ids) {
      const team = await Team.findOneAndUpdate(
        {
          _id: id,
          $or: [
            { "rosterLock.token": { $exists: false } },
            { "rosterLock.expiresAt": { $lte: new Date() } },
          ],
        },
        {
          $set: {
            rosterLock: { token, expiresAt: new Date(Date.now() + 60000) },
          },
        },
        { new: true },
      );
      if (!team) {
        const err = new Error(
          "הנבחרת השתנתה או נמצאת בעדכון. נא לרענן ולנסות שוב",
        );
        err.statusCode = 409;
        throw err;
      }
      held.push(id);
    }
    return await operation();
  } finally {
    if (held.length)
      await Team.updateMany(
        { _id: { $in: held }, "rosterLock.token": token },
        { $unset: { rosterLock: 1 } },
      );
  }
}

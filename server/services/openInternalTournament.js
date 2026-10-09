export const OPEN_INTERNAL_FILTER = {
  deletedAt: null,
  engineVersion: 'swiss-v1',
  type: 'team_internal',
  source: 'live',
  status: 'upcoming',
  phase: { $in: ['setup', 'running', null] },
};

// Install the replacement before retiring the pre-soft-delete index. This is
// idempotent and awaited by creation, including in existing deployments.
export async function ensureOpenTournamentIndex(Tournament) {
  await Tournament.init();
  const indexes = await Tournament.collection.indexes();
  if (
    !indexes.some((index) => index.name === 'one_open_internal_per_team_active')
  ) {
    await Tournament.collection.createIndex(
      { team: 1 },
      {
        name: 'one_open_internal_per_team_active',
        unique: true,
        partialFilterExpression: OPEN_INTERNAL_FILTER,
      },
    );
  }
  if (indexes.some((index) => index.name === 'one_open_internal_per_team')) {
    await Tournament.collection
      .dropIndex('one_open_internal_per_team')
      .catch((error) => {
        if (error.codeName !== 'IndexNotFound') throw error;
      });
  }
}

export const OPEN_INTERNAL_FILTER = {
  engineVersion: 'swiss-v1',
  type: 'team_internal',
  source: 'live',
  status: 'upcoming',
  phase: { $in: ['setup', 'running', null] },
};

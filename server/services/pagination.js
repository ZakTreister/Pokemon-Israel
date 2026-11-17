import { clubDateKey } from '../../shared/tournamentDomain.js';
export const escapeSearch = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export async function paginate(Model, query, params, configure = (q) => q) {
  const requested = Math.max(1, Number.parseInt(params.page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(params.pageSize, 10) || 25),
  );
  const total = await Model.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requested, totalPages);
  const items =
    params.countOnly === 'true'
      ? []
      : await configure(Model.find(query))
          .skip((page - 1) * pageSize)
          .limit(pageSize);
  return { items, total, page, pageSize, totalPages };
}
export function tournamentQuery(params, now = new Date()) {
  const clauses = [];
  if (params.teamId) clauses.push({ team: params.teamId });
  if (['quarterly', 'team_internal', 'inter_team'].includes(params.type))
    clauses.push(
      params.type === 'quarterly'
        ? { $or: [{ type: 'quarterly' }, { type: null }] }
        : { type: params.type },
    );
  const completed = { $or: [{ status: 'completed' }, { phase: 'completed' }] };
  if (params.status === 'completed') clauses.push(completed);
  if (['active', 'upcoming'].includes(params.status)) {
    clauses.push({ $nor: completed.$or });
    const active = params.status === 'active';
    const previousNonClub = active
      ? { $or: [
          { phase: 'running' },
          { phase: { $nin: ['running', 'setup'] }, date: { $lte: now } },
        ] }
      : { $or: [
          { phase: 'setup' },
          { phase: { $nin: ['running', 'setup'] }, date: { $gt: now } },
        ] };
    // All club events are date-only. A same-day event must not switch from
    // upcoming to active merely because the synthetic stored hour has passed.
    const clubSelector = {
      type: { $in: [null, 'quarterly'] },
      engineVersion: { $ne: 'swiss-v1' },
    };
    clauses.push({ $or: [
      {
        $and: [
          clubSelector,
          { $expr: {
            [active ? '$lt' : '$gte']: [
              { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Jerusalem' } },
              clubDateKey(now),
            ],
          } },
        ],
      },
      { $and: [
        { $nor: [clubSelector] },
        previousNonClub,
      ] },
    ] });
  }
  if (params.search?.trim()) {
    const regex = new RegExp(escapeSearch(params.search.trim()), 'i');
    clauses.push({
      $or: ['title', 'location', 'teamNameSnapshot'].map((key) => ({
        [key]: regex,
      })),
    });
  }
  return clauses.length ? { $and: clauses } : {};
}

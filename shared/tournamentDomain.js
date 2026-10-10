export const tournamentTypes = {
  quarterly: 'חוגים / ליגה ישראלית',
  team_internal: 'פנימי בנבחרת',
  inter_team: 'בין נבחרות',
};
export const tournamentStatuses = {
  upcoming: 'עתידי',
  active: 'בתהליך',
  completed: 'הסתיים',
};
export function tournamentLifecycle(t, now = new Date()) {
  if (t.status === 'completed' || t.phase === 'completed') return 'completed';
  if (t.phase === 'running') return 'active';
  if (t.phase === 'setup') return 'upcoming';
  return new Date(t.date) <= now ? 'active' : 'upcoming';
}
export function filterTournaments(rows, filters) {
  const search = filters.search.trim().toLocaleLowerCase();
  return rows.filter(
    (t) =>
      (!filters.status || t.lifecycle === filters.status) &&
      (!filters.type || (t.type || 'quarterly') === filters.type) &&
      (!search ||
        [t.title, t.location, t.teamNameSnapshot].some((value) =>
          value?.toLocaleLowerCase().includes(search),
        )),
  );
}

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
// Event dates are calendar days in Israel, not times of day.
export function clubDateKey(value) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const part = type => parts.find(entry => entry.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function isClubTournament(t) {
  return t.type === 'quarterly' || t.type == null;
}
export function clubRegistrationOpen(t, now = new Date()) {
  return isClubTournament(t) && t.status === 'upcoming' &&
    t.phase !== 'running' && t.phase !== 'completed' &&
    t.engineVersion !== 'swiss-v1' &&
    clubDateKey(t.date) >= clubDateKey(now);
}
export function tournamentLifecycle(t, now = new Date()) {
  if (t.status === 'completed' || t.phase === 'completed') return 'completed';
  if (t.phase === 'running') return 'active';
  if (t.phase === 'setup') return 'upcoming';
  if (isClubTournament(t))
    return clubDateKey(t.date) < clubDateKey(now) ? 'active' : 'upcoming';
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

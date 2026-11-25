import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { publicTournaments, type PublicTournamentSummary } from '../../../services/publicTournaments';
import type { Team } from '../../../types/team';
import type { PageResult } from '../../../types/pagination';
import { requestError } from '../../../utils/requestError';

const pageSize = 3;

export default function WeeklyTrainingResults({ teams, favoriteId }: { teams: Team[]; favoriteId: string | null }) {
  const defaultFilter = teams.some(team => team.id === favoriteId) ? favoriteId! : 'all';
  return <TrainingSection key={defaultFilter} teams={teams} defaultFilter={defaultFilter}/>;
}

function TrainingSection({ teams, defaultFilter }: { teams: Team[]; defaultFilter: string }) {
  const [filter, setFilter] = useState(defaultFilter);
  return <section><Card variant="public" className="space-y-3 p-4 sm:p-6">
    <div className="flex flex-wrap justify-between gap-3">
      <h2 className="text-2xl font-extrabold">תוצאות האימונים השבועיים</h2>
      <select aria-label="סינון לפי נבחרת" className="p-2 border rounded-md bg-card" value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="all">כל הנבחרות</option>
        {teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}
      </select>
    </div>
    <TrainingList key={filter} filter={filter} teams={teams}/>
    <p className="text-sm text-muted-foreground">תוצאות אלה קובעות את הדירוג בתוך כל נבחרת, בנפרד מטבלת הנבחרות.</p>
  </Card></section>;
}

function TrainingList({ filter, teams }: { filter: string; teams: Team[] }) {
  const [data, setData] = useState<PageResult<PublicTournamentSummary> | null>(null);
  const [requestedPage, setRequestedPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    publicTournaments.list({ type: 'team_internal', status: 'completed', page: requestedPage, pageSize, ...(filter !== 'all' ? { teamId: filter } : {}) })
      .then(result => {
        if (!active) return;
        setData(previous => {
          const items = requestedPage === 1 ? [] : previous?.items ?? [];
          const seen = new Set(items.map(item => item.id));
          return { ...result, items: [...items, ...result.items.filter(item => !seen.has(item.id))] };
        });
      })
      .catch(e => { if (active) setError(requestError(e)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [filter, requestedPage, retry]);

  return <>
    {data?.items.map(t => <article key={t.id} className="border rounded-lg p-4 flex gap-2 justify-between items-center">
      <div><strong>{t.title}</strong><p className="text-sm text-muted-foreground">{teams.find(team => team.id === t.team)?.name || t.teamNameSnapshot || ''} · {new Date(t.date).toLocaleDateString('he-IL')}</p></div>
      <Link className="text-blue-500 font-bold" to={'/tournaments/' + t.id}>לתוצאות ←</Link>
    </article>)}
    {busy && <p role="status">טוען אימונים...</p>}
    {error && <div role="alert" className="space-y-2"><p className="text-destructive">{error}</p><Button variant="outline" onClick={() => { setBusy(true); setRetry(value => value + 1); }}>נסה שוב</Button></div>}
    {!busy && !error && data?.items.length === 0 && <p>אין טורנירים להצגה.</p>}
    {!error && data && data.page < data.totalPages && <div className="flex justify-center"><Button variant="outline" disabled={busy} onClick={() => { setBusy(true); setRequestedPage(data.page + 1); }}>{busy ? 'טוען...' : 'עוד'}</Button></div>}
  </>;
}

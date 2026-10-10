import {
  tournamentTypes as types,
  tournamentStatuses as statuses,
  filterTournaments,
} from '../../../shared/tournamentDomain';
import TournamentFilters from '../../features/tournaments/components/TournamentFilters';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAppSelector } from '../../hooks/redux';
import { requestError } from '../../utils/requestError';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import Button from '../../components/ui/Button';
interface Entry {
  id: string;
  title: string;
  location?: string;
  date: string;
  type: 'quarterly' | 'team_internal' | 'inter_team';
  lifecycle: 'upcoming' | 'active' | 'completed';
  engineVersion?: string;
  teamNameSnapshot?: string;
  canManage: boolean;
}
export default function ManageTournaments() {
  const { user } = useAppSelector((state) => state.auth);
  const { showConfirm } = useConfirm();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [filters, setFilters] = useState({ status: '', type: '', search: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setEntries((await api.get<Entry[]>('/api/tournaments/management')).data);
  }, []);
  useEffect(() => {
    load().catch((e) => setError(requestError(e)));
  }, [load]);
  const remove = async (entry: Entry) => {
    let permanent = false;
    if (
      !(await showConfirm({
        title: 'מחיקת טורניר',
        message: `למחוק את "${entry.title}"? הטורניר יוסתר והניקוד יוסר מהדירוגים. מחיקה לצמיתות מסירה גם את כל המידע ולא ניתנת לביטול.`,
        confirmText: 'מחק',
        permanentDelete: (checked) => {
          permanent = checked;
        },
        variant: 'destructive',
      }))
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/api/tournaments/${entry.id}`, {
        params: { permanent },
      });
      await load();
    } catch (e) {
      setError(requestError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">טורנירים</h2>
      <div className="flex flex-wrap gap-3">
        {user?.role === 'admin' && (
          <Button asChild>
            <Link to="/manage/tournaments/regular">צור טורניר חוגים</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/manage/teams">פתח טורניר מעמוד נבחרת</Link>
        </Button>
        {user?.role === 'admin' && (
          <details>
            <summary className="cursor-pointer font-bold p-2">
              עוד פעולות
            </summary>
            <Button contextual disabled variant="outline">
              ייבוא היסטוריית חוגים מ־Excel · בקרוב
            </Button>
            <p className="text-sm text-muted-foreground p-2">
              ייבוא כחמש שנות תוצאות חוגים ייפתח לאחר קבלת הקובץ. טורניר פנימי
              היסטורי מזינים מעמוד הנבחרת.
            </p>
          </details>
        )}
      </div>
      <TournamentFilters value={filters} onChange={setFilters} />
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {entries === null ? (
        <p>טוען טורנירים...</p>
      ) : (
        <div className="space-y-3">
          {filterTournaments(entries, filters).map((t) => (
            <div
              key={t.id}
              className="border rounded-lg p-4 flex flex-wrap gap-3 items-center justify-between"
            >
              <div>
                <h3 className="font-bold">{t.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {types[t.type]} · {statuses[t.lifecycle]} ·{' '}
                  {new Date(t.date).toLocaleDateString('he-IL')}
                  {t.teamNameSnapshot ? ` · ${t.teamNameSnapshot}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link
                    to={
                      t.canManage
                        ? t.engineVersion === 'swiss-v1'
                          ? `/manage/tournaments/${t.id}`
                          : `/manage/tournaments/regular/${t.id}`
                        : `/tournaments/${t.id}`
                    }
                  >
                    {t.canManage ? 'ניהול טורניר' : 'פרטים ותוצאות'}
                  </Link>
                </Button>
                {user?.role === 'admin' && (
                  <details>
                    <summary className="cursor-pointer font-bold p-2">
                      עוד פעולות
                    </summary>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void remove(t)}
                    >
                      מחק
                    </Button>
                  </details>
                )}
              </div>
            </div>
          ))}
          {!filterTournaments(entries, filters).length && (
            <p>אין טורנירים בסינון זה.</p>
          )}
        </div>
      )}
    </div>
  );
}

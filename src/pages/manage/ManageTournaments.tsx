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
  date: string;
  type: 'quarterly' | 'team_internal' | 'inter_team';
  lifecycle: 'upcoming' | 'active' | 'completed';
  engineVersion?: string;
  teamNameSnapshot?: string;
  canManage: boolean;
}
const types = {
  quarterly: 'חוגים / ליגה ישראלית',
  team_internal: 'פנימי בנבחרת',
  inter_team: 'בין נבחרות',
};
const statuses = { upcoming: 'עתידי', active: 'בתהליך', completed: 'הסתיים' };
export default function ManageTournaments() {
  const { user } = useAppSelector((state) => state.auth);
  const { showConfirm } = useConfirm();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setEntries((await api.get<Entry[]>('/api/tournaments/management')).data);
  }, []);
  useEffect(() => {
    load().catch((e) => setError(requestError(e)));
  }, [load]);
  const remove = async (entry: Entry) => {
    if (
      !(await showConfirm({
        title: 'מחיקה לצמיתות',
        message: `למחוק את "${entry.title}"? כל הסיבובים והתוצאות יימחקו והניקוד יוסר מהדירוגים. פעולה זו אינה ניתנת לביטול.`,
        confirmText: 'מחק לצמיתות',
        variant: 'destructive',
      }))
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/api/tournaments/${entry.id}`);
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
          <Button disabled variant="outline">
            ייבוא היסטוריית חוגים מ־Excel · בקרוב
          </Button>
        )}
      </div>
      {user?.role === 'admin' && (
        <p className="text-sm text-muted-foreground">
          ייבוא כחמש שנות תוצאות חוגים ייפתח לאחר קבלת הקובץ. טורניר פנימי
          היסטורי מזינים מעמוד הנבחרת.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          מצב
          <select
            className="block w-full p-2 border rounded-md bg-background"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">כל המצבים</option>
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          סוג טורניר
          <select
            className="block w-full p-2 border rounded-md bg-background"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">כל הסוגים</option>
            {Object.entries(types).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {entries === null ? (
        <p>טוען טורנירים...</p>
      ) : (
        <div className="space-y-3">
          {entries
            .filter(
              (t) =>
                (!status || t.lifecycle === status) &&
                (!type || t.type === type),
            )
            .map((t) => (
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
                        t.engineVersion === 'swiss-v1'
                          ? `/manage/tournaments/${t.id}`
                          : `/tournaments/${t.id}`
                      }
                    >
                      {t.canManage ? 'ניהול טורניר' : 'פרטים ותוצאות'}
                    </Link>
                  </Button>
                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void remove(t)}
                    >
                      מחק
                    </Button>
                  )}
                </div>
              </div>
            ))}
          {!entries.some(
            (t) =>
              (!status || t.lifecycle === status) && (!type || t.type === type),
          ) && <p>אין טורנירים בסינון זה.</p>}
        </div>
      )}
    </div>
  );
}

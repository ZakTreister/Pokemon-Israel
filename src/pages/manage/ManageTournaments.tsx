import { useTournamentList } from '../../features/tournaments/hooks/useTournamentList';
import Pagination from '../../components/ui/Pagination';
import TournamentSummaryRow from '../../features/tournaments/components/TournamentSummaryRow';
import TournamentFilters from '../../features/tournaments/components/TournamentFilters';
import { useState } from 'react';
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
  canManage?: boolean;
}
export default function ManageTournaments() {
  const { user } = useAppSelector((state) => state.auth);
  const { showConfirm } = useConfirm();
  const list = useTournamentList(true);
  const entries = list.data?.items ?? null;
  const { filters, setFilters } = list;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
      await list.reload();
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
      {(error || list.error) && (
        <p role="alert" className="text-destructive">
          {error || list.error}
        </p>
      )}
      {list.loading ? (
        <p>טוען טורנירים...</p>
      ) : (
        <div className="space-y-3">
          {(entries || []).map((t) => (
            <TournamentSummaryRow
              key={t.id}
              tournament={t}
              actions={
                <>
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
                </>
              }
            />
          ))}
          {!entries?.length && <p>אין טורנירים בסינון זה.</p>}
        </div>
      )}
      {list.data && (
        <Pagination
          page={list.data.page}
          totalPages={list.data.totalPages}
          total={list.data.total}
          onChange={list.setPage}
          busy={list.loading}
        />
      )}
    </div>
  );
}

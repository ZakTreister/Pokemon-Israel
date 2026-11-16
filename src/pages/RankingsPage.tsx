import { useEffect, useState } from 'react';
import DataTable from '../components/ui/DataTable';
import Pagination from '../components/ui/Pagination';
import Badge from '../components/ui/Badge';
import { PageHero } from '../components/ui/PageHero';
import {
  getNationalRankings,
  type NationalRanking,
  type NationalRankingsResponse,
  type RankingQuery,
} from '../services/rankings';
import { requestError } from '../utils/requestError';

type SortKey = NonNullable<RankingQuery['sort']>;

export default function RankingsPage() {
  const [data, setData] = useState<NationalRankingsResponse | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [includeAllStars, setIncludeAllStars] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({
    key: 'position', descending: false,
  });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    getNationalRankings({
      search: debouncedSearch,
      includeAllStars,
      page,
      pageSize: 25,
      sort: sort.key,
      descending: sort.descending,
    })
      .then(result => {
        if (active) {
          setData(result);
          if (result.page !== page) setPage(result.page);
        }
      })
      .catch(e => {
        if (active) setError(requestError(e));
      })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [debouncedSearch, includeAllStars, page, sort.key, sort.descending]);

  return (
    <div>
      <PageHero
        title="הליגה הישראלית"
        highlightWord="הישראלית"
        subtitle="הדירוג הארצי המצטבר של שחקני החוגים — לאורך כל שנות הפעילות"
      />
      <div className="container py-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block font-bold sm:flex-1 sm:max-w-md">
            חיפוש שחקן
            <input
              type="search"
              className="block w-full mt-2 p-3 border rounded-lg bg-card"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="שם שחקן"
            />
          </label>
          <label className="inline-flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={includeAllStars}
              onChange={e => { setIncludeAllStars(e.target.checked); setPage(1); }}
            />
            <span>הצג שחקני All-Stars</span>
          </label>
        </div>
        {error && <p role="alert" className="text-destructive mb-4">{error}</p>}
        {data === null && busy ? (
          <p role="status">טוען דירוג...</p>
        ) : (
          <div aria-busy={busy}>
            <DataTable<NationalRanking>
              headerClassName="bg-navy-700 text-white"
              rows={data?.rankings ?? []}
              rowKey={row => row.playerId}
              rowClassName={row => row.isAllStars ? 'bg-slate-100/70 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300' : ''}
              externalSort={{
                key: sort.key,
                descending: sort.descending,
                onChange: (key, descending) => {
                  setSort({ key: key as SortKey, descending });
                  setPage(1);
                },
              }}
              columns={[
                { key: 'position', label: 'מקום', value: row => row.position },
                {
                  key: 'playerName', label: 'שחקן', value: row => row.playerName,
                  render: row => (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span>{row.playerName}</span>
                      {row.isAllStars && <Badge variant="neutral">All-Stars</Badge>}
                    </span>
                  ),
                },
                { key: 'points', label: 'נקודות', value: row => row.points },
                { key: 'tournaments', label: 'השתתפויות', value: row => row.tournaments },
              ]}
            />
            {data && (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                busy={busy}
                onChange={setPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
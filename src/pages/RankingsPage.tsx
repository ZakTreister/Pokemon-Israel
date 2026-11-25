import { useEffect, useState } from 'react';
import DataTable from '../components/ui/DataTable';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import RankingPodium from '../components/rankings/RankingPodium';
import { eventsService } from '../services/events';
import type { EventSummary } from '../types/event';
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
  const [leaders,setLeaders]=useState<NationalRanking[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [includeAllStars, setIncludeAllStars] = useState(false);
  const [nextEvent,setNextEvent] = useState<EventSummary | undefined>();
  const [moreBusy,setMoreBusy] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({
    key: 'position', descending: false,
  });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(()=>{
    let active=true;
    getNationalRankings({pageSize:3,sort:'position'}).then(r=>{if(active)setLeaders(r.rankings)}).catch(()=>{});
    eventsService.list({category:'club',pageSize:100}).then(r=>{
      const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      if(active)setNextEvent(r.items.filter(e=>e.startDate && e.startDate.slice(0,10)>=today).sort((a,b)=>a.startDate!.localeCompare(b.startDate!))[0]);
    }).catch(()=>{});
    return ()=>{active=false};
  },[]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    setData(null);
    getNationalRankings({
      search: debouncedSearch,
      includeAllStars,
      offset: 0,
      pageSize: 25,
      sort: sort.key,
      descending: sort.descending,
    })
      .then(result => {
        if (active) {
          setData(result);

        }
      })
      .catch(e => {
        if (active) setError(requestError(e));
      })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [debouncedSearch, includeAllStars, sort.key, sort.descending]);

  const loadMore = async () => {
    if (!data || moreBusy || busy) return;
    setMoreBusy(true);
    setError('');
    const current = data;
    try {
      const result = await getNationalRankings({search:debouncedSearch,includeAllStars,offset:current.rankings.length,pageSize:25,sort:sort.key,descending:sort.descending});
      setData(previous=>previous===current?{...result,rankings:[...current.rankings,...result.rankings]}:previous);
    } catch(e) { setError(requestError(e)); }
    finally { setMoreBusy(false); }
  };

  return (
    <div>
      <PageHero
        title="הליגה הישראלית"
        highlightWord="הישראלית"
        subtitle="הדירוג הארצי המצטבר של שחקני החוגים — לאורך כל שנות הפעילות"
      />
      <div className="container py-12">
        <section className="mb-7"><h2 className="text-xl font-extrabold mb-3">מובילי הדירוג הארצי</h2><RankingPodium leaders={leaders}/></section>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block font-bold sm:flex-1 sm:max-w-md">
            איפה אתם בדירוג? חפשו את השם שלכם
            <input
              type="search"
              className="block w-full mt-2 p-3 border rounded-lg bg-card"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="שם שחקן"
            />
          </label>
          <label className="inline-flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={includeAllStars}
              onChange={e => setIncludeAllStars(e.target.checked)}
            />
            <span>הצג שחקני All-Stars</span>
          </label>
        </div>
        <details className="mb-6 border rounded-lg p-4"><summary className="font-bold cursor-pointer">איך צוברים נקודות?</summary><p className="mt-3">הנקודות בדירוג הארצי מצטברות מטורנירי החוגים. צבירת הנקודות תהיה באירוע הבא.</p>{nextEvent&&<Button asChild variant="outline" className="mt-3"><Link to={'/events/'+nextEvent.id}>{nextEvent.title}</Link></Button>}</details>
        {!!data?.topMovers?.length&&<section className="cs-public-card p-4 mb-6"><h2 className="font-bold text-lg mb-2">העלייה הגדולה בדירוג</h2><div className="flex flex-wrap gap-3">{data.topMovers.map(row=><span key={row.playerId} className="font-bold">{row.playerName} <span className="text-emerald-600">↑ {row.rankChange} מקומות</span></span>)}</div></section>}
        {error && <p role="alert" className="text-destructive mb-4">{error}</p>}
        {data === null && busy ? (
          <p role="status">טוען דירוג...</p>
        ) : (
          <div aria-busy={busy}>
            <DataTable<NationalRanking>
              headerClassName="bg-navy-700 text-white"
              rows={data?.rankings ?? []}
              rowKey={row => row.playerId}
              rowClassName={row => data?.topMovers?.some(m=>m.playerId===row.playerId) ? 'bg-emerald-50 dark:bg-emerald-950/40' : row.isAllStars ? 'bg-slate-100/70 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300' : ''}
              externalSort={{
                key: sort.key,
                descending: sort.descending,
                onChange: (key, descending) => {
                  setSort({ key: key as SortKey, descending });
                },
              }}
              columns={[
                { key: 'position', label: 'מקום', value: row => row.position },
                {
                  key: 'playerName', label: 'שחקן', value: row => row.playerName,
                  render: row => (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span>{row.playerName}</span>
                      {data?.topMovers?.some(m=>m.playerId===row.playerId)&&<span className="text-emerald-600 font-bold">↑ {row.rankChange}</span>}
                      {row.isAllStars && <Badge variant="neutral">All-Stars</Badge>}
                    </span>
                  ),
                },
                { key: 'points', label: 'נקודות', value: row => row.points },
                { key: 'tournaments', label: 'השתתפויות', value: row => row.tournaments },
              ]}
            />
            {data && data.rankings.length<data.total && <div className="flex justify-center mt-4"><Button variant="outline" disabled={busy||moreBusy} onClick={()=>void loadMore()}>{moreBusy?'טוען...':'עוד'}</Button></div>}
          </div>
        )}

      </div>
    </div>
  );
}
import { Link } from 'react-router-dom';
import { useTournamentList } from '../features/tournaments/hooks/useTournamentList';
import Pagination from '../components/ui/Pagination';
import TournamentSummaryRow from '../features/tournaments/components/TournamentSummaryRow';
import TournamentFilters from '../features/tournaments/components/TournamentFilters';
import { PageHero } from '../components/ui/PageHero';
import Button from '../components/ui/Button';
export default function TournamentsPage() {
  const list = useTournamentList();
  const { filters, setFilters, error } = list;
  const rows = list.data?.items;
  const displayed = rows || [];
  return (
    <div>
      <PageHero
        title="אירועים"
        highlightWord="אירועים"
        subtitle="כל הטורנירים של הליגה — אירועים קרובים, בתהליך ותוצאות סופיות"
      />
      <div className="container py-12 space-y-6">
        <TournamentFilters value={filters} onChange={setFilters} />
        {error && <p role="alert">{error}</p>}
        {list.loading && !error ? (
          <p role="status">טוען טורנירים...</p>
        ) : (
          <div className="space-y-3">
            {displayed.map((t) => (
              <TournamentSummaryRow
                key={t.id}
                tournament={t}
                actions={
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/tournaments/${t.id}`}>
                      {t.canRegister
                        ? 'פרטים והרשמה'
                        : t.lifecycle === 'upcoming'
                          ? 'פרטים'
                          : 'תוצאות הטורניר'}
                    </Link>
                  </Button>
                }
              />
            ))}
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
        {rows && !displayed.length && <p>אין טורנירים בסינון זה.</p>}
      </div>
    </div>
  );
}

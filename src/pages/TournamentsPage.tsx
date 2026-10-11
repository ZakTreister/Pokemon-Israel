import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  publicTournaments,
  type PublicTournamentSummary,
} from '../services/publicTournaments';
import { filterTournaments } from '../../shared/tournamentDomain';
import TournamentSummaryRow from '../features/tournaments/components/TournamentSummaryRow';
import TournamentFilters from '../features/tournaments/components/TournamentFilters';
import { PageHero } from '../components/ui/PageHero';
import Button from '../components/ui/Button';
import { requestError } from '../utils/requestError';
export default function TournamentsPage() {
  const [rows, setRows] = useState<PublicTournamentSummary[] | null>(null);
  const [filters, setFilters] = useState({ status: '', type: '', search: '' });
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    publicTournaments
      .list()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const displayed = filterTournaments(rows || [], filters);
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
        {!rows && !error ? (
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
        {rows && !displayed.length && <p>אין טורנירים בסינון זה.</p>}
      </div>
    </div>
  );
}

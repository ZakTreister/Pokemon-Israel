import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  publicTournaments,
  type PublicTournamentSummary,
} from '../services/publicTournaments';
import {
  filterTournaments,
  tournamentTypes,
  tournamentStatuses,
} from '../../shared/tournamentDomain';
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
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {displayed.map((t) => (
              <article key={t.id} className="cs-public-card overflow-hidden">
                <img
                  src={t.image}
                  alt=""
                  className="w-full h-40 object-cover"
                />
                <div className="p-5 space-y-3">
                  <h2 className="text-xl font-bold">
                    <Link to={`/tournaments/${t.id}`}>{t.title}</Link>
                  </h2>
                  <p>
                    {tournamentTypes[t.type]} ·{' '}
                    {tournamentStatuses[t.lifecycle]}
                  </p>
                  <p>
                    {new Date(t.date).toLocaleDateString('he-IL')} ·{' '}
                    {t.location}
                  </p>
                  {t.teamNameSnapshot && <p>{t.teamNameSnapshot}</p>}
                  <p>{t.currentParticipants} משתתפים</p>
                  <Button asChild variant="outline">
                    <Link to={`/tournaments/${t.id}`}>
                      {t.canRegister
                        ? 'פרטים והרשמה'
                        : t.lifecycle === 'upcoming'
                          ? 'פרטי הטורניר'
                          : 'תוצאות הטורניר'}
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
        {rows && !displayed.length && <p>אין טורנירים בסינון זה.</p>}
      </div>
    </div>
  );
}

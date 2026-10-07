import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { Calendar, MapPin, User, Search, Trophy } from 'lucide-react';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageHero } from '../components/ui/PageHero';
import { Tournament, TournamentParticipant } from '../types/tournament';

export default function TournamentsPage() {
  const dispatch = useAppDispatch();
  const { tournaments, isLoading } = useAppSelector((state) => state.tournaments);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    dispatch(fetchTournaments());
  }, [dispatch]);

  const isUserRegistered = (tournament: Tournament) => {
    if (!isAuthenticated || !user) return false;
    return tournament.participants.some((participant: TournamentParticipant) => {
      if (typeof participant.user === 'string') {
        return participant.user === user.id;
      } else if (participant.user && typeof participant.user === 'object') {
        return participant.user._id === user.id || participant.user.id === user.id;
      }
      return false;
    });
  };

  const isPastTournament = (tournament: Tournament) => {
    const now = new Date();
    const tournamentDate = new Date(tournament.date);
    return tournamentDate < now;
  };

  const filteredTournaments = (tournaments || []).filter((tournament) => {
    const matchesSearch = tournament.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tournament.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tournament.location.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesStatus = true;
    if (filterStatus === 'upcoming') {
      matchesStatus = tournament.status !== 'completed' && !isPastTournament(tournament);
    } else if (filterStatus === 'completed') {
      matchesStatus = isPastTournament(tournament);
    }
    return matchesSearch && matchesStatus && tournament.type !== 'team_internal';
  });

  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <div>
      <PageHero
        title="אירועים"
        highlightWord="אירועים"
        subtitle="האירועים הקרובים וארכיון הטורנירים והתוצאות של הליגה"
      />

      <div className="container py-12">
        {/* Search and Filters */}
        <div className="mb-8 rounded-lg border border-border bg-card p-4 shadow-panel">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="חפש טורנירים..."
                aria-label="חיפוש טורנירים"
                className="w-full pl-3 pr-10 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-card text-card-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
              >
                הכל
              </Button>
              <Button
                variant={filterStatus === 'upcoming' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('upcoming')}
              >
                קרובים
              </Button>
              <Button
                variant={filterStatus === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('completed')}
              >
                הסתיימו
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse text-muted-foreground">טוען טורנירים...</div>
          </div>
        ) : (
          <>
            {sortedTournaments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                <p className="text-lg text-muted-foreground mb-4">לא נמצאו טורנירים התואמים את החיפוש שלך</p>
                <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}>
                  נקה סינון
                </Button>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {sortedTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    isUserRegistered={isUserRegistered(tournament)}
                    isPast={isPastTournament(tournament)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface TournamentCardProps {
  tournament: Tournament;
  isUserRegistered: boolean;
  isPast: boolean;
}

function TournamentCard({ tournament, isUserRegistered, isPast }: TournamentCardProps) {
  const getButtonText = () => {
    if (isPast) return 'פרטים';
    if (isUserRegistered) return 'נרשמת! פרטים';
    return 'פרטים והרשמה';
  };

  const getButtonVariant: 'outline' | 'success' | 'cta' = isPast ? 'outline' : isUserRegistered ? 'success' : 'cta';

  return (
    <Card variant="public" className="group flex min-h-[370px] flex-col overflow-hidden transition-transform duration-300 motion-safe:hover:-translate-y-1.5">
      <div className="relative h-36 shrink-0 overflow-hidden bg-navy-gradient">
        <Trophy aria-hidden="true" className="absolute inset-0 m-auto h-16 w-16 text-blue-cyan/40" />
        <img
          src={tournament.image}
          alt={tournament.title}
          className="relative w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute top-3 right-3 flex gap-1.5">
          {isPast ? (
            <Badge variant="completed">הסתיים</Badge>
          ) : (
            <Badge variant="upcoming">קרוב</Badge>
          )}
          {tournament.seriesId && (
            <Badge variant="info">שבועי</Badge>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy-800/90 via-navy-700/50 to-transparent p-4">
          <h3 className="text-white text-lg font-bold">{tournament.title}</h3>
        </div>
      </div>
      <CardContent className="flex-1 pt-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar size={16} className="text-blue-400" />
            <span>{new Date(tournament.date).toLocaleDateString('he-IL')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin size={16} className="text-blue-400" />
            <span>{tournament.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <User size={16} className="text-blue-400" />
            <span>{tournament.currentParticipants} / {tournament.maxParticipants} משתתפים</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pb-6">
        <Link to={`/tournaments/${tournament.id}`} className="w-full">
          <Button className="w-full" variant={getButtonVariant}>
            {getButtonText()}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

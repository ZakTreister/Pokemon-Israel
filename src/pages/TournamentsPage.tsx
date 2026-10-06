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
      matchesStatus = !isPastTournament(tournament);
    } else if (filterStatus === 'completed') {
      matchesStatus = isPastTournament(tournament);
    }
    return matchesSearch && matchesStatus;
  });

  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <div>
      <PageHero
        title="טורנירים"
        highlightWord="טורנירים"
        subtitle="מצא את הטורנירים הקרובים והרשם להשתתף"
      />

      <div className="container py-12">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Search className="h-5 w-5 text-ink-muted" />
              </div>
              <input
                type="text"
                placeholder="חפש טורנירים..."
                className="w-full pl-3 pr-10 py-2.5 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-navy-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
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
            <div className="animate-pulse text-ink-muted">טוען טורנירים...</div>
          </div>
        ) : (
          <>
            {sortedTournaments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-ink-muted mb-4">לא נמצאו טורנירים התואמים את החיפוש שלך</p>
                <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}>
                  נקה סינון
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    <Card className="overflow-hidden group transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
      <div className="relative h-44 overflow-hidden">
        <img
          src={tournament.image}
          alt={tournament.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
      <CardContent className="pt-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-ink-muted text-sm">
            <Calendar size={16} className="text-blue-400" />
            <span>{new Date(tournament.date).toLocaleDateString('he-IL')}</span>
          </div>
          <div className="flex items-center gap-2 text-ink-muted text-sm">
            <MapPin size={16} className="text-blue-400" />
            <span>{tournament.location}</span>
          </div>
          <div className="flex items-center gap-2 text-ink-muted text-sm">
            <User size={16} className="text-blue-400" />
            <span>{tournament.currentParticipants} / {tournament.maxParticipants} משתתפים</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link to={`/tournaments/${tournament.id}`} className="w-full">
          <Button className="w-full" variant={getButtonVariant}>
            {getButtonText()}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

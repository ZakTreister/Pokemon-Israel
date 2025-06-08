import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { Calendar, MapPin, User, Trophy, Search } from 'lucide-react';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Tournament } from '../types/tournament';

export default function TournamentsPage() {
  const dispatch = useAppDispatch();
  const { tournaments, isLoading } = useAppSelector((state) => state.tournaments);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    dispatch(fetchTournaments());
  }, [dispatch]);

  // Filter tournaments
  const filteredTournaments = (tournaments || []).filter((tournament) => {
    const matchesSearch = tournament.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tournament.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tournament.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || tournament.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Sort tournaments by date (upcoming first)
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <div className="container py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4">טורנירים</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          מצא את הטורנירים הקרובים והרשם להשתתף
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="חפש טורנירים..."
              className="w-full pl-3 pr-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
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

      {/* Tournaments List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse">טוען טורנירים...</div>
        </div>
      ) : (
        <>
          {sortedTournaments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl mb-4">לא נמצאו טורנירים התואמים את החיפוש שלך</p>
              <Button onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}>
                נקה סינון
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const getStatusBadge = (status: Tournament['status']) => {
    switch (status) {
      case 'upcoming':
        return (
          <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
            קרוב
          </span>
        );
      case 'completed':
        return (
          <span className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs font-medium">
            הסתיים
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden group transition-all duration-300 hover:shadow-lg">
      <div className="relative h-48 overflow-hidden">
        <img
          src={tournament.image}
          alt={tournament.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2 left-2">
          {getStatusBadge(tournament.status)}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-white text-xl font-bold">{tournament.title}</h3>
        </div>
      </div>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar size={18} />
            <span>{new Date(tournament.date).toLocaleDateString('he-IL')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin size={18} />
            <span>{tournament.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User size={18} />
            <span>
              {tournament.currentParticipants} / {tournament.maxParticipants} משתתפים
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy size={18} />
            <span>
              פרסים: {tournament.prizePool}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          className="w-full" 
          variant={tournament.status === 'completed' ? 'outline' : 'default'}
          asChild
        >
          <Link to={`/tournaments/${tournament.id}`}>
            {tournament.status === 'completed' ? 'צפה בתוצאות' : 'פרטים והרשמה'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
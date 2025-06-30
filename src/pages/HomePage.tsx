import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { fetchUpdates } from '../features/updates/updatesSlice';
import { fetchDecks } from '../features/decks/decksSlice';
import { Calendar, MapPin, User, Trophy, Crown, Medal, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface DeckStats {
  deckId: string;
  archetype: string;
  wins: number;
  appearances: number;
  winRate: number;
  attackerImage1?: string | null;
  attackerImage2?: string | null;
}

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { tournaments, isLoading: tournamentsLoading } = useAppSelector((state) => state.tournaments);
  const { updates, isLoading: updatesLoading } = useAppSelector((state) => state.updates);
  const { decks, isLoading: decksLoading } = useAppSelector((state) => state.decks);
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchTournaments());
    dispatch(fetchUpdates());
    dispatch(fetchDecks());
  }, [dispatch]);

  // Get upcoming tournaments - with type safety check
  const upcomingTournaments = Array.isArray(tournaments) 
    ? tournaments
        .filter((tournament) => tournament.status === 'upcoming')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3)
    : [];

  // Calculate deck statistics from tournament results
  const getTopDecks = (): DeckStats[] => {
    if (!Array.isArray(tournaments) || !Array.isArray(decks)) return [];

    const deckStats: Record<string, DeckStats> = {};

    // Process all completed tournaments
    tournaments
      .filter(tournament => tournament.status === 'completed' && tournament.results)
      .forEach(tournament => {
        tournament.results?.forEach(result => {
          if (result.deck) {
            const deckId = typeof result.deck === 'string' ? result.deck : result.deck.id;
            
            if (!deckStats[deckId]) {
              const deck = decks.find(d => d.id === deckId);
              if (deck) {
                deckStats[deckId] = {
                  deckId,
                  archetype: deck.archetype,
                  wins: 0,
                  appearances: 0,
                  winRate: 0,
                  attackerImage1: deck.attackerImage1,
                  attackerImage2: deck.attackerImage2
                };
              }
            }

            if (deckStats[deckId]) {
              deckStats[deckId].appearances++;
              // Consider top 3 positions as "wins"
              if (result.position <= 3) {
                deckStats[deckId].wins++;
              }
            }
          }
        });
      });

    // Calculate win rates and sort by success
    const sortedDecks = Object.values(deckStats)
      .filter(deck => deck.appearances >= 2) // Only include decks with at least 2 appearances
      .map(deck => ({
        ...deck,
        winRate: deck.appearances > 0 ? (deck.wins / deck.appearances) * 100 : 0
      }))
      .sort((a, b) =>  b.appearances - a.appearances)
      .slice(0, 3);

    return sortedDecks;
  };

  const topDecks = getTopDecks();

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-pokemon-fire to-pokemon-dragon overflow-hidden">
        <div className="absolute inset-0 bg-black/20 z-10"></div>
        <div className="container relative z-20">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              פוקימון טורנירים ישראל
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              המערכת המובילה לניהול תחרויות פוקימון, מעקב דירוגים ופרופילים של שחקנים
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/tournaments" className="inline-block">
                <Button size="lg" className="w-full">צפה בטורנירים</Button>
              </Link>
              {!isAuthenticated && (
                <Link to="/login" className="inline-block">
                  <Button variant="outline" size="lg" className="w-full">התחבר</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Top Winning Decks Banner */}
      {topDecks.length > 0 && (
        <section className="py-16 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
          <div className="container">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
                <Crown className="h-8 w-8 text-primary" />
                <span>הדקים המנצחים</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                הדקים המובילים בטורנירים האחרונים
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {topDecks.map((deck, index) => (
                <DeckCard key={deck.deckId} deck={deck} rank={index + 1} />
              ))}
            </div>

            <div className="text-center mt-10">
              <Link to="/rankings">
                <Button variant="outline" className="flex items-center gap-2 mx-auto">
                  <Trophy size={18} />
                  <span>צפה בטבלת הדירוג המלאה</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Tournaments Section */}
      <section className="py-16">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold mb-2">טורנירים קרובים</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              בחר את הטורניר הבא שלך והרשם עוד היום
            </p>
          </div>

          {tournamentsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse">טוען טורנירים...</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingTournaments.map((tournament) => (
                <Card key={tournament.id} className="overflow-hidden group transition-all duration-300 hover:shadow-lg">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={tournament.image}
                      alt={tournament.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
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
                    <Link to={`/tournaments/${tournament.id}`} className="w-full">
                      <Button className="w-full">פרטים והרשמה</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link to="/tournaments">
              <Button variant="outline">צפה בכל הטורנירים</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Updates Section */}
      <section className="py-16 bg-muted">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold mb-2">עדכונים אחרונים</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              הישאר מעודכן בחדשות ועדכונים
            </p>
          </div>

          {updatesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse">טוען עדכונים...</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(Array.isArray(updates) ? updates : []).map((update) => (
                <Card key={update.id} className="animate-slide-in">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{update.title}</CardTitle>
                        <CardDescription>
                          {formatDistanceToNow(new Date(update.date), { 
                            addSuffix: true, 
                            locale: he 
                          })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p>{update.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              מוכן להתחיל?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              הצטרף לקהילת שחקני הפוקימון הגדולה בישראל והתחל להשתתף בטורנירים
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg">לאזור האישי</Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button size="lg">התחבר</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface DeckCardProps {
  deck: DeckStats;
  rank: number;
}

function DeckCard({ deck, rank }: DeckCardProps) {
  const getRankIcon = () => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankBadge = () => {
    const baseClasses = "absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg";
    switch (rank) {
      case 1:
        return `${baseClasses} bg-gradient-to-br from-yellow-400 to-yellow-600`;
      case 2:
        return `${baseClasses} bg-gradient-to-br from-gray-300 to-gray-500`;
      case 3:
        return `${baseClasses} bg-gradient-to-br from-amber-400 to-amber-600`;
      default:
        return `${baseClasses} bg-gradient-to-br from-blue-400 to-blue-600`;
    }
  };

  const getAttackerImages = () => {
    const images = [];
    if (deck.attackerImage1) images.push(deck.attackerImage1);
    if (deck.attackerImage2) images.push(deck.attackerImage2);
    return images;
  };

  const attackerImages = getAttackerImages();

  return (
    <Card className="relative overflow-hidden group transition-all duration-300 hover:shadow-xl hover:scale-105">
      <div className={getRankBadge()}>
        {rank}
      </div>
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getRankIcon()}
            <CardTitle className="text-lg">{deck.archetype}</CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Attacker Cards Display */}
        {attackerImages.length > 0 && (
          <div className="flex justify-center gap-2">
            {attackerImages.map((image, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105"
                style={{ 
                  width: attackerImages.length === 1 ? '120px' : '90px',
                  aspectRatio: '5/7'
                }}
              >
                <img
                  src={image}
                  alt={`${deck.archetype} Attacker ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{deck.wins}</div>
            <div className="text-xs text-muted-foreground">ניצחונות</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-secondary">{deck.appearances}</div>
            <div className="text-xs text-muted-foreground">הופעות</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent">{deck.winRate.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">אחוז הצלחה</div>
          </div>
        </div>

        {/* Performance Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ביצועים</span>
            <span className="font-medium">{deck.winRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(deck.winRate, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
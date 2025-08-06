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
import image from '../../public/pokemon_kids_logo.png';

interface GroupedDeckStats {
  archetypeName: string;
  primaryAttacker: string;
  totalAppearances: number;
  representativeDeckArchetype: string; // To show a full archetype name
  representativeAttackerImage1?: string | null;
  representativeAttackerImage2?: string | null;
  // Optional: store a list of all decks in this group for debugging/future use
  // groupedDecks: Array<{ archetype: string; appearances: number }>;
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
  const getTopDecks = (): GroupedDeckStats[] => {
    if (!Array.isArray(tournaments) || !Array.isArray(decks)) return [];

    const deckAppearances: Record<string, number> = {};
    const deckDetails: Record<string, { archetype: string; attackerImage1?: string | null; attackerImage2?: string | null }> = {};

    // Process all completed tournaments
    tournaments
      .filter(tournament => tournament.status === 'completed' && tournament.results)
      .forEach(tournament => {
        tournament.results?.forEach(result => {
          const deckId = typeof result.deck === 'string' ? result.deck : result.deck?.id;
          if (deckId) {
            deckAppearances[deckId] = (deckAppearances[deckId] || 0) + 1;
            if (!deckDetails[deckId]) {
              const fullDeck = decks.find(d => d.id === deckId);
              if (fullDeck) {
                deckDetails[deckId] = {
                  archetype: fullDeck.archetype,
                  attackerImage1: fullDeck.attackerImage1,
                  attackerImage2: fullDeck.attackerImage2,
                };
              }
            }
          }
        });
      });

    const groupedDeckStats: Record<string, GroupedDeckStats> = {};

    for (const deckId in deckAppearances) {
      const details = deckDetails[deckId];
      if (details) {
        const firstWord = details.archetype.split(' ')[0];
        const primaryAttacker = firstWord.toLowerCase();

        if (!groupedDeckStats[primaryAttacker]) {
          groupedDeckStats[primaryAttacker] = {
            archetypeName: details.archetype,
            primaryAttacker: firstWord, // Keep original casing for display
            totalAppearances: 0,
            representativeDeckArchetype: details.archetype,
            representativeAttackerImage1: details.attackerImage1,
            representativeAttackerImage2: details.attackerImage2,
          };
        } else {
          // If a group already exists, update representative archetype/images if current one is better (e.g., more complete)
          // For simplicity, we'll just use the first one encountered for representative images
          // You might want more sophisticated logic here (e.g., pick the most common archetype for the group)
          if (!details.attackerImage2) {
            delete groupedDeckStats[primaryAttacker].representativeAttackerImage2;
            groupedDeckStats[primaryAttacker].archetypeName = firstWord;
          }
        }
        groupedDeckStats[primaryAttacker].totalAppearances += deckAppearances[deckId];
      }
    }

    // Sort by total appearances and return top 3
    const sortedDecks = Object.values(groupedDeckStats)
      .filter(group => group.totalAppearances >= 2) // Only include groups with at least 2 appearances
      .sort((a, b) => b.totalAppearances - a.totalAppearances)
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
              ליגת הקיץ של פוקימון
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              המערכת לניהול ליגת הקיץ של פוקימון
              <br />
               מעקב דירוגים ופרופילים של שחקנים
            </p>
            <img
              key="logo"
              alt="Kids Pokemon logo"
              src={image}
              className="h-48 mb-8 mx-auto my-2 object-cover rounded"
              onError={(e) => {
              e.currentTarget.style.display = 'none';
              }}
            />
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
                <span>הדקים המובילים</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                הדקים המובילים בטורנירים האחרונים
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {topDecks.map((deck, index) => (
                <DeckCard key={deck.primaryAttacker} deck={deck} rank={index + 1} />
              ))}
            </div>

            <div className="text-center mt-10">
              <Link to="/deck-stats">
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
    </div>
  );
}

interface DeckCardProps {
  deck: GroupedDeckStats;
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
    if (deck.representativeAttackerImage1) images.push(deck.representativeAttackerImage1);
    if (deck.representativeAttackerImage2) images.push(deck.representativeAttackerImage2);
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
            <CardTitle className="text-lg">{deck.archetypeName}</CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Attacker Cards Display */}
        {attackerImages.length > 0 && (
          <div className="flex justify-center gap-2 h-32">
            {attackerImages.map((image, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105"
                style={{ 
                  width: '90px',
                  aspectRatio: '5/7'
                }}
              >
                <img
                  src={image}
                  alt={`${deck.representativeDeckArchetype} Attacker ${index + 1}`}
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

        {/* Usage Statistics */}
        <div className="text-center">
          <div className="text-3xl font-bold text-primary mb-1">{deck.totalAppearances}</div>
          <div className="text-sm text-muted-foreground">הופעות בטורנירים</div>
        </div>
      </CardContent>
    </Card>
  );
}
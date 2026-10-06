import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { fetchUpdates } from '../features/updates/updatesSlice';
import { fetchDecks } from '../features/decks/decksSlice';
import { Calendar, MapPin, User, Trophy, Crown, Medal, Award, Zap, Newspaper } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SectionHeading } from '../components/ui/SectionHeading';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import image from '../../public/pokemon_kids_logo.png';

interface GroupedDeckStats {
  primaryAttacker: string;
  totalAppearances: number;
  representativeDeckArchetype: string;
  representativeAttackerImage1?: string | null;
  representativeAttackerImage2?: string | null;
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

  const upcomingTournaments = Array.isArray(tournaments)
    ? tournaments
        .filter((tournament) => tournament.status === 'upcoming')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3)
    : [];

  const getTopDecks = (): GroupedDeckStats[] => {
    if (!Array.isArray(tournaments) || !Array.isArray(decks)) return [];

    const deckAppearances: Record<string, number> = {};
    const deckDetails: Record<string, { archetype: string; attackerImage1?: string | null; attackerImage2?: string | null }> = {};

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
            primaryAttacker: firstWord,
            totalAppearances: 0,
            representativeDeckArchetype: details.archetype,
            representativeAttackerImage1: details.attackerImage1,
            representativeAttackerImage2: details.attackerImage2,
          };
        }
        groupedDeckStats[primaryAttacker].totalAppearances += deckAppearances[deckId];
      }
    }

    return Object.values(groupedDeckStats)
      .filter(group => group.totalAppearances >= 2)
      .sort((a, b) => b.totalAppearances - a.totalAppearances)
      .slice(0, 3);
  };

  const topDecks = getTopDecks();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-navy">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-0 halftone-dots opacity-30" />
        <div className="absolute inset-0 diagonal-lines" />
        {/* Decorative glow orbs */}
        <div className="absolute top-1/4 right-10 h-40 w-40 rounded-full bg-blue-bright/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-10 h-32 w-32 rounded-full bg-gold/10 blur-3xl" />

        <div className="container relative py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6">
              <Badge variant="live" pulse>טורנירים פעילים</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
              ליגת <span className="text-gold">הפוקימון</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-200 mb-8 max-w-xl mx-auto">
              המערכת הלאומית לניהול תחרויות פוקימון — דירוגים, טורנירים ופרופילי שחקנים
            </p>
            <img
              key="logo"
              alt="Kids Pokemon logo"
              src={image}
              className="h-40 mb-8 mx-auto object-cover rounded-xl shadow-glow-blue"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/tournaments">
                <Button variant="cta" size="lg">צפה בטורנירים</Button>
              </Link>
              {!isAuthenticated && (
                <Link to="/login">
                  <Button variant="outline" size="lg" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50">התחבר</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Top Winning Decks Banner */}
      {topDecks.length > 0 && (
        <section className="py-16 bg-section-light">
          <div className="container">
            <SectionHeading
              title="הדקים המובילים"
              highlightWord="מובילים"
              subtitle="הדקים החזקים ביותר בטורנירים האחרונים"
              icon={<Crown className="h-8 w-8 text-gold" />}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {topDecks.map((deck, index) => (
                <DeckCard key={deck.primaryAttacker} deck={deck} rank={index + 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Tournaments Section */}
      <section className="py-16">
        <div className="container">
          <SectionHeading
            title="טורנירים קרובים"
            highlightWord="קרובים"
            subtitle="בחר את הטורניר הבא שלך והרשם עוד היום"
          />
          {tournamentsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse text-ink-muted">טוען טורנירים...</div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingTournaments.map((tournament) => (
                <Card key={tournament.id} className="overflow-hidden group transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={tournament.image}
                      alt={tournament.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge variant="upcoming">קרוב</Badge>
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
                      <div className="flex items-center gap-2 text-ink-muted text-sm">
                        <Trophy size={16} className="text-gold-600" />
                        <span>פרסים: {tournament.prizePool}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link to={`/tournaments/${tournament.id}`} className="w-full">
                      <Button variant="default" className="w-full">פרטים והרשמה</Button>
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
      <section className="py-16 bg-navy-700 relative overflow-hidden">
        <div className="absolute inset-0 halftone-dots opacity-20" />
        <div className="container relative">
          <SectionHeading
            title="עדכונים אחרונים"
            highlightWord="אחרונים"
            subtitle="הישאר מעודכן בחדשות ועדכונים"
            dark
          />
          {updatesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse text-blue-200">טוען עדכונים...</div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Array.isArray(updates) ? updates : []).map((update) => (
                <Card key={update.id} className="bg-navy-600/40 border-navy-500/30 text-white animate-slide-in backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-cyan">
                        <Newspaper size={20} />
                      </div>
                      <div>
                        <CardTitle className="text-white">{update.title}</CardTitle>
                        <CardDescription className="text-blue-200">
                          {formatDistanceToNow(new Date(update.date), { addSuffix: true, locale: he })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-blue-100/90 text-sm leading-relaxed">{update.content}</p>
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
        return <Crown className="h-5 w-5 text-gold" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  const getRankVariant = (): 'rank-1' | 'rank-2' | 'rank-3' => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    return 'rank-3';
  };

  const getAttackerImages = () => {
    const images = [];
    if (deck.representativeAttackerImage1) images.push(deck.representativeAttackerImage1);
    if (deck.representativeAttackerImage2) images.push(deck.representativeAttackerImage2);
    return images;
  };

  const attackerImages = getAttackerImages();

  return (
    <Card className="relative group transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 bg-card-tint">
      <div className="absolute -top-2 -left-2 z-10">
        <Badge variant={getRankVariant()} className="h-8 w-8 items-center justify-center rounded-full text-sm shadow-card">
          {rank}
        </Badge>
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getRankIcon()}
            <CardTitle className="text-base">{deck.primaryAttacker}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {attackerImages.length > 0 && (
          <div className="flex justify-center gap-2 h-28">
            {attackerImages.map((image, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-lg shadow-card transition-transform duration-300 group-hover:scale-105"
                style={{ width: '80px', aspectRatio: '5/7' }}
              >
                <img
                  src={image}
                  alt={`${deck.representativeDeckArchetype} Attacker ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="text-center border-t border-line pt-3">
          <div className="text-3xl font-extrabold text-blue-500 leading-none">{deck.totalAppearances}</div>
          <div className="text-xs text-ink-muted mt-1">הופעות בטורנירים</div>
        </div>
      </CardContent>
    </Card>
  );
}

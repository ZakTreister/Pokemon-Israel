import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { fetchUpdates } from '../features/updates/updatesSlice';
import { fetchDecks } from '../features/decks/decksSlice';
import {
  Calendar,
  MapPin,
  User,
  Trophy,
  Crown,
  Medal,
  Award,
  Newspaper,
  Zap,
  Layers,
  ArrowUpLeft,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeading } from '../components/ui/SectionHeading';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface GroupedDeckStats {
  primaryAttacker: string;
  totalAppearances: number;
  representativeDeckArchetype: string;
  representativeAttackerImage1?: string | null;
  representativeAttackerImage2?: string | null;
}

export default function HomePage() {
  const dispatch = useAppDispatch();
  const {
    tournaments,
    isLoading: tournamentsLoading,
    error: tournamentsError,
  } = useAppSelector((state) => state.tournaments);
  const {
    updates,
    isLoading: updatesLoading,
    error: updatesError,
  } = useAppSelector((state) => state.updates);
  const {
    decks,
    isLoading: decksLoading,
    error: decksError,
  } = useAppSelector((state) => state.decks);
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
        .slice(0, 4)
    : [];

  const getTopDecks = (): GroupedDeckStats[] => {
    if (!Array.isArray(tournaments) || !Array.isArray(decks)) return [];

    const deckAppearances: Record<string, number> = {};
    const deckDetails: Record<
      string,
      {
        archetype: string;
        attackerImage1?: string | null;
        attackerImage2?: string | null;
      }
    > = {};

    tournaments
      .filter(
        (tournament) => tournament.status === 'completed' && tournament.results,
      )
      .forEach((tournament) => {
        tournament.results?.forEach((result) => {
          const deckId =
            typeof result.deck === 'string' ? result.deck : result.deck?.id;
          if (deckId) {
            deckAppearances[deckId] = (deckAppearances[deckId] || 0) + 1;
            if (!deckDetails[deckId]) {
              const fullDeck = decks.find((d) => d.id === deckId);
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
        groupedDeckStats[primaryAttacker].totalAppearances +=
          deckAppearances[deckId];
      }
    }

    return Object.values(groupedDeckStats)
      .filter((group) => group.totalAppearances >= 2)
      .sort((a, b) => b.totalAppearances - a.totalAppearances)
      .slice(0, 4);
  };

  const topDecks = getTopDecks();

  const totalTournaments = Array.isArray(tournaments) ? tournaments.length : 0;
  const completedCount = Array.isArray(tournaments)
    ? tournaments.filter((t) => t.status === 'completed').length
    : 0;
  const upcomingCount = Array.isArray(tournaments)
    ? tournaments.filter((t) => t.status === 'upcoming').length
    : 0;
  const featuredTournament = upcomingTournaments[0];

  return (
    <div>
      <section className="relative overflow-hidden bg-hero-navy text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 halftone-dots"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 diagonal-lines"
        />
        <div className="container relative grid items-center gap-2 py-10 sm:py-12 lg:grid-cols-[1.03fr_.97fr] lg:gap-8 lg:py-16">
          <div className="relative z-10 min-w-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-cyan/30 bg-navy-700/30 px-3 py-1.5 text-xs font-bold text-blue-100">
              <span
                className="h-2 w-2 rounded-full bg-gold"
                aria-hidden="true"
              />
              <span dir="ltr">CARDSCHOOL IL • POKÉMON TCG</span>
            </div>
            <h1 className="text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              המשחק שלך.
              <br />
              <span className="text-gold">הליגה שלנו.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-blue-100 sm:text-lg">
              הבית של ליגת הפוקימון הישראלית. בחר את הטורניר הבא שלך, עקוב אחרי
              הדירוגים ופגוש את הקהילה.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Button asChild variant="cta" size="lg">
                <Link to="/tournaments">
                  לטורניר הבא <ArrowUpLeft className="ms-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/rankings">
                  טבלת הדירוג <Trophy className="ms-2 h-4 w-4" />
                </Link>
              </Button>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="text-sm font-bold text-blue-100 underline decoration-blue-cyan/50 underline-offset-4 hover:text-gold"
                >
                  התחברות
                </Link>
              )}
            </div>
            <div className="mt-9 flex gap-6 border-t border-white/20 pt-5 sm:gap-9">
              <div>
                <strong className="block text-2xl font-black text-white tabular-nums">
                  {tournamentsLoading || tournamentsError
                    ? '—'
                    : totalTournaments}
                </strong>
                <span className="text-xs text-blue-200">טורנירים בליגה</span>
              </div>
              <div>
                <strong className="block text-2xl font-black text-gold tabular-nums">
                  {tournamentsLoading || tournamentsError ? '—' : upcomingCount}
                </strong>
                <span className="text-xs text-blue-200">טורנירים קרובים</span>
              </div>
              <div>
                <strong className="block text-2xl font-black text-white tabular-nums">
                  {decksLoading || decksError ? '—' : decks.length}
                </strong>
                <span className="text-xs text-blue-200">דקים במערכת</span>
              </div>
            </div>
          </div>
          <HeroArtwork />
        </div>
      </section>

      {upcomingTournaments.length > 0 && (
        <div
          className="cs-ticker overflow-hidden py-3 text-white"
          aria-label="טורנירים קרובים בליגה"
        >
          <div className="container overflow-hidden">
            <div className="cs-ticker-track">
              <span className="flex shrink-0 items-center gap-2 text-xs font-black">
                <Calendar size={16} /> בקרוב בליגה
              </span>
              {upcomingTournaments.map((t) => (
                <Link
                  key={t.id}
                  to={`/tournaments/${t.id}`}
                  className="flex shrink-0 items-center gap-3 text-sm font-bold hover:underline"
                >
                  <Zap size={15} className="text-gold" />
                  {t.title}
                  <span className="font-normal text-white/90">
                    {new Date(t.date).toLocaleDateString('he-IL')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="bg-section-light py-12">
        <div className="container">
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <StatCard
              icon={<Trophy size={20} />}
              value={
                tournamentsLoading || tournamentsError ? '—' : totalTournaments
              }
              label="טורנירים בליגה"
            />
            <StatCard
              icon={<Calendar size={20} />}
              value={
                tournamentsLoading || tournamentsError ? '—' : upcomingCount
              }
              label="טורנירים קרובים"
              accent="gold"
            />
            <StatCard
              icon={<Medal size={20} />}
              value={
                tournamentsLoading || tournamentsError ? '—' : completedCount
              }
              label="טורנירים שהסתיימו"
              accent="navy"
            />
            <StatCard
              icon={<Layers size={20} />}
              value={decksLoading || decksError ? '—' : decks.length}
              label="דקים במערכת"
            />
          </div>
        </div>
      </section>

      <section className="bg-card py-12 md:py-14">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
            <SectionHeading
              title="הטורניר הבא שלך"
              subtitle="נפגשים, מתחרים ועולים בדירוג."
              icon={<Calendar size={18} />}
              className="mb-0"
            />
            <Button asChild variant="outline" size="sm">
              <Link to="/tournaments">
                כל הטורנירים <ArrowUpLeft size={16} className="ms-2" />
              </Link>
            </Button>
          </div>
          {tournamentsError && (
            <p
              role="alert"
              className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {tournamentsError}
            </p>
          )}
          {tournamentsLoading ? (
            <p
              role="status"
              className="py-12 text-center text-muted-foreground"
            >
              טוען טורנירים...
            </p>
          ) : upcomingTournaments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-blue-500" />
              <h3 className="text-lg font-bold">אין כרגע טורנירים קרובים</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                טורנירים חדשים יופיעו כאן לאחר פרסומם.
              </p>
              <Button asChild variant="link" className="mt-3">
                <Link to="/tournaments">לכל הטורנירים</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {upcomingTournaments.map((tournament) => (
                <Card
                  key={tournament.id}
                  variant="public"
                  className="group flex min-h-[380px] flex-col overflow-hidden transition-transform duration-300 motion-safe:hover:-translate-y-1.5"
                >
                  <div className="relative h-36 shrink-0 overflow-hidden bg-navy-gradient">
                    {tournament.image ? (
                      <img
                        src={tournament.image}
                        alt={tournament.title}
                        className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                      />
                    ) : (
                      <Trophy
                        aria-hidden="true"
                        className="absolute inset-0 m-auto h-16 w-16 text-blue-cyan/40"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-700 to-transparent" />
                    <Badge
                      variant="upcoming"
                      className="absolute start-3 top-3"
                    >
                      קרוב
                    </Badge>
                    <h3 className="absolute inset-x-4 bottom-3 text-lg font-extrabold leading-tight text-white">
                      {tournament.title}
                    </h3>
                  </div>
                  <CardContent className="flex-1 pt-4">
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar
                          size={16}
                          className="shrink-0 text-blue-500"
                        />
                        <span>
                          {new Date(tournament.date).toLocaleDateString(
                            'he-IL',
                          )}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="shrink-0 text-blue-500" />
                        <span>{tournament.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={16} className="shrink-0 text-blue-500" />
                        <span>
                          {tournament.currentParticipants} /{' '}
                          {tournament.maxParticipants} משתתפים
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Trophy size={16} className="shrink-0 text-gold-600" />
                        <span>פרסים: {tournament.prizePool}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-6">
                    <Button asChild className="w-full">
                      <Link to={`/tournaments/${tournament.id}`}>
                        פרטים והרשמה <ArrowUpLeft size={15} className="ms-2" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {featuredTournament && (
        <section className="py-12 md:py-14">
          <div className="container">
            <div className="cs-public-card relative overflow-hidden bg-feature p-6 text-white shadow-card-hover sm:p-8 md:p-10">
              <div
                aria-hidden="true"
                className="absolute inset-0 halftone-dots opacity-50"
              />
              <div className="relative grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold text-blue-cyan">
                    <Calendar size={16} /> האירוע הבא בליגה
                  </p>
                  <h2 className="text-3xl font-black sm:text-4xl">
                    {featuredTournament.title}
                  </h2>
                  <p className="mt-3 text-blue-100">
                    {new Date(featuredTournament.date).toLocaleDateString(
                      'he-IL',
                    )}{' '}
                    · {featuredTournament.location}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Button asChild variant="cta">
                      <Link to={`/tournaments/${featuredTournament.id}`}>
                        פרטים והרשמה
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    >
                      <Link to="/tournaments">כל אירועי הליגה</Link>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-5 border-s-4 border-gold ps-5">
                  <Trophy className="h-16 w-16 shrink-0 text-gold" />
                  <div>
                    <p className="text-xs font-bold text-blue-200">
                      פרסים בטורניר
                    </p>
                    <p className="mt-2 text-xl font-extrabold">
                      {featuredTournament.prizePool}
                    </p>
                    <p className="mt-2 text-sm text-blue-100">
                      {featuredTournament.currentParticipants} /{' '}
                      {featuredTournament.maxParticipants} משתתפים
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {topDecks.length > 0 && (
        <section className="bg-section-light py-12 md:py-14">
          <div className="container">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                title="הדקים המובילים"
                subtitle="הדקים הבולטים בתוצאות הטורנירים בליגה."
                icon={<Crown size={18} />}
                className="mb-0"
              />
              <Button asChild variant="outline" size="sm">
                <Link to="/deck-stats">
                  לנתוני הדקים <ArrowUpLeft size={16} className="ms-2" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {topDecks.map((deck, index) => (
                <DeckCard
                  key={deck.primaryAttacker}
                  deck={deck}
                  rank={index + 1}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden bg-navy-700 py-12 md:py-14">
        <div
          aria-hidden="true"
          className="absolute inset-0 halftone-dots opacity-30"
        />
        <div className="container relative">
          <SectionHeading
            title="מה חדש בליגה?"
            subtitle="חדשות, הכרזות ועדכונים מהקהילה."
            icon={<Newspaper size={18} />}
            dark
          />
          {updatesError && (
            <p
              role="alert"
              className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600"
            >
              {updatesError}
            </p>
          )}
          {updatesLoading ? (
            <p role="status" className="py-12 text-center text-blue-200">
              טוען עדכונים...
            </p>
          ) : updates.length === 0 ? (
            <p className="border-t border-white/15 py-6 text-blue-200">
              עדכונים חדשים מהליגה יופיעו כאן.
            </p>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {(Array.isArray(updates) ? updates : []).map((update) => (
                <Card
                  key={update.id}
                  variant="public"
                  className="overflow-hidden"
                >
                  <div className="cs-news-art">
                    <Newspaper
                      aria-hidden="true"
                      className="absolute end-5 top-5 h-20 w-20 rotate-[-12deg] text-white/20"
                    />
                    <span
                      className="absolute start-4 bottom-4 text-xs font-black tracking-[.2em] text-white"
                      dir="ltr"
                    >
                      LEAGUE NEWS
                    </span>
                  </div>
                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant="info">עדכון מהליגה</Badge>
                      <CardDescription className="text-xs">
                        {formatDistanceToNow(new Date(update.date), {
                          addSuffix: true,
                          locale: he,
                        })}
                      </CardDescription>
                    </div>
                    <CardTitle>{update.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {update.content}
                    </p>
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

function HeroArtwork() {
  return (
    <div className="cs-hero-art" aria-hidden="true">
      <div className="cs-orbit" />
      <div className="cs-hero-lightning absolute start-[8%] top-[6%] h-32 w-14 rotate-12 bg-gold" />
      <div className="cs-hero-lightning absolute end-[7%] bottom-[8%] h-24 w-10 rotate-12 bg-gold" />
      <div className="cs-trading-card cs-trading-card-back">
        <div className="flex justify-between text-[10px] font-black">
          <span>STRATEGY</span>
          <Zap size={14} className="text-gold" />
        </div>
        <div className="cs-card-art">
          <Layers className="relative h-20 w-20 text-blue-cyan" />
        </div>
        <div className="text-center text-sm font-black text-white">
          כל קלף קובע.
        </div>
        <div className="mx-auto mt-3 h-1 w-20 bg-gold" />
      </div>
      <div className="cs-trading-card cs-trading-card-front">
        <div className="flex justify-between text-[10px] font-black">
          <span>COMMUNITY</span>
          <User size={14} className="text-gold" />
        </div>
        <div className="cs-card-art">
          <Trophy className="relative h-20 w-20 text-gold" />
        </div>
        <div className="text-center text-sm font-black text-white">
          משחקים ביחד.
        </div>
        <div className="mx-auto mt-3 h-1 w-20 bg-gold" />
      </div>
      <div className="cs-trading-card cs-trading-card-main">
        <div className="flex items-center justify-between text-[10px] font-black">
          <span dir="ltr">CARDSCHOOL IL</span>
          <Zap size={14} className="text-gold" fill="currentColor" />
        </div>
        <div className="cs-card-art">
          <div className="cs-pokeball" />
        </div>
        <p className="text-center text-base font-black text-white">
          נפגשים בליגה.
        </p>
        <p
          dir="ltr"
          className="mt-2 text-center text-[9px] font-bold tracking-[.16em] text-blue-200"
        >
          POKÉMON TRADING CARD GAME
        </p>
      </div>
      <img
        src="/pokemon_kids_logo.png"
        alt=""
        className="absolute bottom-1 left-1/2 h-9 max-w-40 -translate-x-1/2 rounded bg-white/95 px-2 object-contain sm:h-10"
      />
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

  const getRankVariant = (): 'rank-1' | 'rank-2' | 'rank-3' | 'neutral' => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'neutral';
  };

  const getAttackerImages = () => {
    const images = [];
    if (deck.representativeAttackerImage1)
      images.push(deck.representativeAttackerImage1);
    if (deck.representativeAttackerImage2)
      images.push(deck.representativeAttackerImage2);
    return images;
  };

  const attackerImages = getAttackerImages();

  return (
    <Card
      variant="public"
      className="relative group min-h-[295px] overflow-hidden transition-transform duration-300 motion-safe:hover:-translate-y-1.5"
    >
      <div className="absolute top-3 end-3 z-10">
        <Badge
          variant={getRankVariant()}
          className="h-8 w-8 items-center justify-center rounded-full text-sm shadow-card"
        >
          {rank}
        </Badge>
      </div>
      <CardHeader className="min-h-20 bg-navy-gradient pb-3 pt-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getRankIcon()}
            <CardTitle className="text-base text-white pe-6">
              {deck.primaryAttacker}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {attackerImages.length > 0 && (
          <div className="flex justify-center gap-2 h-28">
            {attackerImages.map((image, index) => (
              <div
                key={index}
                className="relative w-12 shrink-0 self-center overflow-hidden rounded-lg shadow-card transition-transform duration-300 motion-safe:group-hover:scale-105 sm:w-20"
                style={{ aspectRatio: '5/7' }}
              >
                <img
                  src="/pokemon_kids_logo.png"
                  alt={`${deck.representativeDeckArchetype} Attacker ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="text-center border-t border-border pt-3">
          <div className="text-3xl font-extrabold text-blue-500 leading-none">
            {deck.totalAppearances}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            הופעות בטורנירים
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

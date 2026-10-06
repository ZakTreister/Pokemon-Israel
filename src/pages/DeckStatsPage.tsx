import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { fetchDecks } from '../features/decks/decksSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { PageHero } from '../components/ui/PageHero';
import { Search, Trophy, Medal, Award, TrendingUp, BarChart3 } from 'lucide-react';

interface DeckStats {
  deckId: string;
  archetype: string;
  totalAppearances: number;
  averagePosition: number;
  averagePoints: number;
  firstPlaceFinishes: number;
  secondPlaceFinishes: number;
  thirdPlaceFinishes: number;
  winRate: number;
  iconImage1?: string | null;
  iconImage2?: string | null;
  attackerImage1?: string | null;
  attackerImage2?: string | null;
  image?: string;
}

interface DeckTournamentAppearance {
  tournamentId: string;
  tournamentTitle: string;
  position: number;
  points: number;
  playerName: string;
}

export default function DeckStatsPage() {
  const dispatch = useAppDispatch();
  const { tournaments, isLoading: tournamentsLoading } = useAppSelector((state) => state.tournaments);
  const { decks, isLoading: decksLoading } = useAppSelector((state) => state.decks);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchTournaments());
    dispatch(fetchDecks());
  }, [dispatch]);

  const getDeckStatistics = (): DeckStats[] => {
    if (!Array.isArray(tournaments) || !Array.isArray(decks)) return [];

    const deckAppearances: Record<string, DeckTournamentAppearance[]> = {};
    const deckDetails: Record<string, any> = {};

    tournaments
      .filter(tournament => tournament.status === 'completed' && tournament.results)
      .forEach(tournament => {
        tournament.results?.forEach(result => {
          const deckId = typeof result.deck === 'string' ? result.deck : result.deck?.id;
          if (deckId) {
            if (!deckAppearances[deckId]) {
              deckAppearances[deckId] = [];
            }
            deckAppearances[deckId].push({
              tournamentId: tournament.id,
              tournamentTitle: tournament.title,
              position: result.position,
              points: result.points,
              playerName: result.playerName
            });
            if (!deckDetails[deckId]) {
              const fullDeck = decks.find(d => d.id === deckId);
              if (fullDeck) {
                deckDetails[deckId] = fullDeck;
              }
            }
          }
        });
      });

    const deckStats: DeckStats[] = [];
    for (const deckId in deckAppearances) {
      const appearances = deckAppearances[deckId];
      const deckInfo = deckDetails[deckId];
      if (appearances.length > 0 && deckInfo) {
        const totalAppearances = appearances.length;
        const totalPosition = appearances.reduce((sum, app) => sum + app.position, 0);
        const totalPoints = appearances.reduce((sum, app) => sum + app.points, 0);
        const firstPlaceFinishes = appearances.filter(app => app.position === 1).length;
        const secondPlaceFinishes = appearances.filter(app => app.position === 2).length;
        const thirdPlaceFinishes = appearances.filter(app => app.position === 3).length;
        const topThreeFinishes = firstPlaceFinishes + secondPlaceFinishes + thirdPlaceFinishes;

        deckStats.push({
          deckId,
          archetype: deckInfo.archetype,
          totalAppearances,
          averagePosition: totalPosition / totalAppearances,
          averagePoints: totalPoints / totalAppearances,
          firstPlaceFinishes,
          secondPlaceFinishes,
          thirdPlaceFinishes,
          winRate: (topThreeFinishes / totalAppearances) * 100,
          iconImage1: deckInfo.iconImage1,
          iconImage2: deckInfo.iconImage2,
          attackerImage1: deckInfo.attackerImage1,
          attackerImage2: deckInfo.attackerImage2,
          image: deckInfo.image
        });
      }
    }
    return deckStats.sort((a, b) => b.totalAppearances - a.totalAppearances);
  };

  const deckStatistics = getDeckStatistics();
  const filteredDecks = deckStatistics.filter(deck =>
    deck.archetype.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDecks = deckStatistics.length;
  const totalAppearances = deckStatistics.reduce((sum, deck) => sum + deck.totalAppearances, 0);
  const mostPopularDeck = deckStatistics[0];
  const mostSuccessfulDeck = deckStatistics
    .filter(deck => deck.totalAppearances >= 2)
    .sort((a, b) => b.winRate - a.winRate)[0];

  const getDeckImages = (deck: DeckStats) => {
    const images = [];
    if (deck.iconImage1) images.push(deck.iconImage1);
    if (deck.iconImage2) images.push(deck.iconImage2);
    if (images.length === 0 && deck.image) images.push(deck.image);
    return images;
  };

  if (tournamentsLoading || decksLoading) {
    return (
      <div className="container py-16">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-pulse text-ink-muted">טוען סטטיסטיקות דקים...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        title="סטטיסטיקות דקים"
        highlightWord="דקים"
        subtitle="ביצועים מפורטים של כל הדקים בטורנירים שהסתיימו"
      />

      <div className="container py-12">
        {/* Summary Statistics */}
        {deckStatistics.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard value={totalDecks} label="סהכ דקים" accent="blue" />
            <StatCard value={totalAppearances} label="סהכ הופעות" accent="navy" />
            <Card className="p-4 bg-card-tint">
              <div className="text-xs font-medium text-ink-muted mb-1">דק הכי פופולרי</div>
              <div className="text-sm font-bold text-navy-700 truncate">{mostPopularDeck?.archetype || '-'}</div>
              <div className="text-xs text-ink-muted">{mostPopularDeck?.totalAppearances || 0} הופעות</div>
            </Card>
            <Card className="p-4 bg-card-tint">
              <div className="text-xs font-medium text-ink-muted mb-1">דק הכי מצליח</div>
              <div className="text-sm font-bold text-navy-700 truncate">{mostSuccessfulDeck?.archetype || '-'}</div>
              <div className="text-xs text-ink-muted">{mostSuccessfulDeck?.winRate?.toFixed(1) || 0}% הצלחה</div>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-5 w-5 text-ink-muted" />
            </div>
            <input
              type="text"
              placeholder="חפש דק..."
              className="w-full pl-3 pr-10 py-2.5 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-navy-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredDecks.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 size={48} className="mx-auto text-ink-muted mb-4 opacity-40" />
            <p className="text-lg text-ink-muted">
              {deckStatistics.length === 0
                ? 'לא נמצאו נתוני דקים מטורנירים שהסתיימו'
                : 'לא נמצאו דקים התואמים את החיפוש שלך'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-navy-700 text-right">
                        <th className="px-4 py-3.5 text-sm font-bold text-blue-100">דק</th>
                        <th className="px-4 py-3.5 text-sm font-bold text-blue-100">הופעות</th>
                        <th className="px-4 py-3.5 text-sm font-bold text-blue-100">מיקום ממוצע</th>
                        <th className="px-4 py-3.5 text-sm font-bold text-blue-100">נקודות ממוצעות</th>
                        <th className="px-4 py-3.5 text-sm font-bold text-blue-100">מקום 1</th>
                        <th className="px-4 py-3.5 text-sm font-bold text-blue-100">מקום 2</th>
                        <th className="px-4 py-3.5 text-sm font-bold text-blue-100">מקום 3</th>
                        <th className="px-4 py-3.5 text-sm font-bold text-blue-100">אחוז הצלחה</th>
                        <th className="px-4 py-3.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDecks.map((deck) => {
                        const images = getDeckImages(deck);
                        return (
                          <tr key={deck.deckId} className="border-b border-line-light hover:bg-blue-50/50 transition-colors">
                            <td className="px-4 py-3 font-bold text-navy-700">{deck.archetype}</td>
                            <td className="px-4 py-3"><span className="text-lg font-extrabold text-blue-500">{deck.totalAppearances}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{deck.averagePosition.toFixed(1)}</span>
                                {deck.averagePosition <= 3 && <TrendingUp className="h-4 w-4 text-success" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium">{deck.averagePoints.toFixed(1)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Trophy className="h-4 w-4 text-gold-600" />
                                <span className="font-bold">{deck.firstPlaceFinishes}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Medal className="h-4 w-4 text-slate-400" />
                                <span className="font-bold">{deck.secondPlaceFinishes}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Award className="h-4 w-4 text-amber-500" />
                                <span className="font-bold">{deck.thirdPlaceFinishes}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={deck.winRate >= 50 ? 'success' : deck.winRate >= 25 ? 'warning' : 'neutral'}>
                                {deck.winRate.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {images.length > 0 && (
                                <div className="flex gap-1">
                                  {images.slice(0, 2).map((image, index) => (
                                    <div key={index} className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                                      <img src={image} alt={`${deck.archetype} ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {filteredDecks.map((deck) => {
                const images = getDeckImages(deck);
                return (
                  <Card key={deck.deckId} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-navy-700">{deck.archetype}</h3>
                          <div className="text-sm text-ink-muted">{deck.totalAppearances} הופעות בטורנירים</div>
                        </div>
                        {images.length > 0 && (
                          <div className="flex gap-1">
                            {images.slice(0, 2).map((image, index) => (
                              <div key={index} className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                <img src={image} alt={`${deck.archetype} ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <StatCard value={deck.averagePosition.toFixed(1)} label="מיקום ממוצע" accent="navy" />
                        <StatCard value={deck.averagePoints.toFixed(1)} label="נקודות ממוצעות" accent="blue" />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <StatCard value={deck.firstPlaceFinishes} label="מקום 1" accent="gold" />
                        <StatCard value={deck.secondPlaceFinishes} label="מקום 2" accent="navy" />
                        <StatCard value={deck.thirdPlaceFinishes} label="מקום 3" accent="navy" />
                      </div>

                      <div className="text-center pt-3 border-t border-line-light">
                        <div className="text-xs text-ink-muted mb-1">אחוז הצלחה (טופ 3)</div>
                        <div className={`text-2xl font-extrabold ${deck.winRate >= 50 ? 'text-success' : deck.winRate >= 25 ? 'text-gold-600' : 'text-ink-muted'}`}>
                          {deck.winRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

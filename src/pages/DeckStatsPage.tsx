import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { fetchDecks } from '../features/decks/decksSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
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
  winRate: number; // Percentage of top-3 finishes
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

  // Calculate deck statistics from tournament results
  const getDeckStatistics = (): DeckStats[] => {
    if (!Array.isArray(tournaments) || !Array.isArray(decks)) return [];

    const deckAppearances: Record<string, DeckTournamentAppearance[]> = {};
    const deckDetails: Record<string, any> = {};

    // Process all completed tournaments
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

            // Store deck details
            if (!deckDetails[deckId]) {
              const fullDeck = decks.find(d => d.id === deckId);
              if (fullDeck) {
                deckDetails[deckId] = fullDeck;
              }
            }
          }
        });
      });

    // Calculate statistics for each deck
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

    // Sort by total appearances (most popular first)
    return deckStats.sort((a, b) => b.totalAppearances - a.totalAppearances);
  };

  const deckStatistics = getDeckStatistics();

  // Filter decks based on search query
  const filteredDecks = deckStatistics.filter(deck =>
    deck.archetype.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary statistics
  const totalDecks = deckStatistics.length;
  const totalAppearances = deckStatistics.reduce((sum, deck) => sum + deck.totalAppearances, 0);
  const mostPopularDeck = deckStatistics[0];
  const mostSuccessfulDeck = deckStatistics
    .filter(deck => deck.totalAppearances >= 2) // Only consider decks with multiple appearances
    .sort((a, b) => b.winRate - a.winRate)[0];

  // Helper function to get deck images
  const getDeckImages = (deck: DeckStats) => {
    const images = [];
    if (deck.iconImage1) images.push(deck.iconImage1);
    if (deck.iconImage2) images.push(deck.iconImage2);
    if (images.length === 0 && deck.image) images.push(deck.image);
    return images;
  };

  // Helper function to get position icon
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  if (tournamentsLoading || decksLoading) {
    return (
      <div className="container py-16">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-pulse">טוען סטטיסטיקות דקים...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          <span>סטטיסטיקות דקים</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          ביצועים מפורטים של כל הדקים בטורנירים שהסתיימו
        </p>
      </div>

      {/* Summary Statistics */}
      {deckStatistics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">סה"כ דקים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDecks}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">סה"כ הופעות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAppearances}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">דק הכי פופולרי</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{mostPopularDeck?.archetype || '-'}</div>
              <div className="text-xs text-muted-foreground">
                {mostPopularDeck?.totalAppearances || 0} הופעות
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">דק הכי מצליח</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{mostSuccessfulDeck?.archetype || '-'}</div>
              <div className="text-xs text-muted-foreground">
                {mostSuccessfulDeck?.winRate.toFixed(1) || 0}% אחוז הצלחה
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md mx-auto">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="חפש דק..."
            className="w-full pl-3 pr-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Deck Statistics */}
      {filteredDecks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl mb-4">
            {deckStatistics.length === 0 
              ? 'לא נמצאו נתוני דקים מטורנירים שהסתיימו'
              : 'לא נמצאו דקים התואמים את החיפוש שלך'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted border-b border-border text-right">
                      <th className="px-4 py-3 text-sm font-medium text-muted-foreground">דק</th>
                      <th className="px-4 py-3 text-sm font-medium text-muted-foreground">הופעות</th>
                      <th className="px-4 py-3 text-sm font-medium text-muted-foreground">מיקום ממוצע</th>
                      <th className="px-4 py-3 text-sm font-medium text-muted-foreground">נקודות ממוצעות</th>
                      <th className="px-4 py-3 text-sm font-medium text-muted-foreground">מקום 1</th>
                      <th className="px-4 py-3 text-sm font-medium text-muted-foreground">מקום 2</th>
                      <th className="px-4 py-3 text-sm font-medium text-muted-foreground">מקום 3</th>
                      <th className="px-4 py-3 text-sm font-medium text-muted-foreground">אחוז הצלחה</th>
                      <th className="px-4 py-3 text-sm font-medium text-muted-foreground">תמונות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDecks.map((deck) => {
                      const images = getDeckImages(deck);
                      return (
                        <tr key={deck.deckId} className="border-b border-border">
                          <td className="px-4 py-3">
                            <div className="font-medium">{deck.archetype}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-primary">{deck.totalAppearances}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span>{deck.averagePosition.toFixed(1)}</span>
                              {deck.averagePosition <= 3 && (
                                <TrendingUp className="h-4 w-4 text-success" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">{deck.averagePoints.toFixed(1)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {getPositionIcon(1)}
                              <span>{deck.firstPlaceFinishes}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {getPositionIcon(2)}
                              <span>{deck.secondPlaceFinishes}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {getPositionIcon(3)}
                              <span>{deck.thirdPlaceFinishes}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`font-medium ${
                              deck.winRate >= 50 ? 'text-success' : 
                              deck.winRate >= 25 ? 'text-warning' : 'text-muted-foreground'
                            }`}>
                              {deck.winRate.toFixed(1)}%
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {images.length > 0 && (
                              <div className="flex gap-1">
                                {images.slice(0, 2).map((image, index) => (
                                  <div
                                    key={index}
                                    className="h-8 rounded overflow-hidden flex-shrink-0"
                                  >
                                    <img
                                      src={image}
                                      alt={`${deck.archetype} image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
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
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{deck.archetype}</h3>
                        <div className="text-sm text-muted-foreground">
                          {deck.totalAppearances} הופעות בטורנירים
                        </div>
                      </div>
                      {images.length > 0 && (
                        <div className="flex gap-1">
                          {images.slice(0, 2).map((image, index) => (
                            <div
                              key={index}
                              className="w-12 h-12 rounded overflow-hidden flex-shrink-0"
                            >
                              <img
                                src={image}
                                alt={`${deck.archetype} image ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Performance Stats */}
                    <div className="grid grid-cols-2 gap-4 py-3 border-t border-border">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">מיקום ממוצע</div>
                        <div className="text-xl font-bold flex items-center justify-center gap-1">
                          <span>{deck.averagePosition.toFixed(1)}</span>
                          {deck.averagePosition <= 3 && (
                            <TrendingUp className="h-4 w-4 text-success" />
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">נקודות ממוצעות</div>
                        <div className="text-xl font-bold">{deck.averagePoints.toFixed(1)}</div>
                      </div>
                    </div>

                    {/* Podium Finishes */}
                    <div className="grid grid-cols-3 gap-4 py-3 border-t border-border">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {getPositionIcon(1)}
                          <span className="text-sm text-muted-foreground">מקום 1</span>
                        </div>
                        <div className="text-lg font-bold">{deck.firstPlaceFinishes}</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {getPositionIcon(2)}
                          <span className="text-sm text-muted-foreground">מקום 2</span>
                        </div>
                        <div className="text-lg font-bold">{deck.secondPlaceFinishes}</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {getPositionIcon(3)}
                          <span className="text-sm text-muted-foreground">מקום 3</span>
                        </div>
                        <div className="text-lg font-bold">{deck.thirdPlaceFinishes}</div>
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="text-center pt-3 border-t border-border">
                      <div className="text-sm text-muted-foreground mb-1">אחוז הצלחה (טופ 3)</div>
                      <div className={`text-2xl font-bold ${
                        deck.winRate >= 50 ? 'text-success' : 
                        deck.winRate >= 25 ? 'text-warning' : 'text-muted-foreground'
                      }`}>
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
  );
}
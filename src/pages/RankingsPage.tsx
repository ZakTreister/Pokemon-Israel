import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { fetchDecks } from '../features/decks/decksSlice';
import { Card } from '../components/ui/Card';
import { Search, Trophy, Medal, Award, Calendar } from 'lucide-react';
import Button from '../components/ui/Button';

interface PlayerRanking {
  playerId: string;
  playerName: string;
  points: number;
  tournaments: number;
  bestRank: number;
  deck?: string;
}

export default function RankingsPage() {
  const dispatch = useAppDispatch();
  const { tournaments, isLoading } = useAppSelector((state) => state.tournaments);
  const { decks } = useAppSelector((state) => state.decks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(2025);

  useEffect(() => {
    dispatch(fetchTournaments());
    dispatch(fetchDecks());
  }, [dispatch]);

  // Filter tournaments by year
  const tournamentsForYear = (tournaments || []).filter(tournament => {
    const tournamentYear = new Date(tournament.date).getFullYear();
    return tournamentYear === selectedYear;
  });

  // Calculate player rankings from tournament results for the selected year
  const playerRankings = tournamentsForYear.reduce<Record<string, PlayerRanking>>((acc, tournament) => {
    if (tournament.results) {
      tournament.results.forEach(result => {
        // Get player ID and name
        let playerId: string;
        let playerName: string;
        
        if (typeof result.player === 'string') {
          playerId = result.player;
          // Use playerName from result if available, otherwise fallback to player ID
          playerName = result.playerName || result.player;
        } else if (result.player && typeof result.player === 'object') {
          playerId = result.player._id || result.player.id;
          // Use playerName from result if available, otherwise fallback to username
          playerName = result.playerName || result.player.username || result.player.name || playerId;
        } else {
          return; // Skip invalid player data
        }
        
        if (!acc[playerId]) {
          acc[playerId] = {
            playerId,
            playerName,
            points: 0,
            tournaments: 0,
            bestRank: Infinity,
            deck: result.deck,
          };
        }

        acc[playerId].points += result.points;
        acc[playerId].tournaments += 1;
        acc[playerId].bestRank = Math.min(acc[playerId].bestRank, result.position);
        
        // Update most used deck if provided
        if (result.deck) {
          acc[playerId].deck = result.deck;
        }
      });
    }
    return acc;
  }, {});

  // Convert to array and sort by points
  const sortedRankings = Object.values(playerRankings)
    .sort((a, b) => b.points - a.points)
    .filter(player => 
      player.playerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Get deck information with icons
  const getDeckInfo = (deckId: string) => {
    const deck = (decks || []).find(d => d.id === deckId);
    if (!deck) return { name: 'לא ידוע', icons: [] };
    
    const icons = [];
    if (deck.iconImage1) icons.push(deck.iconImage1);
    if (deck.iconImage2) icons.push(deck.iconImage2);
    
    return {
      name: deck.archetype,
      icons: icons
    };
  };

  // Get available years from tournaments
  const availableYears = [...new Set((tournaments || []).map(tournament => 
    new Date(tournament.date).getFullYear()
  ))].sort((a, b) => b - a); // Sort descending (newest first)

  return (
    <div className="container py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4">טבלת דירוג {selectedYear}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          דירוג השחקנים המובילים בליגה לשנת {selectedYear}
        </p>
      </div>

      {/* Year Selection and Search */}
      <div className="mb-8 space-y-4">
        {/* Year Selection */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Calendar size={18} className="text-muted-foreground mx-2" />
            {availableYears.length > 0 ? (
              availableYears.map(year => (
                <Button
                  key={year}
                  size="sm"
                  variant={selectedYear === year ? 'default' : 'ghost'}
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </Button>
              ))
            ) : (
              <Button size="sm" variant="default">
                2025
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="חפש שחקן..."
            className="w-full pl-3 pr-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Rankings Table */}
      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען דירוגים...</div>
      ) : (
        <Card>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border text-right">
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">דירוג</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שחקן</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">נקודות</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">טורנירים</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">מיקום הטוב ביותר</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">דק מועדף</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">אייקונים</th>
                </tr>
              </thead>
              <tbody>
                {sortedRankings.map((player, index) => {
                  const deckInfo = player.deck ? getDeckInfo(player.deck) : { name: '-', icons: [] };
                  
                  return (
                    <tr key={player.playerId} className="border-b border-border">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{index + 1}</span>
                          {index === 0 && <Trophy className="h-5 w-5 text-primary" />}
                          {index === 1 && <Medal className="h-5 w-5 text-secondary" />}
                          {index === 2 && <Award className="h-5 w-5 text-accent" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{player.playerName}</td>
                      <td className="px-4 py-3 font-bold text-primary">{player.points}</td>
                      <td className="px-4 py-3">{player.tournaments}</td>
                      <td className="px-4 py-3">
                        {player.bestRank === Infinity ? '-' : player.bestRank}
                      </td>
                      <td className="px-4 py-3">{deckInfo.name}</td>
                      <td className="px-4 py-3">
                        {deckInfo.icons.length > 0 && (
                          <div className="flex gap-1">
                            {deckInfo.icons.map((icon, iconIndex) => (
                              <div
                                key={iconIndex}
                                className="w-6 h-6 rounded overflow-hidden flex-shrink-0"
                              >
                                <img
                                  src={icon}
                                  alt={`${deckInfo.name} icon ${iconIndex + 1}`}
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
                {sortedRankings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      {tournamentsForYear.length === 0 
                        ? `לא נמצאו טורנירים לשנת ${selectedYear}`
                        : 'לא נמצאו שחקנים'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 p-4">
            {sortedRankings.map((player, index) => {
              const deckInfo = player.deck ? getDeckInfo(player.deck) : { name: '-', icons: [] };
              
              return (
                <Card key={player.playerId} className="p-4">
                  <div className="space-y-3">
                    {/* Rank and Player */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">#{index + 1}</span>
                        {index === 0 && <Trophy className="h-6 w-6 text-primary" />}
                        {index === 1 && <Medal className="h-6 w-6 text-secondary" />}
                        {index === 2 && <Award className="h-6 w-6 text-accent" />}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{player.playerName}</div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 py-3 border-t border-border">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">נקודות</div>
                        <div className="text-xl font-bold text-primary">{player.points}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">טורנירים</div>
                        <div className="text-xl font-bold">{player.tournaments}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">מיקום הטוב</div>
                        <div className="text-xl font-bold">
                          {player.bestRank === Infinity ? '-' : player.bestRank}
                        </div>
                      </div>
                    </div>

                    {/* Deck Info */}
                    <div className="flex justify-between items-center pt-3 border-t border-border">
                      <span className="text-sm text-muted-foreground">דק מועדף</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{deckInfo.name}</span>
                        {deckInfo.icons.length > 0 && (
                          <div className="flex gap-1">
                            {deckInfo.icons.map((icon, iconIndex) => (
                              <div
                                key={iconIndex}
                                className="w-6 h-6 rounded overflow-hidden flex-shrink-0"
                              >
                                <img
                                  src={icon}
                                  alt={`${deckInfo.name} icon ${iconIndex + 1}`}
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
                    </div>
                  </div>
                </Card>
              );
            })}
            
            {sortedRankings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {tournamentsForYear.length === 0 
                  ? `לא נמצאו טורנירים לשנת ${selectedYear}`
                  : 'לא נמצאו שחקנים'
                }
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Year Summary */}
      {tournamentsForYear.length > 0 && (
        <div className="mt-8 text-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Card className="p-4">
              <div className="text-2xl font-bold text-primary">{tournamentsForYear.length}</div>
              <div className="text-sm text-muted-foreground">טורנירים בשנת {selectedYear}</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-primary">{sortedRankings.length}</div>
              <div className="text-sm text-muted-foreground">שחקנים פעילים</div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
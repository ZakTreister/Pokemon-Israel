import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { fetchDecks } from '../features/decks/decksSlice';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { PageHero } from '../components/ui/PageHero';
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

  const tournamentsForYear = (tournaments || []).filter(tournament => {
    const tournamentYear = new Date(tournament.date).getFullYear();
    return tournamentYear === selectedYear;
  });

  const playerRankings = tournamentsForYear.reduce<Record<string, PlayerRanking>>((acc, tournament) => {
    if (tournament.results) {
      tournament.results.forEach(result => {
        let playerId: string;
        let playerName: string;

        if (typeof result.player === 'string') {
          playerId = result.player;
          playerName = result.playerName || result.player;
        } else if (result.player && typeof result.player === 'object') {
          playerId = result.player._id || result.player.id;
          playerName = result.playerName || result.player.username || result.player.name || playerId;
        } else {
          return;
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
        if (result.deck) {
          acc[playerId].deck = result.deck;
        }
      });
    }
    return acc;
  }, {});

  const sortedRankings = Object.values(playerRankings)
    .sort((a, b) => b.points - a.points)
    .filter(player =>
      player.playerName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getDeckInfo = (deckId: string) => {
    const deck = (decks || []).find(d => d.id === deckId);
    if (!deck) return { name: 'לא ידוע', icons: [] };

    const icons = [];
    if (deck.iconImage1) icons.push(deck.iconImage1);
    if (deck.iconImage2) icons.push(deck.iconImage2);

    return { name: deck.archetype, icons: icons };
  };

  const availableYears = [...new Set((tournaments || []).map(tournament =>
    new Date(tournament.date).getFullYear()
  ))].sort((a, b) => b - a);

  const getRankBadgeVariant = (index: number): 'rank-1' | 'rank-2' | 'rank-3' | 'neutral' => {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return 'neutral';
  };

  return (
    <div>
      <PageHero
        title={`טבלת דירוג ${selectedYear}`}
        highlightWord={String(selectedYear)}
        subtitle={`דירוג השחקנים המובילים בליגה לשנת ${selectedYear}`}
      />

      <div className="container py-12">
        {/* Year Selection and Search */}
        <div className="mb-8 space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1.5 shadow-card">
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
                <Button size="sm" variant="default">2025</Button>
              )}
            </div>
          </div>

          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="חפש שחקן..."
              className="w-full pl-3 pr-10 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-card text-card-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse text-center py-12 text-muted-foreground">טוען דירוגים...</div>
        ) : (
          <Card className="overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-700 text-right">
                    <th className="px-4 py-3.5 text-sm font-bold text-blue-100">דירוג</th>
                    <th className="px-4 py-3.5 text-sm font-bold text-blue-100">שחקן</th>
                    <th className="px-4 py-3.5 text-sm font-bold text-blue-100">נקודות</th>
                    <th className="px-4 py-3.5 text-sm font-bold text-blue-100">טורנירים</th>
                    <th className="px-4 py-3.5 text-sm font-bold text-blue-100">מיקום הטוב ביותר</th>
                    <th className="px-4 py-3.5 text-sm font-bold text-blue-100">דק בשימוש</th>
                    <th className="px-4 py-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRankings.map((player, index) => {
                    const deckInfo = player.deck ? getDeckInfo(player.deck) : { name: '-', icons: [] };
                    return (
                      <tr key={player.playerId} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={getRankBadgeVariant(index)} className="h-7 w-7 items-center justify-center rounded-full text-sm">
                              {index + 1}
                            </Badge>
                            {index === 0 && <Trophy className="h-4 w-4 text-gold-600" />}
                            {index === 1 && <Medal className="h-4 w-4 text-slate-400" />}
                            {index === 2 && <Award className="h-4 w-4 text-amber-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">{player.playerName}</td>
                        <td className="px-4 py-3">
                          <span className="text-xl font-extrabold text-blue-500">{player.points}</span>
                        </td>
                        <td className="px-4 py-3 font-medium">{player.tournaments}</td>
                        <td className="px-4 py-3 font-medium">
                          {player.bestRank === Infinity ? '-' : player.bestRank}
                        </td>
                        <td className="px-4 py-3 text-sm">{deckInfo.name}</td>
                        <td className="px-4 py-3">
                          {deckInfo.icons.length > 0 && (
                            <div className="flex gap-1">
                              {deckInfo.icons.map((icon, iconIndex) => (
                                <div key={iconIndex} className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
                                  <img
                                    src={icon}
                                    alt={`${deckInfo.name} icon ${iconIndex + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
                          : 'לא נמצאו שחקנים'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-line-light">
              {sortedRankings.map((player, index) => {
                const deckInfo = player.deck ? getDeckInfo(player.deck) : { name: '-', icons: [] };
                return (
                  <div key={player.playerId} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={getRankBadgeVariant(index)} className="h-8 w-8 items-center justify-center rounded-full text-sm">
                          {index + 1}
                        </Badge>
                        {index === 0 && <Trophy className="h-5 w-5 text-gold-600" />}
                        {index === 1 && <Medal className="h-5 w-5 text-slate-400" />}
                        {index === 2 && <Award className="h-5 w-5 text-amber-500" />}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-foreground">{player.playerName}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <StatCard value={player.points} label="נקודות" accent="blue" />
                      <StatCard value={player.tournaments} label="טורנירים" accent="navy" />
                      <StatCard value={player.bestRank === Infinity ? '-' : player.bestRank} label="מיקום הטוב" accent="gold" />
                    </div>
                    {deckInfo.name !== '-' && (
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">דק בשימוש</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{deckInfo.name}</span>
                          {deckInfo.icons.length > 0 && (
                            <div className="flex gap-1">
                              {deckInfo.icons.map((icon, iconIndex) => (
                                <div key={iconIndex} className="h-6 rounded overflow-hidden flex-shrink-0">
                                  <img
                                    src={icon}
                                    alt={`${deckInfo.name} icon ${iconIndex + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {sortedRankings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {tournamentsForYear.length === 0
                    ? `לא נמצאו טורנירים לשנת ${selectedYear}`
                    : 'לא נמצאו שחקנים'}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Year Summary */}
        {tournamentsForYear.length > 0 && (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <StatCard value={tournamentsForYear.length} label={`טורנירים ב-${selectedYear}`} accent="blue" />
            <StatCard value={sortedRankings.length} label="שחקנים פעילים" accent="gold" />
          </div>
        )}
      </div>
    </div>
  );
}

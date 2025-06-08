import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { fetchDecks } from '../features/decks/decksSlice';
import { Card } from '../components/ui/Card';
import { Search, Trophy, Medal, Award } from 'lucide-react';

interface PlayerRanking {
  username: string;
  points: number;
  tournaments: number;
  bestRank: number;
  winRate: number;
  deck?: string;
}

export default function RankingsPage() {
  const dispatch = useAppDispatch();
  const { tournaments, isLoading } = useAppSelector((state) => state.tournaments);
  const { decks } = useAppSelector((state) => state.decks);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchTournaments());
    dispatch(fetchDecks());
  }, [dispatch]);

  // Calculate player rankings from tournament results
  const playerRankings = (tournaments || []).reduce<Record<string, PlayerRanking>>((acc, tournament) => {
    if (tournament.results) {
      tournament.results.forEach(result => {
        const playerName = result.player;
        
        if (!acc[playerName]) {
          acc[playerName] = {
            username: playerName,
            points: 0,
            tournaments: 0,
            bestRank: Infinity,
            winRate: 0,
            deck: result.deck,
          };
        }

        acc[playerName].points += result.points;
        acc[playerName].tournaments += 1;
        acc[playerName].bestRank = Math.min(acc[playerName].bestRank, result.position);
        
        // Update win rate based on GWP
        const currentWinRate = acc[playerName].winRate;
        const newWinRate = result.gwp;
        acc[playerName].winRate = (currentWinRate * (acc[playerName].tournaments - 1) + newWinRate) / acc[playerName].tournaments;
        
        // Update most used deck if provided
        if (result.deck) {
          acc[playerName].deck = result.deck;
        }
      });
    }
    return acc;
  }, {});

  // Convert to array and sort by points
  const sortedRankings = Object.values(playerRankings)
    .sort((a, b) => b.points - a.points)
    .filter(player => 
      player.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Get deck name by ID
  const getDeckName = (deckId: string) => {
    const deck = (decks || []).find(d => d.id === deckId);
    return deck ? deck.archetype : 'לא ידוע';
  };

  return (
    <div className="container py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4">טבלת דירוג</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          דירוג השחקנים המובילים בליגה
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border text-right">
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">דירוג</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שחקן</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">נקודות</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">טורנירים</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">מיקום הטוב ביותר</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">אחוז ניצחונות</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">דק מועדף</th>
                </tr>
              </thead>
              <tbody>
                {sortedRankings.map((player, index) => (
                  <tr key={player.username} className="border-b border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{index + 1}</span>
                        {index === 0 && <Trophy className="h-5 w-5 text-primary" />}
                        {index === 1 && <Medal className="h-5 w-5 text-secondary" />}
                        {index === 2 && <Award className="h-5 w-5 text-accent" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{player.username}</td>
                    <td className="px-4 py-3">{player.points}</td>
                    <td className="px-4 py-3">{player.tournaments}</td>
                    <td className="px-4 py-3">
                      {player.bestRank === Infinity ? '-' : player.bestRank}
                    </td>
                    <td className="px-4 py-3">
                      {player.winRate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      {player.deck ? getDeckName(player.deck) : '-'}
                    </td>
                  </tr>
                ))}
                {sortedRankings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      לא נמצאו שחקנים
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
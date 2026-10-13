import type { TeamRosterPlayer } from '../../../types/team';
import type { AllStarsRanking } from '../../../types/internalTournament';
export function rankedTeamMembers(
  players: TeamRosterPlayer[],
  rankings: AllStarsRanking[],
) {
  const byPlayer = new Map(rankings.map((rank) => [rank.playerId, rank]));
  return players.map((player) => ({
    ...player,
    position: byPlayer.get(player.id)?.position ?? null,
    points: byPlayer.get(player.id)?.points ?? null,
    tournaments: byPlayer.get(player.id)?.tournaments ?? null,
  }));
}

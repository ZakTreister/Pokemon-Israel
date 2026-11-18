import { calculateStandings } from './swiss.js';
import { calculateInterTeamScore } from './interTeamScore.js';

const id = value => String(value?._id ?? value);

/**
 * The viewer receives stable event-local aliases, never canonical child
 * Player IDs, Team IDs, match IDs, creator IDs or result-entering staff IDs.
 * The aliases are stable because historical participants are never removed.
 */
export function publicInterTeamMeeting(doc) {
  const teams = (doc.interTeamSides ?? []).map((side, index) => ({
    team: `team-${index+1}`,
    nameSnapshot: side.nameSnapshot,
    logoSnapshot: side.logoSnapshot || '',
  }));
  const teamAliases = new Map(
    (doc.interTeamSides ?? []).map((side,index) => [id(side.team),`team-${index+1}`]),
  );
  const playerAliases = new Map(
    (doc.playerParticipants ?? []).map((row,index) => [id(row.player),`player-${index+1}`]),
  );
  const anon = value => value == null ? null : playerAliases.get(id(value)) ?? null;
  return {
    id: doc.id,
    title: doc.title,
    date: doc.date,
    phase: doc.phase,
    status: doc.status,
    teams,
    participants: (doc.playerParticipants ?? []).map(row => ({
      player: anon(row.player),
      team: teamAliases.get(id(row.team)),
      nameSnapshot: row.nameSnapshot,
    })),
    rounds: (doc.rounds ?? []).map(round => ({
      number: round.number,
      benchPlayerIds: (round.benchPlayerIds ?? []).map(anon),
      matches: round.matches.map((match,index) => ({
        id: `round-${round.number}-match-${index+1}`,
        table: match.table,
        player1: anon(match.player1),
        player2: anon(match.player2),
        result: match.result
          ? {
              winner: match.result.winner,
              score1: match.result.score1,
              score2: match.result.score2,
              drawnGames: match.result.drawnGames || 0,
            }
          : null,
      })),
    })),
    standings: calculateStandings(doc.playerParticipants,doc.rounds).map(row => ({
      player: anon(row.player),
      playerName: row.playerName,
      points: row.points,
      position: row.position,
    })),
    teamScore: calculateInterTeamScore(doc).map(row => ({
      ...row,
      team: teamAliases.get(row.team),
    })),
  };
}

const id = value => String(value?._id ?? value);

/**
 * Compute the actual meeting scoreboard from completed cross-team matches.
 * Bench players are deliberately not counted, and match wins are not
 * confused with individual Swiss ranking points.
 */
export function calculateInterTeamScore(tournament) {
  const teams = (tournament.interTeamSides ?? []).map(side => id(side.team));
  const scores = teams.map(team => ({
    team, matchWins: 0, matchDraws: 0, gameWins: 0, gameDraws: 0, gamesPlayed: 0,
  }));
  const teamsByPlayer = new Map(
    (tournament.playerParticipants ?? []).map(row => [id(row.player), id(row.team)]),
  );
  for (const round of tournament.rounds ?? []) {
    for (const match of round.matches ?? []) {
      if (!match.player2 || !match.result || match.result.winner === 'bye') continue;
      const first = teams.indexOf(teamsByPlayer.get(id(match.player1)));
      const second = teams.indexOf(teamsByPlayer.get(id(match.player2)));
      if (first < 0 || second < 0 || first === second)
        throw new Error('Invalid inter-team pairing in saved competition');
      const result = match.result;
      scores[first].gameWins += result.score1 ?? 0;
      scores[second].gameWins += result.score2 ?? 0;
      scores[first].gameDraws += result.drawnGames ?? 0;
      scores[second].gameDraws += result.drawnGames ?? 0;
      const played = (result.score1 ?? 0) + (result.score2 ?? 0) + (result.drawnGames ?? 0);
      scores[first].gamesPlayed += played;
      scores[second].gamesPlayed += played;
      if (result.winner === 'draw') {
        scores[first].matchDraws++;
        scores[second].matchDraws++;
      } else {
        scores[result.winner === 'player1' ? first : second].matchWins++;
      }
    }
  }
  return scores;
}

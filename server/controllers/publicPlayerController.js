import asyncHandler from 'express-async-handler';
import Player from '../models/playerModel.js';
import BadgeAward from '../models/badgeAwardModel.js';
import '../models/badgeDefinitionModel.js';
import { allStarsRankingData } from './internalTournamentController.js';

export const getPublicTeamPlayer = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    res.status(404);
    throw new Error('Player not found');
  }
  const player = await Player.findOne({
    _id: req.params.id,
    playerType: 'team',
  })
    .select('firstName lastName city team')
    .populate('team', 'name logo');
  if (!player) {
    res.status(404);
    throw new Error('Player not found');
  }
  const [overall, insideTeam, awards] = await Promise.all([
    allStarsRankingData(),
    player.team
      ? allStarsRankingData(player.team.id)
      : Promise.resolve({ rankings: [] }),
    BadgeAward.find({ player: player._id })
      .select('badge awardedAt')
      .populate('badge', 'name description icon'),
  ]);
  const ranking = (data) => {
    const row = data.rankings.find((row) => row.playerId === player.id);
    return row
      ? {
          position: row.position,
          points: row.points,
          tournaments: row.tournaments,
        }
      : null;
  };
  // Explicit allowlist; never serialize the staff Player/User document.
  res.json({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    city: player.city,
    team: player.team
      ? { id: player.team.id, name: player.team.name, logo: player.team.logo }
      : null,
    overallRanking: ranking(overall),
    teamRanking: ranking(insideTeam),
    badges: awards
      .filter((award) => award.badge)
      .map((award) => ({
        name: award.badge.name,
        description: award.badge.description,
        icon: award.badge.icon,
        awardedAt: award.awardedAt,
      })),
  });
});

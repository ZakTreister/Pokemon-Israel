import { playerAge } from '../services/playerProfile.js';
import { publicMediaUrl } from '../services/storage/mediaMetadata.js';
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
    .select('firstName lastName city playerNumber team description dateOfBirth photoMedia')
    .populate('team', 'name logo logoMedia');
  if (!player) {
    res.status(404);
    throw new Error('Player not found');
  }
  const [insideTeam, awards] = await Promise.all([
    player.team
      ? allStarsRankingData(player.team.id)
      : Promise.resolve({ rankings: [] }),
    BadgeAward.find({ player: player._id, revokedAt: null })
      .select('badge awardedAt season')
      .populate('badge', 'name description icon image imageMedia')
      .populate('season', 'name deletedAt'),
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
    ...(player.description ? {description:player.description} : {}),
    ...(player.dateOfBirth ? {age:playerAge(player.dateOfBirth)} : {}),
    ...(publicMediaUrl(player.photoMedia) ? {photoUrl:publicMediaUrl(player.photoMedia)} : {}),
    team: player.team
      ? { id: player.team.id, name: player.team.name, logo: player.team.toJSON().logo }
      : null,
    playerNumber: player.playerNumber || '',
    teamRanking: ranking(insideTeam),
    badges: awards
      .filter((award) => award.badge)
      .map((award) => ({
        name: award.badge.name,
        description: award.badge.description,
        icon: award.badge.icon,
        ...(award.badge.toJSON().image ? {image:award.badge.toJSON().image} : {}),
        ...(award.season && !award.season.deletedAt ? {seasonName:award.season.name} : {}),
        awardedAt: award.awardedAt,
      })),
  });
});

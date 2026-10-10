import User from '../models/userModel.js';
import asyncHandler from 'express-async-handler';
import Team, { normalizeTeamName } from '../models/teamModel.js';
import Player from '../models/playerModel.js';
import Tournament from '../models/tournamentModel.js';
import { withRosterLocks } from '../services/rosterLock.js';
import { OPEN_INTERNAL_FILTER } from '../services/openInternalTournament.js';

const fail = (statusCode, message) => { const error = new Error(message); error.statusCode = statusCode; throw error; };
export function validateLogo(logo) {
  if (typeof logo !== 'string' || logo.length > 2000 || (logo && !/^https?:\/\//i.test(logo) && !/^\/(?!\/)/.test(logo))) fail(400, 'כתובת הסמל חייבת להיות כתובת HTTP/HTTPS או נתיב מקומי');
  if (/^https?:\/\//i.test(logo)) {
    try { new URL(logo); } catch { fail(400, 'כתובת סמל לא חוקית'); }
  }
  return logo.trim();
}
function validatePublicId(value = '') {
  if (typeof value !== 'string' || value.length > 255 || (value && !/^[a-z\d_/-]+$/i.test(value))) fail(400, 'מזהה תמונה לא חוקי');
  return value;
}
async function validateTeacher(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value) || !await User.exists({ _id: value, role: { $in: ['admin', 'judge'] } }))
    fail(400, 'יש לבחור מורה קיים מתוך צוות המנהלים והשופטים');
  return value;
}
export const getTeachers = asyncHandler(async (req, res) => {
  res.json(await User.find({ role: { $in: ['admin', 'judge'] } }).select('name role').sort({ name: 1 }));
});
export const getMyTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({ teacher: req.user._id }).populate('teacher', 'name role').sort({ normalizedName: 1 });
  res.json(await Promise.all(teams.map(async team => ({ ...team.toJSON(), ...await counts(team), openInternalTournament: await openForTeam(team) }))));
});
async function counts(team) {
  const [playerCount, completedInternalTournamentCount] = await Promise.all([
    Player.countDocuments({ team: team._id, isActive: true, playerType: 'team' }),
    Tournament.countDocuments({ team: team._id, type: 'team_internal', engineVersion: 'swiss-v1', status: 'completed' }),
  ]);
  return { playerCount, completedInternalTournamentCount };
}
const publicTeam = async team => ({ id: team.id, name: team.name, logo: team.logo || '', isActive: team.isActive, ...await counts(team), officialStats: null });
async function openForTeam(team) {
  const open = await Tournament.findOne({ ...OPEN_INTERNAL_FILTER, team: team._id }).select('phase');
  return open ? { id: open.id, phase: open.phase } : null;
}

export const getPublicTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({ isActive: true }).sort({ normalizedName: 1 });
  res.json(await Promise.all(teams.map(publicTeam)));
});
export const getPublicTeam = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ _id: req.params.id, isActive: true });
  if (!team) fail(404, 'נבחרת לא נמצאה');
  const players = await Player.find({ team: team._id, playerType: 'team', isActive: true }).select('firstName lastName city').sort({ firstName: 1, lastName: 1 });
  res.json({ ...await publicTeam(team), players });
});
export const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({}).populate('createdBy', 'username name').populate('teacher', 'name role').sort({ normalizedName: 1 });
  const open = await Tournament.find(OPEN_INTERNAL_FILTER).select('team phase');
  const byTeam = new Map(open.map(t => [String(t.team), { id: t.id, phase: t.phase }]));
  res.json(await Promise.all(teams.map(async team => ({ ...team.toJSON(), ...await counts(team), openInternalTournament: byTeam.get(team.id) || null }))));
});
export const getManageablePlayers = asyncHandler(async (req, res) => {
  res.json(await Player.find({ playerType: 'team' }).populate('team', 'name logo isActive').select('firstName lastName city isActive team').sort({ firstName: 1, lastName: 1 }));
});
export const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id).populate('createdBy', 'username name').populate('teacher', 'name role');
  if (!team) fail(404, 'נבחרת לא נמצאה');
  const players = await Player.find({ team: team._id, playerType: 'team', isActive: true }).select('firstName lastName city isActive team').sort({ firstName: 1, lastName: 1 });
  const open = await Tournament.findOne({ ...OPEN_INTERNAL_FILTER, team: team._id }).select('phase');
  res.json({ ...team.toJSON(), ...await counts(team), players, openInternalTournament: open ? { id: open.id, phase: open.phase } : null });
});
export const createTeam = asyncHandler(async (req, res) => {
  const { name, logo = '', logoPublicId = '', teacher } = req.body;
  if (typeof name !== 'string' || !name.trim()) fail(400, 'שם נבחרת הוא שדה חובה');
  const teacherId = await validateTeacher(teacher);
  try {
    const team = await Team.create({ teacher: teacherId, name: name.trim(), normalizedName: normalizeTeamName(name), logo: validateLogo(logo), logoPublicId: validatePublicId(logoPublicId), createdBy: req.user._id });
    await team.populate([{ path: 'createdBy', select: 'username name' }, { path: 'teacher', select: 'name role' }]);
    res.status(201).json({ ...team.toJSON(), playerCount: 0, completedInternalTournamentCount: 0 });
  } catch (error) { if (error.code === 11000) fail(409, 'נבחרת בשם זה כבר קיימת'); throw error; }
});
export const updateTeam = asyncHandler(async (req, res) => {
  const output = await withRosterLocks([req.params.id], async () => {
    const team = await Team.findById(req.params.id);
    if (!team) fail(404, 'נבחרת לא נמצאה');
    const { name, logo, logoPublicId, isActive, teacher } = req.body;
    if (teacher !== undefined) team.teacher = await validateTeacher(teacher);
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) fail(400, 'שם נבחרת הוא שדה חובה');
      team.name = name.trim();
      team.normalizedName = normalizeTeamName(name);
    }
    if (logo !== undefined) { team.logo = validateLogo(logo); team.logoPublicId = validatePublicId(logoPublicId); }
    else if (logoPublicId !== undefined) team.logoPublicId = validatePublicId(logoPublicId);
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') fail(400, 'מצב נבחרת לא חוקי');
      if (!isActive && await Player.exists({ team: team._id, isActive: true })) fail(409, 'יש להעביר או להסיר את השחקנים הפעילים לפני השבתת הנבחרת');
      team.isActive = isActive;
    }
    try { await team.save(); } catch (error) { if (error.code === 11000) fail(409, 'נבחרת בשם זה כבר קיימת'); throw error; }
    await team.populate('teacher', 'name role');
    return { ...team.toJSON(), ...await counts(team), openInternalTournament: await openForTeam(team) };
  });
  res.json(output);
});
export const assignPlayerToTeam = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.playerId);
  if (!player) fail(404, 'שחקן לא נמצא');
  const output = await withRosterLocks([player.team, req.params.teamId], async () => {
    const team = await Team.findById(req.params.teamId);
    if (!team?.isActive) fail(400, 'ניתן לשייך שחקן רק לנבחרת פעילה');
    if (player.playerType !== 'team' || !player.isActive) fail(400, 'ניתן לשייך רק שחקן נבחרת פעיל');
    const updated = await Player.findOneAndUpdate({ _id: player._id, team: player.team, isActive: true, playerType: 'team' }, { $set: { team: team._id } }, { new: true }).populate('team', 'name isActive');
    if (!updated) fail(409, 'שיוך השחקן השתנה. נא לרענן');
    return updated;
  });
  res.json(output);
});
export const removePlayerFromTeam = asyncHandler(async (req, res) => {
  const output = await withRosterLocks([req.params.teamId], async () => {
    const player = await Player.findOneAndUpdate({ _id: req.params.playerId, team: req.params.teamId, playerType: 'team' }, { $set: { team: null } }, { new: true });
    if (!player) fail(404, 'השחקן אינו משויך לנבחרת');
    return player;
  });
  res.json(output);
});
export const loadTeamPlayers = asyncHandler(async (req, res) => {
  const rows = req.body.players;
  if (!Array.isArray(rows) || !rows.length || rows.length > 128) fail(400, 'יש להזין בין 1 ל-128 שחקנים');
  const documents = rows.map(row => {
    if (!row || typeof row.firstName !== 'string' || !row.firstName.trim() || typeof row.lastName !== 'string' || !row.lastName.trim() || (row.city !== undefined && typeof row.city !== 'string')) fail(400, 'שם פרטי ושם משפחה הם שדות חובה; עיר היא טקסט');
    return new Player({ firstName: row.firstName.trim(), lastName: row.lastName.trim(), city: row.city?.trim() || '', playerType: 'team', team: req.params.teamId, user: null });
  });
  const output = await withRosterLocks([req.params.teamId], async () => {
    const team = await Team.findById(req.params.teamId);
    if (!team?.isActive) fail(400, 'לא ניתן לטעון ילדים לנבחרת לא פעילה');
    await Promise.all(documents.map(doc => doc.validate()));
    try { return await Player.insertMany(documents, { ordered: true }); }
    catch (error) { await Player.deleteMany({ _id: { $in: documents.map(doc => doc._id) } }); throw error; }
  });
  res.status(201).json(output);
});

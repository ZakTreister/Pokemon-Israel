import type { InternalTournament } from '../../../types/internalTournament';
import type { TeamRosterPlayer } from '../../../types/team';
import { participantOptions } from './participantOptions';
export const participantPlan = (t: InternalTournament) =>
  t.nextRoundParticipantIds ?? t.playerParticipants.map((p) => p.player);
export const sameSelection = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));
export function participantPlanOptions(
  t: InternalTournament,
  roster: TeamRosterPlayer[],
) {
  return participantOptions(t.playerParticipants, roster).map((option) => ({
    ...option,
    disabled: !roster.some((player) => player.id === option.id),
  }));
}

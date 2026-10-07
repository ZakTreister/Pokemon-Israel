import type { InternalParticipant } from '../../../types/internalTournament';
import type { TeamRosterPlayer } from '../../../types/team';

export interface ParticipantOption {
  id: string;
  label: string;
}

export function participantOptions(
  participants: InternalParticipant[],
  roster: TeamRosterPlayer[],
): ParticipantOption[] {
  return [
    ...participants.map((p) => ({ id: p.player, label: p.nameSnapshot })),
    ...roster
      .filter((p) => !participants.some((row) => row.player === p.id))
      .map((p) => ({ id: p.id, label: `${p.firstName} ${p.lastName}` })),
  ];
}

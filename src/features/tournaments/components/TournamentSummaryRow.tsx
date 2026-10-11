import type { ReactNode } from 'react';
import {
  tournamentTypes,
  tournamentStatuses,
  type TournamentType,
  type TournamentLifecycle,
} from '../../../../shared/tournamentDomain';
export interface TournamentSummary {
  title: string;
  date: string;
  type: TournamentType;
  lifecycle: TournamentLifecycle;
  location?: string;
  teamNameSnapshot?: string;
  currentParticipants?: number;
}
export default function TournamentSummaryRow({
  tournament: t,
  actions,
}: {
  tournament: TournamentSummary;
  actions: ReactNode;
}) {
  return (
    <article className="border rounded-lg p-4 flex flex-wrap gap-3 items-center justify-between">
      <div className="min-w-0">
        <h3 className="font-bold break-words">{t.title}</h3>
        <p className="text-sm text-muted-foreground">
          {tournamentTypes[t.type]} · {tournamentStatuses[t.lifecycle]} ·{' '}
          {new Date(t.date).toLocaleDateString('he-IL')}
          {t.teamNameSnapshot ? ` · ${t.teamNameSnapshot}` : ''}
          {t.location && t.location !== t.teamNameSnapshot
            ? ` · ${t.location}`
            : ''}
          {t.currentParticipants !== undefined
            ? ` · ${t.currentParticipants} משתתפים`
            : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </article>
  );
}

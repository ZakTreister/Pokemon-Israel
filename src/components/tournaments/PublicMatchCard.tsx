import type { PublicTournamentRound } from '../../services/publicTournaments';

type PublicMatch = PublicTournamentRound['matches'][number];
export default function PublicMatchCard({ match }: { match: PublicMatch }) {
  const { result } = match;
  const finished = Boolean(result);
  const bye = !match.player2Name;
  const draw = result?.winner === 'draw';
  const winner = result?.winner;
  const playerClass = (selected: boolean) =>
    `min-w-0 rounded-lg border px-3 py-3 text-center text-sm sm:text-base font-semibold break-words ${selected
      ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
      : 'border-border bg-muted/50 text-foreground'}`;
  return (
    <article role="article" aria-label={`שולחן ${match.table}: ${match.player1Name} מול ${match.player2Name || 'BYE'}`}
      className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4 shadow-panel space-y-3">
      <header className="flex justify-between items-center gap-2">
        <h4 className="font-bold text-sm">שולחן {match.table}</h4>
        <span className={`text-xs font-medium ${finished ? 'text-emerald-700' : 'text-muted-foreground'}`}>
          {bye ? 'BYE' : finished ? 'תוצאה סופית' : 'טרם הוזנה תוצאה'}
        </span>
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-stretch">
        <div className={playerClass(winner === 'player1' || bye)}>
          {match.player1Name}
          {(winner === 'player1' || bye) && <span className="block text-xs font-normal mt-1">מנצח</span>}
        </div>
        <div className="flex items-center justify-center min-w-12 px-1 font-black tabular-nums" dir="ltr">
          {bye ? '3 נק׳' : result ? `${result.score1}–${result.score2}` : 'VS'}
        </div>
        <div className={playerClass(winner === 'player2')}>
          {match.player2Name || 'BYE'}
          {winner === 'player2' && <span className="block text-xs font-normal mt-1">מנצח</span>}
        </div>
      </div>
      {draw && <p className="text-center text-sm font-semibold">תיקו</p>}
      {result && result.drawnGames > 0 &&
        <p className="text-xs text-center text-muted-foreground">{result.drawnGames} משחקים בתיקו</p>}
    </article>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { InternalMatch, MatchResult } from '../types/internalTournament';
import Button from './ui/Button';
interface MatchEditorProps {
  match: InternalMatch;
  name: (id: string | null) => string;
  disabled: boolean;
  readOnly: boolean;
  discard: () => Promise<void>;
  revision: number;
  save: (
    result: MatchResult,
    revision: number,
  ) => Promise<'saved' | 'failed' | 'cancelled'>;
}
export default function MatchEditor({
  match,
  name,
  disabled,
  readOnly,
  discard,
  revision,
  save,
}: MatchEditorProps) {
  const [winner, setWinner] = useState<MatchResult['winner'] | ''>(
    match.result?.winner || '',
  );
  const [score, setScore] = useState(
    match.result ? `${match.result.score1}-${match.result.score2}` : '',
  );
  const [drawnGames, setDrawnGames] = useState(match.result?.drawnGames ?? 0);
  // The revision captured when this editor was loaded protects an unsaved draft
  // from silently replacing another judge's more recent result.
  const [draftRevision, setDraftRevision] = useState(revision);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const savingRef = useRef(false);
  useEffect(() => {
    if (!dirty) {
      setWinner(match.result?.winner || '');
      setScore(
        match.result ? `${match.result.score1}-${match.result.score2}` : '',
      );
      setDrawnGames(match.result?.drawnGames ?? 0);
      setDraftRevision(revision);
    }
  }, [match.result, revision, dirty]);
  const options =
    winner === 'player1'
      ? ['2-0', '2-1', '1-0']
      : winner === 'player2'
        ? ['0-2', '1-2', '0-1']
        : ['0-0', '1-1'];
  if (!match.player2)
    return (
      <div
        role="article"
        aria-label={`שולחן ${match.table}: ${name(match.player1)} · Bye`}
        className="min-w-0 border rounded-lg bg-card p-3 sm:p-4 shadow-panel"
      >
        <strong>
          שולחן {match.table}: {name(match.player1)}
        </strong>
        <p>Bye · 3 נקודות</p>
      </div>
    );
  return (
    <div
      role="article"
      aria-label={`שולחן ${match.table}: ${name(match.player1)} מול ${name(match.player2)}`}
      className="min-w-0 border rounded-lg bg-card p-3 sm:p-4 shadow-panel space-y-3"
    >
      <h3 className="text-sm font-bold">שולחן {match.table}</h3>
      {readOnly && (
        <p className="text-sm">
          {name(match.player1)} מול {name(match.player2)}
        </p>
      )}
      {readOnly ? (
        <p>
          {match.result
            ? `${match.result.winner === 'draw' ? 'תיקו' : name(match.result.winner === 'player1' ? match.player1 : match.player2)} · ${match.result.score1}–${match.result.score2}${match.result.drawnGames ? ` · ${match.result.drawnGames} משחקים בתיקו` : ''}`
            : 'טרם הוזנה תוצאה'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2">
            {(['player1', 'draw', 'player2'] as const).map((value) => (
              <Button
                contextual
                key={value}
                aria-pressed={winner === value}
                className="min-w-0 min-h-11 h-auto whitespace-normal break-words px-3 py-2 w-full"
                disabled={disabled || saving}
                variant={winner === value ? 'default' : 'outline'}
                onClick={() => {
                  setDirty(true);
                  setWinner(value);
                  setScore('');
                  setDrawnGames(0);
                }}
              >
                {value === 'draw'
                  ? 'תיקו'
                  : name(value === 'player1' ? match.player1 : match.player2)}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 gap-3 items-end">
            <label className="min-w-0 text-sm order-1">
              תוצאה (Bo3)
              <select
                aria-label={`תוצאה בשולחן ${match.table}`}
                disabled={!winner || disabled || saving}
                className="block w-full min-h-11 border rounded-md p-2 bg-background"
                value={score}
                onChange={(e) => {
                  setDirty(true);
                  setScore(e.target.value);
                  setDrawnGames(0);
                }}
              >
                <option value="">בחר ניקוד</option>
                {options.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-sm order-3 min-[360px]:col-span-2 min-[360px]:flex min-[360px]:items-center min-[360px]:gap-2 sm:order-2 sm:col-span-1 sm:block">
              משחקים בתיקו
              <input
                aria-label={`משחקים בתיקו בשולחן ${match.table}`}
                disabled={disabled || saving}
                type="number"
                min={0}
                max={
                  score
                    ? 3 -
                      score
                        .split('-')
                        .reduce((sum, value) => sum + Number(value), 0)
                    : 3
                }
                className="block border rounded-md p-2 w-full min-h-11 bg-background min-[360px]:w-20 sm:w-full"
                value={drawnGames}
                onChange={(e) => {
                  setDirty(true);
                  setDrawnGames(Number(e.target.value));
                }}
              />
            </label>
            <Button
              className="order-2 sm:order-3 min-h-11 whitespace-normal px-3"
              disabled={!winner || !score || disabled || saving}
              onClick={async () => {
                if (savingRef.current) return;
                savingRef.current = true;
                setSaving(true);
                setFailed(false);
                try {
                  const [score1, score2] = score.split('-').map(Number);
                  const outcome = await save(
                    {
                      winner: winner as MatchResult['winner'],
                      score1,
                      score2,
                      drawnGames,
                    },
                    draftRevision,
                  );
                  if (outcome === 'saved') setDirty(false);
                  if (outcome === 'failed') setFailed(true);
                } catch {
                  setFailed(true);
                } finally {
                  savingRef.current = false;
                  setSaving(false);
                }
              }}
            >
              {saving
                ? checking
                  ? 'בודק את המצב בשרת…'
                  : 'שומר את התוצאה…'
                : failed
                  ? 'נסה לשמור שוב'
                  : 'שמור תוצאה'}
            </Button>
          </div>
          {failed && (
            <Button
              className="h-auto min-h-12 whitespace-normal w-full py-3"
              variant="outline"
              disabled={disabled || saving}
              onClick={async () => {
                if (savingRef.current) return;
                savingRef.current = true;
                setSaving(true);
                setChecking(true);
                try {
                  await discard();
                  setDirty(false);
                  setFailed(false);
                } catch {
                  setFailed(true);
                } finally {
                  savingRef.current = false;
                  setSaving(false);
                  setChecking(false);
                }
              }}
            >
              בטל את השינוי והצג את התוצאה האחרונה מהשרת
            </Button>
          )}
          <p
            className={`text-xs ${match.result && !dirty && !failed && !saving ? 'text-green-700' : 'text-muted-foreground'}`}
            role="status"
            aria-live="polite"
          >
            {saving
              ? checking
                ? 'בודק את המצב האחרון בשרת…'
                : 'שומר את התוצאה… יש להמתין לאישור השמירה.'
              : failed
                ? 'השמירה לא אושרה. הבחירה נשארה כאן לניסיון נוסף; אין להמשיך לסיבוב הבא.'
                : dirty
                  ? 'יש שינויים שטרם נשמרו.'
                  : match.result
                    ? 'התוצאה נשמרה בשרת.'
                    : 'תוצאה זו עדיין לא נשמרה.'}
          </p>
        </>
      )}
    </div>
  );
}

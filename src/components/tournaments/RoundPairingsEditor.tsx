import { useState } from 'react';
import type { InternalRound } from '../../types/internalTournament';
import Button from '../ui/Button';
import { useConfirm } from '../ui/ConfirmProvider';

export interface PairingChange {
  matchId: string;
  table: number;
  player1: string;
  player2: string | null;
}
type Slot = { matchId: string; side: 'player1' | 'player2' };
interface Props {
  round: InternalRound;
  name: (player: string | null) => string;
  revision: number;
  disabled: boolean;
  onCancel: () => void;
  onSave: (matches: PairingChange[], clearResults: boolean, revision: number) => Promise<'saved' | 'failed'>;
}

/** Accessible tap-to-swap pairing editor; table order can be swapped too. */
export default function RoundPairingsEditor({ round, name, revision, disabled, onCancel, onSave }: Props) {
  const { showConfirm } = useConfirm();
  const [baseRevision] = useState(revision);
  const [matches, setMatches] = useState<PairingChange[]>(() => round.matches.map(match => ({
    matchId: match._id, table: match.table,
    player1: match.player1, player2: match.player2,
  })));
  const [selected, setSelected] = useState<Slot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const changed = matches.some(item => {
    const original = round.matches.find(match => match._id === item.matchId);
    return original && (original.player1 !== item.player1 || original.player2 !== item.player2 ||
      original.table !== item.table);
  });
  const stale = revision !== baseRevision;
  const swap = (slot: Slot) => {
    setError('');
    if (!selected) { setSelected(slot); return; }
    if (selected.matchId === slot.matchId && selected.side === slot.side) {
      setSelected(null);
      return;
    }
    setMatches(previous => {
      const next = previous.map(row => ({ ...row }));
      const first = next.find(row => row.matchId === selected.matchId);
      const second = next.find(row => row.matchId === slot.matchId);
      if (!first || !second) return previous;
      // Only player slots are selectable. Null (BYE) is never placed in player1.
      const value = first[selected.side];
      const other = second[slot.side];
      if (!value || !other) return previous;
      if (selected.side === 'player1') first.player1 = other;
      else first.player2 = other;
      if (slot.side === 'player1') second.player1 = value;
      else second.player2 = value;
      return next;
    });
    setSelected(null);
  };
  const changeTable = (matchId: string, table: number) => {
    setMatches(previous => {
      const next = previous.map(row => ({ ...row }));
      const current = next.find(row => row.matchId === matchId);
      const other = next.find(row => row.table === table);
      if (!current || !other) return previous;
      other.table = current.table;
      current.table = table;
      return next;
    });
  };
  const save = async () => {
    if (saving || disabled || stale || !changed) return;
    const affectsResults = matches.some(item => {
      const original = round.matches.find(match => match._id === item.matchId);
      return original && original.player2 && original.result &&
        (original.player1 !== item.player1 || original.player2 !== item.player2);
    });
    if (affectsResults && !(await showConfirm({
      title: 'אישור שינוי צימודים עם תוצאות',
      message: 'יש משחקים ששחקניהם השתנו וכבר נשמרו בהם תוצאות. התוצאות האלה יימחקו מהדירוג ויישמרו בארכיון לביקורת. להמשיך?',
      confirmText: 'שנה צימודים ואפס תוצאות מושפעות',
      variant: 'destructive',
    }))) return;
    setSaving(true);
    setError('');
    try {
      const outcome = await onSave(matches, Boolean(affectsResults), baseRevision);
      if (outcome === 'failed') setError('לא הצלחנו לשמור את הצימודים. בדקו את מצב הטורניר ונסו שוב.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-3 sm:p-5" aria-label="עריכת צימודי הסבב">
      <div>
        <h3 className="text-xl font-bold">עריכת צימודים · סבב {round.number}</h3>
        <p className="text-sm text-muted-foreground">
          בחר שחקן ואז שחקן אחר כדי להחליף ביניהם. ניתן גם לשנות מספר שולחן.
          השינויים יישמרו יחד רק לאחר אישור.
        </p>
      </div>
      {stale && <p role="alert" className="rounded-md bg-amber-50 p-3 text-amber-900">
        הסבב השתנה בינתיים ממכשיר אחר. בטל עריכה כדי לטעון את הצימודים החדשים.
      </p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {selected && <p role="status" className="text-sm font-medium text-blue-700">
        נבחר שחקן להחלפה. לחץ על השחקן שייכנס במקומו.
        <Button contextual variant="ghost" size="sm" onClick={() => setSelected(null)}>בטל בחירה</Button>
      </p>}
      <div className="grid gap-3 xl:grid-cols-2">
        {[...matches].sort((a, b) => a.table - b.table).map(item => {
          const source = round.matches.find(match => match._id === item.matchId);
          return <div key={item.matchId} className="rounded-lg border border-border p-3 space-y-3">
            <label className="flex gap-2 items-center text-sm font-bold">
              <span>שולחן</span>
              <select aria-label={`מספר שולחן עבור ${name(item.player1)}`} className="border rounded-md p-2 bg-background"
                value={item.table} disabled={disabled || saving || stale}
                onChange={event => changeTable(item.matchId, Number(event.target.value))}>
                {matches.map((_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['player1', 'player2'] as const).map(side => item[side] ? (
                <button key={side} type="button" disabled={disabled || saving || stale}
                  aria-pressed={selected?.matchId === item.matchId && selected.side === side}
                  onClick={() => swap({ matchId: item.matchId, side })}
                  className={`min-h-12 break-words rounded-lg border p-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-blue-500 ${selected?.matchId === item.matchId && selected.side === side ? 'bg-blue-100 border-blue-500 text-blue-950' : 'bg-muted hover:bg-accent'}`}>
                  {name(item[side])}
                </button>
              ) : <div key={side} className="rounded-lg border border-dashed p-2 text-sm text-center text-muted-foreground">BYE</div>)}
            </div>
            {source?.result && source.player2 &&
              <p className="text-xs text-muted-foreground">תוצאה קיימת · {source.result.score1}–{source.result.score2}</p>}
          </div>;
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={disabled || saving || stale || !changed || Boolean(selected)}
          onClick={() => void save()}>{saving ? 'שומר צימודים…' : 'שמור שינויים'}</Button>
        <Button variant="outline" disabled={saving} onClick={onCancel}>ביטול</Button>
      </div>
    </section>
  );
}

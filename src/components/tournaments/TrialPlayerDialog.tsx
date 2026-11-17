import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { internalTournaments } from '../../services/internalTournaments';
import { requestError } from '../../utils/requestError';
import type { InternalTournament } from '../../types/internalTournament';

interface Candidate { id: string; firstName: string; lastName: string; city: string }
export default function TrialPlayerDialog({
  tournamentId, revision, onAdded, onClose,
}: {
  tournamentId: string;
  revision: number;
  onAdded: (tournament: InternalTournament) => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (mode !== 'existing' || search.trim().length < 2) {
      setCandidates([]);
      return;
    }
    let active = true;
    internalTournaments.trialCandidates(tournamentId, search.trim())
      .then(rows => { if (active) setCandidates(rows); })
      .catch(err => { if (active) setError(requestError(err)); });
    return () => { active = false; };
  }, [tournamentId, mode, search]);
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const candidate = mode === 'existing'
        ? { playerId: selected }
        : { firstName: firstName.trim(), lastName: lastName.trim(), city: city.trim() };
      const result = await internalTournaments.addTrial(tournamentId, revision, candidate);
      await onAdded(result.tournament);
      onClose();
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setBusy(false);
    }
  };
  return <Modal title="הוסף שחקן ניסיון לטורניר" onClose={busy ? undefined : onClose} panelClassName="max-w-xl">
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        שחקן ניסיון מצטרף זמנית לנבחרת ולסבב הבא. מנהל יוכל לאחר מכן לקלוט אותו לצמיתות או להסירו מהנבחרת תוך שמירת תוצאות הטורניר.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button contextual variant={mode === 'new' ? 'secondary' : 'outline'} onClick={() => setMode('new')} disabled={busy}>שחקן חדש</Button>
        <Button contextual variant={mode === 'existing' ? 'secondary' : 'outline'} onClick={() => setMode('existing')} disabled={busy}>שחקן רשום ללא נבחרת</Button>
      </div>
      {mode === 'new' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">שם פרטי
            <input aria-label="שם פרטי לשחקן ניסיון" required maxLength={50} className="cs-player-input block w-full"
              value={firstName} onChange={event => setFirstName(event.target.value)} disabled={busy}/>
          </label>
          <label className="text-sm">שם משפחה
            <input aria-label="שם משפחה לשחקן ניסיון" required maxLength={50} className="cs-player-input block w-full"
              value={lastName} onChange={event => setLastName(event.target.value)} disabled={busy}/>
          </label>
          <label className="text-sm sm:col-span-2">עיר (לא חובה)
            <input aria-label="עיר לשחקן ניסיון" maxLength={100} className="cs-player-input block w-full"
              value={city} onChange={event => setCity(event.target.value)} disabled={busy}/>
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm">חפש שחקן שאינו משויך לנבחרת
            <input aria-label="חיפוש שחקן ניסיון קיים" className="cs-player-input block w-full"
              value={search} onChange={event => {setSearch(event.target.value); setSelected('');}} disabled={busy}/>
          </label>
          {candidates.length > 0
            ? <div className="max-h-48 overflow-y-auto space-y-2">
                {candidates.map(player => <label key={player.id} className="flex gap-2 items-center border rounded-md p-2 cursor-pointer">
                  <input type="radio" name="trial-existing" checked={selected === player.id}
                    onChange={() => setSelected(player.id)} disabled={busy}/>
                  {player.firstName} {player.lastName}{player.city ? ` · ${player.city}` : ''}
                </label>)}
              </div>
            : <p className="text-xs text-muted-foreground">יש להזין לפחות שתי אותיות לחיפוש שחקן פנוי.</p>}
        </div>
      )}
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || (mode === 'existing' ? !selected : !firstName.trim() || !lastName.trim())}
          onClick={() => void save()}>{busy ? 'מצרף…' : 'צרף כשחקן ניסיון'}</Button>
        <Button variant="outline" disabled={busy} onClick={onClose}>ביטול</Button>
      </div>
    </div>
  </Modal>;
}

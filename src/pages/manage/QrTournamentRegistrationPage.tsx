import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Button from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  qrRegistration, type QrPlayer, type QrFields, type QrTournament,
} from '../../services/qrRegistration';

const text = (value: string | null) => (value || '').trim();
const errorText = (error: unknown) =>
  isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || 'הפעולה נכשלה. נסו שוב.'
    : 'הפעולה נכשלה. נסו שוב.';

export default function QrTournamentRegistrationPage() {
  const { tournamentId = '' } = useParams();
  const { showConfirm } = useConfirm();
  const [params] = useSearchParams();
  const initialPlayerId = text(params.get('playerId'));
  const [tournament, setTournament] = useState<QrTournament | null>(null);
  const [fields, setFields] = useState({ firstName: text(params.get('firstName')),
    lastName: text(params.get('lastName')), city: text(params.get('city')),
    birthYear: text(params.get('birthYear')) });
  const [selectedPlayerId, setSelectedPlayerId] = useState(initialPlayerId);
  const [originalPlayer, setOriginalPlayer] = useState<QrPlayer | null>(null);
  const [matches, setMatches] = useState<QrPlayer[]>([]);
  const [checked, setChecked] = useState(false);
  const [duplicateCreationApproved, setDuplicateCreationApproved] = useState(false);
  const [newPlayerDraft, setNewPlayerDraft] = useState(fields);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    qrRegistration.preview(tournamentId, initialPlayerId || undefined)
      .then(({ tournament: t, player }) => {
        if (!active) return;
        setTournament(t);
        setOriginalPlayer(player);
        if (player) setFields({
          firstName: player.firstName, lastName: player.lastName,
          city: player.city, birthYear: player.birthYear?.toString() || '',
        });
      }).catch(e => { if (active) setError(errorText(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tournamentId, initialPlayerId]);

  const change = (key: keyof typeof fields, value: string) => {
    setFields(previous => ({ ...previous, [key]: value }));
    setChecked(false);
    setDuplicateCreationApproved(false);
    setMatches([]);
    setError('');
  };
  const parsed = (): QrFields => ({
    firstName: fields.firstName.trim(), lastName: fields.lastName.trim(),
    city: fields.city.trim(), birthYear: fields.birthYear ? Number(fields.birthYear) : null,
  });
  const valid = () => fields.firstName.trim().length > 0 && fields.lastName.trim().length > 0 &&
    (!fields.birthYear || (/^\d{4}$/.test(fields.birthYear) &&
      Number(fields.birthYear) >= 1900 && Number(fields.birthYear) <= new Date().getFullYear()));

  const findDuplicates = async () => {
    setNewPlayerDraft(fields);
    setDuplicateCreationApproved(false);
    setChecking(true);
    setError('');
    try {
      const found = await qrRegistration.duplicates(tournamentId, parsed());
      setMatches(found);
      setChecked(true);
    } catch (e) { setError(errorText(e)); }
    finally { setChecking(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!tournament || !valid() || saving) return;
    if (!selectedPlayerId && !checked) {
      await findDuplicates();
      return;
    }
    if (!selectedPlayerId && matches.length > 0 && !duplicateCreationApproved) {
      setError('יש לבחור שחקן קיים או לאשר במפורש יצירת שחקן חדש.');
      return;
    }
    const existingEdited = Boolean(originalPlayer && selectedPlayerId === originalPlayer.id &&
      (originalPlayer.firstName !== fields.firstName.trim() ||
        originalPlayer.lastName !== fields.lastName.trim() ||
        originalPlayer.city !== fields.city.trim() ||
        originalPlayer.birthYear !== parsed().birthYear));
    if (existingEdited && !await showConfirm({ title: 'עדכון שחקן קיים', message: 'הפרטים שתערוך יישמרו בפרופיל השחקן בכל המערכת. להמשיך?', confirmText: 'עדכן וצרף' })) return;
    setSaving(true);
    setError('');
    try {
      const result = await qrRegistration.submit(tournamentId, {
        ...parsed(), playerId: selectedPlayerId || undefined,
        allowDuplicate: duplicateCreationApproved && !selectedPlayerId,
        updateExisting: existingEdited,
        expectedRevision: tournament.revision,
      });
      setSuccess(`${result.player.firstName} ${result.player.lastName} צורף בהצלחה לטורניר`);
      setTournament(result.tournament);
    } catch (e) {
      if (isAxiosError<{ code?: string; matches?: QrPlayer[] }>(e) &&
        e.response?.data.code === 'PLAYER_DUPLICATE') {
        setMatches(e.response.data.matches || []);
        setDuplicateCreationApproved(false);
        setChecked(true);
      }
      setError(errorText(e));
    } finally { setSaving(false); }
  };

  const field = (label: string, key: keyof typeof fields, required = false) => (
    <label className="block space-y-1 text-sm font-medium">
      <span>{label}{required ? ' *' : ''}</span>
      <input value={fields[key]} onChange={event => change(key, event.target.value)}
        required={required} maxLength={key === 'birthYear' ? 4 : 100}
        inputMode={key === 'birthYear' ? 'numeric' : 'text'}
        className="w-full rounded-lg border border-input bg-background p-3 text-foreground"
        disabled={saving || Boolean(success)} />
    </label>
  );

  if (loading) return <div className="container py-12 text-center">טוען טורניר...</div>;
  if (!tournament) return <div className="container py-12 text-destructive" role="alert">{error || 'טורניר לא נמצא'}</div>;
  return (
    <div className="cs-workspace container py-8 max-w-xl" dir="rtl">
      <Card>
        <CardHeader><CardTitle>רישום שחקן חוג לטורניר</CardTitle>
          <p className="text-muted-foreground">{tournament.title}</p>
        </CardHeader>
        <CardContent>
          {success ? <div role="status" className="space-y-4">
            <p className="text-success font-bold">{success}</p>
            <Link className="text-blue-500 underline" to={`/tournaments/${tournamentId}`}>מעבר לטורניר</Link>
          </div> : <form onSubmit={submit} className="space-y-4">
            {field('שם פרטי', 'firstName', true)}
            {field('שם משפחה', 'lastName', true)}
            {field('עיר (רשות)', 'city')}
            {field('שנת לידה (רשות)', 'birthYear')}
            {originalPlayer && <p className="text-sm text-muted-foreground">שחקן קיים: עריכת פרטיו תשנה את הפרופיל הכללי.</p>}
            {selectedPlayerId && <p className="text-sm">מזהה השחקן שנבחר: {selectedPlayerId}</p>}
            {!selectedPlayerId && checked && matches.length > 0 && <fieldset className="space-y-2 rounded-lg border p-3">
              <legend className="font-bold">נמצאו שחקנים דומים. בחר שחקן קיים או צור חדש.</legend>
              {matches.map(player => <label className="flex items-center gap-2" key={player.id}>
                <input type="radio" name="player" checked={selectedPlayerId === player.id}
                  onChange={() => {
                    setSelectedPlayerId(player.id);
                    setDuplicateCreationApproved(false);
                    setOriginalPlayer(player);
                    setFields({ firstName: player.firstName, lastName: player.lastName,
                      city: player.city, birthYear: player.birthYear?.toString() || '' });
                  }} />
                <span>{player.firstName} {player.lastName} · {player.playerType === 'team' ? 'שחקן נבחרת' : 'שחקן חוג'} · {player.city} · {player.birthYear || 'שנה לא ידועה'}</span>
              </label>)}
              <label className="flex items-center gap-2">
                <input type="radio" name="player" checked={!selectedPlayerId && duplicateCreationApproved}
                  onChange={() => {
                    setSelectedPlayerId('');
                    setOriginalPlayer(null);
                    setFields(newPlayerDraft);
                    setDuplicateCreationApproved(true);
                    setError('');
                  }} />
                <span>יצירת שחקן חדש בכל זאת</span>
              </label>
            </fieldset>}
            {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
            <Button className="w-full" type="submit" disabled={!valid() || checking || saving || (checked && matches.length > 0 && !selectedPlayerId && !duplicateCreationApproved)}>
              {saving ? 'שומר...' : checking ? 'בודק שחקנים...' :
                !selectedPlayerId && !checked ? 'בדיקת שחקנים דומים' : 'אישור וצירוף לטורניר'}
            </Button>
          </form>}
        </CardContent>
      </Card>
    </div>
  );
}

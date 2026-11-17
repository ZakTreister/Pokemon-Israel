import { useState, type FormEvent } from 'react';
import type { Tournament } from '../../../types/tournament';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import api from '../../../services/api';
import { requestError } from '../../../utils/requestError';
import { clubDateKey } from '../../../../shared/tournamentDomain';

type EditableClubTournament = Pick<Tournament,
  'id' | 'title' | 'description' | 'date' | 'location' | 'image'>;

interface Props {
  tournament: EditableClubTournament;
  onClose: () => void;
  onSaved: () => void;
}

export default function ClubTournamentEditDialog({ tournament, onClose, onSaved }: Props) {
  const [values, setValues] = useState({
    title: tournament.title,
    description: tournament.description,
    date: clubDateKey(tournament.date),
    location: tournament.location,
    image: tournament.image || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key: keyof typeof values, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!values.title.trim() || !values.description.trim() ||
        !values.location.trim() || !values.date) {
      setError('יש למלא שם, תיאור, מיקום ותאריך.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/tournaments/${tournament.id}`, {
        title: values.title.trim(),
        description: values.description.trim(),
        location: values.location.trim(),
        date: values.date,
        image: values.image.trim(),
      });
      onSaved();
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="עריכת טורניר חוגים" onClose={onClose} panelClassName="max-w-lg">
      <form className="space-y-4" dir="rtl" onSubmit={event => void submit(event)}>
        {([
          ['title', 'שם הטורניר', 'text'],
          ['description', 'תיאור', 'text'],
          ['date', 'תאריך', 'date'],
          ['location', 'מיקום', 'text'],
          ['image', 'קישור לתמונה (רשות)', 'url'],
        ] as const).map(([key, label, type]) => (
          <label className="block space-y-1" key={key}>
            <span className="text-sm font-medium">{label}</span>
            <input
              type={type}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={values[key]}
              required={key !== 'image'}
              disabled={saving}
              onChange={event => update(key, event.target.value)}
            />
          </label>
        ))}
        <p className="text-sm text-muted-foreground">
          הרישום לטורנירי חוגים אינו מוגבל במספר משתתפים. נבחרת אינה חלק מהטורניר הזה.
        </p>
        {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>ביטול</Button>
          <Button type="submit" disabled={saving}>{saving ? 'שומר...' : 'שמירת שינויים'}</Button>
        </div>
      </form>
    </Modal>
  );
}

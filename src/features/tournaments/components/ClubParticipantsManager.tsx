import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, UserMinus, UserPlus } from 'lucide-react';
import api from '../../../services/api';
import { requestError } from '../../../utils/requestError';
import { useConfirm } from '../../../components/ui/ConfirmProvider';
import { useToast } from '../../../components/ui/ToastProvider';
import Button from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import Modal from '../../../components/ui/Modal';

export interface ClubRegistrant {
  key: string;
  source: 'user' | 'player';
  registrationId: string;
  playerId: string | null;
  name: string;
  city: string;
  registeredAt: string;
  needsPlayerLink: boolean;
}
export interface AvailableClubPlayer {
  id: string;
  name: string;
  city: string;
}
export interface ClubParticipantsResponse {
  registered: ClubRegistrant[];
  available: AvailableClubPlayer[];
  canAdd: boolean;
}

export default function ClubParticipantsManager({
  tournamentId,
  onChanged,
}: {
  tournamentId: string;
  onChanged?: () => void;
}) {
  const { showConfirm } = useConfirm();
  const { showToast } = useToast();
  const [data, setData] = useState<ClubParticipantsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const response = await api.get<ClubParticipantsResponse>(
      `/api/tournaments/${tournamentId}/club-participants`,
    );
    setData(response.data);
  }, [tournamentId]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    api.get<ClubParticipantsResponse>(
      `/api/tournaments/${tournamentId}/club-participants`,
    ).then(({ data: result }) => {
      if (active) setData(result);
    }).catch(caught => {
      if (active) setError(requestError(caught));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [tournamentId]);

  const available = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('he-IL');
    return (data?.available || []).filter(player =>
      !query || `${player.name} ${player.city}`.toLocaleLowerCase('he-IL').includes(query),
    );
  }, [data?.available, search]);

  const add = async (player: AvailableClubPlayer) => {
    setPending(player.id);
    setError('');
    try {
      await api.post(`/api/tournaments/${tournamentId}/club-participants`, {
        playerId: player.id,
      });
      await reload();
      showToast(`${player.name} נוסף לטורניר`, 'success');
      onChanged?.();
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setPending(null);
    }
  };

  const remove = async (person: ClubRegistrant) => {
    if (!(await showConfirm({
      title: 'הסרת משתתף',
      message: `להסיר את ${person.name} מהטורניר?`,
      confirmText: 'הסר משתתף',
      variant: 'destructive',
    }))) return;
    setPending(person.key);
    setError('');
    try {
      await api.delete(
        `/api/tournaments/${tournamentId}/club-participants/${person.source}/${person.registrationId}`,
      );
      await reload();
      showToast(`${person.name} הוסר מהטורניר`, 'success');
      onChanged?.();
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {data?.canAdd && (
          <Button onClick={() => { setSearch(''); setShowPicker(true); }}>
            <UserPlus size={16} className="ml-1" /> הוסף משתתף
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>רשימת משתתפים ({data?.registered.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p role="status">טוען משתתפים…</p>}
          {error && <p role="alert" className="text-destructive">{error}</p>}
          {!loading && data && (!data.registered.length
            ? <p className="text-muted-foreground">אין משתתפים רשומים עדיין</p>
            : <div className="space-y-2">
                {data.registered.map((person, index) => (
                  <div key={person.key} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md border border-border">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{person.name}</span>
                      {person.city && <span className="text-sm text-muted-foreground">· {person.city}</span>}
                      <span className="text-sm text-muted-foreground">
                        · נרשם: {new Date(person.registeredAt).toLocaleDateString('he-IL')}
                      </span>
                      {person.needsPlayerLink &&
                        <span className="text-sm text-amber-700">· נדרש שיוך לפרופיל שחקן לפני הגרלת סבבים</span>}
                    </div>
                    {data.canAdd && (
                      <Button contextual variant="destructive" size="sm"
                        disabled={pending !== null}
                        onClick={() => void remove(person)}>
                        <UserMinus size={16} className="ml-1" />
                        {pending === person.key ? 'מסיר…' : 'הסר'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>)}
        </CardContent>
      </Card>
      {showPicker && data?.canAdd && (
        <Modal title="הוסף שחקן חוג לטורניר" onClose={() => setShowPicker(false)}
          panelClassName="max-w-2xl">
          <div className="space-y-4">
            <label className="block relative">
              <span className="sr-only">חיפוש שחקן חוג</span>
              <Search className="absolute right-3 top-3 text-muted-foreground" size={19}/>
              <input className="w-full border rounded-md bg-background py-2 pr-10 pl-3"
                placeholder="חפש שחקן לפי שם או עיר"
                value={search} onChange={event => setSearch(event.target.value)}/>
            </label>
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {available.length === 0
                ? <p className="text-muted-foreground py-4">
                    {search ? 'לא נמצאו שחקני חוגים התואמים לחיפוש' : 'כל שחקני החוגים כבר רשומים, או שאין שחקנים זמינים'}
                  </p>
                : available.map(player => (
                  <div key={player.id} className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-md">
                    <span>{player.name}{player.city ? ` · ${player.city}` : ''}</span>
                    <Button disabled={pending !== null} size="sm"
                      onClick={() => void add(player)}>
                      {pending === player.id ? 'מוסיף…' : 'הוסף'}
                    </Button>
                  </div>
                ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowPicker(false)}>סגור</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { rankedTeamMembers } from '../utils/teamMembers';
import type { AllStarsRanking } from '../../../types/internalTournament';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import { useConfirm } from '../../../components/ui/ConfirmProvider';
import { useToast } from '../../../components/ui/ToastProvider';
import { useAppDispatch } from '../../../hooks/redux';
import { removePlayer } from '../teamsSlice';
import PlayerEditDialog from '../../players/components/PlayerEditDialog';
import teamsService from '../teamsService';
import Modal from '../../../components/ui/Modal';
import type { TeamWithRoster, TeamRosterPlayer } from '../../../types/team';
export default function TeamMembersTable({
  team,
  rankings = [],
  editable,
  onChanged,
}: {
  team: TeamWithRoster;
  rankings?: AllStarsRanking[];
  editable: boolean;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<TeamRosterPlayer | null>(null);
  const [busy, setBusy] = useState(false);
  const [trialToConfirm, setTrialToConfirm] = useState<TeamRosterPlayer | null>(null);
  const [trialNumber, setTrialNumber] = useState('');
  const dispatch = useAppDispatch();
  const { showConfirm } = useConfirm();
  const { showToast } = useToast();
  const remove = async (player: TeamRosterPlayer) => {
    if (
      busy ||
      !(await showConfirm({
        title: 'הסרה מהנבחרת',
        message: `להסיר את ${player.firstName} ${player.lastName} מהנבחרת? רשומת השחקן תישמר.`,
        confirmText: 'הסר',
        variant: 'destructive',
      }))
    )
      return;
    setBusy(true);
    try {
      await dispatch(
        removePlayer({ teamId: team.id, playerId: player.id }),
      ).unwrap();
      await onChanged();
    } catch (e) {
      showToast(typeof e === 'string' ? e : 'ההסרה נכשלה. נסו שוב.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const dismiss = async (player: TeamRosterPlayer) => {
    if (busy || !(await showConfirm({
      title: 'הסרת שחקן ניסיון',
      message: `להסיר את ${player.firstName} ${player.lastName} מהנבחרת? התוצאות בכל הטורנירים יישמרו, אך הוא לא יופיע עוד בדירוג הנבחרת. אם טורניר פנימי פעיל יש לסיים אותו תחילה.`,
      confirmText: 'הסר מהנבחרת', variant: 'destructive',
    }))) return;
    setBusy(true);
    try {
      await teamsService.resolveTrial(team.id, player.id, 'dismiss');
      await onChanged();
      showToast('שחקן הניסיון הוסר מהנבחרת; היסטוריית המשחקים נשמרה.', 'success');
    } catch (caught) {
      showToast(typeof caught === 'string' ? caught : 'ההסרה נכשלה. בדקו שאין טורניר פעיל.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const confirmTrial = async () => {
    if (!trialToConfirm || busy || !trialNumber.trim()) return;
    setBusy(true);
    try {
      await teamsService.resolveTrial(team.id, trialToConfirm.id, 'confirm', trialNumber.trim());
      setTrialToConfirm(null);
      setTrialNumber('');
      await onChanged();
      showToast('שחקן הניסיון נקלט כחבר קבוע בנבחרת.', 'success');
    } catch (caught) {
      showToast(typeof caught === 'string' ? caught : 'הקליטה נכשלה. נסו שוב.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {trialToConfirm && <Modal title="קליטת שחקן ניסיון כחבר קבוע" onClose={() => setTrialToConfirm(null)}>
        <div className="space-y-4">
          <p>{trialToConfirm.firstName} {trialToConfirm.lastName} יתווסף כחבר קבוע בנבחרת. היסטוריית הטורנירים שלו תישמר.</p>
          <label className="block">מספר שחקן
            <input aria-label="מספר שחקן לקליטה קבועה" required className="cs-player-input block w-full"
              value={trialNumber} onChange={event => setTrialNumber(event.target.value)} disabled={busy}/>
          </label>
          <div className="flex gap-2">
            <Button disabled={busy || !trialNumber.trim()} onClick={() => void confirmTrial()}>אשר קליטה קבועה</Button>
            <Button variant="outline" disabled={busy} onClick={() => setTrialToConfirm(null)}>ביטול</Button>
          </div>
        </div>
      </Modal>}
      <DataTable
        rows={rankedTeamMembers(team.players, rankings)}
        rowKey={(row) => row.id}
        defaultSort="position"
        rowLink={(row) => `/all-stars/players/${row.id}`}
        columns={[
          { key: 'position', label: 'מיקום', value: (row) => row.position },
          {
            key: 'name',
            label: 'שם מלא',
            value: (row) => `${row.firstName} ${row.lastName}`,
            render: (row) => (
              <Link
                className="text-blue-500 font-bold"
                to={`/all-stars/players/${row.id}`}
              >
                {row.firstName} {row.lastName}
              </Link>
              {row.teamMembershipStatus === 'trial' && <span className="ms-2 text-xs rounded bg-amber-100 px-2 py-1 text-amber-900">שחקן ניסיון</span>}
            ),
          },
          { key: 'city', label: 'עיר', value: (row) => row.city },
          {
            key: 'playerNumber',
            label: 'מספר שחקן',
            value: (row) => row.playerNumber || '—',
          },
          { key: 'points', label: 'נקודות', value: (row) => row.points },
          {
            key: 'tournaments',
            label: 'טורנירים',
            value: (row) => row.tournaments,
          },
          ...(editable
            ? [
                {
                  key: 'actions',
                  label: 'פעולות',
                  value: () => '',
                  render: (row: TeamRosterPlayer) => (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        contextual
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setEditing(row)}
                      >
                        עריכת שחקן
                      </Button>
                      {row.teamMembershipStatus === 'trial' ? (
                        <>
                          <Button contextual size="sm" variant="outline" disabled={busy}
                            onClick={() => { setTrialNumber(row.playerNumber || ''); setTrialToConfirm(row); }}>
                            קליטה קבועה
                          </Button>
                          <Button contextual size="sm" variant="outline" disabled={busy}
                            onClick={() => void dismiss(row)}>
                            הסר שחקן ניסיון
                          </Button>
                        </>
                      ) : <Button
                        contextual size="sm" variant="outline" disabled={busy}
                        onClick={() => void remove(row)}>
                        הסרה מהנבחרת
                      </Button>}
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
      {editing && (
        <PlayerEditDialog
          player={{
            ...editing,
            playerType: 'team',
            user: null,
            isActive: editing.isActive ?? true,
          }}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}
    </>
  );
}

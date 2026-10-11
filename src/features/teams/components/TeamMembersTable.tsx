import { useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import { useConfirm } from '../../../components/ui/ConfirmProvider';
import { useToast } from '../../../components/ui/ToastProvider';
import { useAppDispatch } from '../../../hooks/redux';
import { removePlayer } from '../teamsSlice';
import TeamPlayerEditModal from '../../players/components/TeamPlayerEditModal';
import type { TeamWithRoster, TeamRosterPlayer } from '../../../types/team';
export default function TeamMembersTable({
  team,
  editable,
  onChanged,
}: {
  team: TeamWithRoster;
  editable: boolean;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<TeamRosterPlayer | null>(null);
  const [busy, setBusy] = useState(false);
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
  return (
    <>
      <DataTable
        rows={team.players}
        rowKey={(row) => row.id}
        defaultSort="name"
        rowLink={(row) => `/all-stars/players/${row.id}`}
        columns={[
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
            ),
          },
          { key: 'city', label: 'עיר', value: (row) => row.city },
          {
            key: 'playerNumber',
            label: 'מספר שחקן',
            value: (row) => row.playerNumber || '—',
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
                      <Button
                        contextual
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void remove(row)}
                      >
                        הסרה מהנבחרת
                      </Button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
      {editing && (
        <TeamPlayerEditModal
          player={editing}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}
    </>
  );
}

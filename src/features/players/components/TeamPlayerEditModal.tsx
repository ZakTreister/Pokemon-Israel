import PlayerPhotoField from './PlayerPhotoField';
import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import TeamPlayerFields, { type TeamPlayerValues } from './TeamPlayerFields';
import { teamPlayerEditSchema } from '../utils/teamPlayerForm';
import { useAppDispatch } from '../../../hooks/redux';
import { updatePlayer } from '../playersSlice';
import { requestError } from '../../../utils/requestError';
import type { TeamRosterPlayer } from '../../../types/team';
export default function TeamPlayerEditModal({
  player,
  onClose,
  onSaved,
}: {
  player: TeamRosterPlayer;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState<TeamPlayerValues>({
    firstName: player.firstName,
    lastName: player.lastName,
    city: player.city || '',
    playerNumber: player.playerNumber || '',
    description: player.description || '',
    dateOfBirth: player.dateOfBirth || '',
  });
  const [photoUploadId, setPhotoUploadId] = useState<
    string | null | undefined
  >();
  const [photoUrl, setPhotoUrl] = useState(player.photoUrl || '');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (busy || uploading) return;
    const parsed = teamPlayerEditSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await dispatch(
        updatePlayer({
          id: player.id,
          input: { ...parsed.data, photoUploadId },
        }),
      ).unwrap();
      await onSaved();
      onClose();
    } catch (e) {
      setError(typeof e === 'string' ? e : requestError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="עריכת שחקן" onClose={busy || uploading ? undefined : onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <TeamPlayerFields value={value} onChange={setValue} />
        <PlayerPhotoField
          playerType="team"
          entityId={player.id}
          value={photoUrl}
          hasPhoto={photoUploadId !== null && !!player.photoMedia}
          onChange={(image) => {
            setPhotoUrl(image?.url || '');
            setPhotoUploadId(image?.uploadId || null);
          }}
          onBusyChange={setUploading}
          disabled={busy || uploading}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy || uploading}
            onClick={onClose}
          >
            ביטול
          </Button>
          <Button disabled={busy || uploading}>
            {busy ? 'שומר…' : 'שמור שינויים'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

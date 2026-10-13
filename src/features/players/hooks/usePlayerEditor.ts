import { useState } from 'react';
import { useAppDispatch } from '../../../hooks/redux';
import { updatePlayer } from '../playersSlice';
import { playerEditSchema } from '../utils/playerProfile';
import type { Player } from '../../../types/player';
import { requestError } from '../../../utils/requestError';
export function usePlayerEditor(
  player: Player,
  onSaved: () => Promise<void>,
  onClose: () => void,
) {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState({
    firstName: player.firstName,
    lastName: player.lastName,
    city: player.city || '',
    playerNumber: player.playerNumber || '',
    description: player.description || '',
    dateOfBirth: player.dateOfBirth || '',
    joinedAt: player.joinedAt || '',
    pokemon: player.pokemon?.length ? player.pokemon : [''],
    isActive: player.isActive,
  });
  const [photo, setPhoto] = useState(player.photoUrl || '');
  const [deck, setDeck] = useState(player.deckUrl || '');
  const [photoUploadId, setPhotoUploadId] = useState<string | null>();
  const [deckUploadId, setDeckUploadId] = useState<string | null>();
  const [uploads, setUploads] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (saving || uploads) return;
    const parsed = playerEditSchema.safeParse({
      ...value,
      pokemon: value.pokemon.filter((name) => name.trim()),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (player.playerType === 'quarterly' && !parsed.data.city) {
      setError('עיר היא חובה');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { firstName, lastName, city, isActive, ...profile } = parsed.data;
      await dispatch(
        updatePlayer({
          id: player.id,
          input: {
            firstName,
            lastName,
            city,
            isActive,
            ...(player.playerType === 'team'
              ? { ...profile, photoUploadId, deckUploadId }
              : {}),
          },
        }),
      ).unwrap();
      await onSaved();
      onClose();
    } catch (e) {
      setError(typeof e === 'string' ? e : requestError(e));
    } finally {
      setSaving(false);
    }
  };
  return {
    value,
    setValue,
    photo,
    setPhoto,
    deck,
    setDeck,
    photoUploadId,
    setPhotoUploadId,
    deckUploadId,
    setDeckUploadId,
    busy: saving || uploads > 0,
    saving,
    error,
    save,
    onBusyChange: (busy: boolean) =>
      setUploads((count) => count + (busy ? 1 : -1)),
  };
}

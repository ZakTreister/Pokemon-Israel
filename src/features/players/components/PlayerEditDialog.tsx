import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import ImageUpload from '../../../components/ui/ImageUpload';
import PlayerPhotoField from './PlayerPhotoField';
import PlayerNameFields from './PlayerNameFields';
import PlayerNumberField from './PlayerNumberField';
import TeamPlayerProfileFields from './TeamPlayerProfileFields';
import { usePlayerEditor } from '../hooks/usePlayerEditor';
import type { Player } from '../../../types/player';
export default function PlayerEditDialog({
  player,
  onClose,
  onSaved,
}: {
  player: Player;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const editor = usePlayerEditor(player, onSaved, onClose);
  const { value, setValue, busy } = editor;
  const team = player.playerType === 'team';
  return (
    <Modal
      title="עריכת שחקן"
      panelClassName="max-w-3xl"
      onClose={busy ? undefined : onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            ביטול
          </Button>
          <Button disabled={busy} onClick={() => void editor.save()}>
            {editor.saving ? 'שומר…' : 'שמור שינויים'}
          </Button>
        </div>
      }
    >
      {editor.error && (
        <p role="alert" className="text-destructive mb-4">
          {editor.error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void editor.save();
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <PlayerNameFields
          firstName={value.firstName}
          lastName={value.lastName}
          onChange={(field, text) =>
            setValue((current) => ({ ...current, [field]: text }))
          }
        />
        <label>
          עיר
          <input
            className="cs-player-input"
            value={value.city}
            onChange={(e) => setValue({ ...value, city: e.target.value })}
          />
        </label>
        {team && (
          <PlayerNumberField
            value={value.playerNumber}
            onChange={(playerNumber) => setValue({ ...value, playerNumber })}
          />
        )}
        {team && (
          <>
            <div className="md:col-span-2">
              <TeamPlayerProfileFields
                value={value}
                onChange={(profile) => setValue({ ...value, ...profile })}
              />
            </div>
            <div className="min-w-0">
              <PlayerPhotoField
                playerType="team"
                entityId={player.id}
                value={editor.photo}
                hasPhoto={editor.photoUploadId !== null && !!player.photoMedia}
                disabled={busy}
                onBusyChange={editor.onBusyChange}
                onChange={(image) => {
                  editor.setPhoto(image?.url || '');
                  editor.setPhotoUploadId(image?.uploadId || null);
                }}
              />
            </div>
            <div className="min-w-0">
              <ImageUpload
                purpose="player-deck"
                playerType="team"
                entityId={player.id}
                label="דק אישי"
                value={editor.deck}
                disabled={busy}
                onBusyChange={editor.onBusyChange}
                onChange={(image) => {
                  editor.setDeck(image?.url || '');
                  editor.setDeckUploadId(image?.uploadId || null);
                }}
              />
            </div>
            <fieldset className="md:col-span-2 space-y-2">
              <legend
                className="font-bold"
                title="אותיות באנגלית ורווחים בלבד. לדוגמה: Iron Hands"
              >
                עד 6 פוקימונים
              </legend>
              <p className="text-sm text-muted-foreground">
                אותיות באנגלית ורווחים בלבד, לדוגמה: Iron Hands
              </p>
              <div className="flex flex-wrap gap-2">
                {value.pokemon.map((name, index) => (
                  <div key={index} className="flex gap-1">
                    <input
                      aria-label={`פוקימון ${index + 1}`}
                      dir="ltr"
                      className="cs-player-input max-w-36"
                      value={name}
                      onChange={(e) =>
                        setValue({
                          ...value,
                          pokemon: value.pokemon.map((item, i) =>
                            i === index ? e.target.value : item,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      contextual
                      variant="outline"
                      aria-label={`הסר פוקימון ${index + 1}`}
                      onClick={() =>
                        setValue({
                          ...value,
                          pokemon:
                            value.pokemon.length === 1
                              ? ['']
                              : value.pokemon.filter((_, i) => i !== index),
                        })
                      }
                    >
                      הסר
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                contextual
                variant="outline"
                disabled={value.pokemon.length >= 6}
                onClick={() =>
                  setValue({ ...value, pokemon: [...value.pokemon, ''] })
                }
              >
                הוסף פוקימון
              </Button>
            </fieldset>
          </>
        )}
        <label className="md:col-span-2 flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            checked={value.isActive}
            onChange={(e) => setValue({ ...value, isActive: e.target.checked })}
          />
          פעיל
        </label>
      </form>
    </Modal>
  );
}

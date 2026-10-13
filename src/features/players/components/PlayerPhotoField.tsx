import { useEffect, useState } from 'react';
import ImageUpload from '../../../components/ui/ImageUpload';
import {
  getPlayerPhotoPreview,
  type UploadedImage,
} from '../../../services/media';
import { requestError } from '../../../utils/requestError';
export default function PlayerPhotoField({
  playerType,
  entityId,
  value,
  hasPhoto,
  onChange,
  onBusyChange,
  disabled,
}: {
  playerType: 'team' | 'quarterly';
  entityId?: string;
  value: string;
  hasPhoto?: boolean;
  onChange: (image: UploadedImage | null) => void;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState(value);
  const [error, setError] = useState('');
  useEffect(() => {
    setPreview(value);
  }, [value]);
  useEffect(() => {
    if (!entityId || !hasPhoto || value) return;
    let active = true;
    getPlayerPhotoPreview(entityId)
      .then((url) => {
        if (active) setPreview(url);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, [entityId, hasPhoto, value]);
  return (
    <div className="space-y-2">
      <ImageUpload
        purpose="player-photo"
        entityId={entityId}
        playerType={playerType}
        label="תמונת השחקן (רשות)"
        value={preview}
        hasImage={hasPhoto}
        onChange={(image) => {
          setPreview(image?.url || '');
          setError('');
          onChange(image);
        }}
        onBusyChange={onBusyChange}
        disabled={disabled}
      />
      {playerType === 'quarterly' && (
        <p className="text-xs text-muted-foreground">
          התמונה פרטית ואינה מופיעה באתר הציבורי.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

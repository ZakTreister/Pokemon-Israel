import { useId, useState, useRef, useEffect } from 'react';
import {
  uploadImage,
  type UploadedImage,
  type UploadTarget,
} from '../../services/media';
import { requestError } from '../../utils/requestError';
import Button from './Button';
interface Props extends UploadTarget {
  value: string;
  hasImage?: boolean;
  onChange: (image: UploadedImage | null) => void;
  onBusyChange?: (busy: boolean) => void;
  label?: string;
  disabled?: boolean;
}
export default function ImageUpload({
  value,
  hasImage,
  purpose,
  entityId,
  playerType,
  onChange,
  onBusyChange,
  label = 'תמונה',
  disabled,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState('');
  const busyRef = useRef(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const select = async (file?: File) => {
    if (!file || busyRef.current) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      !file.size ||
      file.size > 5 * 1024 * 1024
    ) {
      setError('בחרו PNG, JPEG או WebP עד 5MB');
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setProgress(0);
    if (file instanceof Blob) setPreview(URL.createObjectURL(file));
    onBusyChange?.(true);
    setError('');
    try {
      onChange(
        await uploadImage(file, { purpose, entityId, playerType }, setProgress),
      );
    } catch (e) {
      setError(requestError(e));
    } finally {
      busyRef.current = false;
      setPreview('');
      setBusy(false);
      onBusyChange?.(false);
    }
  };
  return (
    <div className="space-y-2 min-w-0">
      <label htmlFor={id} className="block font-bold text-sm">
        {label}
      </label>
      {(preview || value) && (
        <img
          src={preview || value}
          alt={label}
          className="w-20 h-20 object-contain rounded-md border bg-white"
        />
      )}
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        aria-controls={id}
      >
        {busy ? 'מעלה תמונה…' : 'בחר תמונה להעלאה'}
      </Button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={disabled || busy}
        onChange={(e) => {
          void select(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <p role="status" className="text-xs text-muted-foreground">
        {busy ? `מעלה תמונה... ${progress}%` : 'PNG, JPEG, WebP · עד 5MB'}
      </p>
      {(value || hasImage) && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || busy}
          onClick={() => onChange(null)}
        >
          הסר תמונה
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

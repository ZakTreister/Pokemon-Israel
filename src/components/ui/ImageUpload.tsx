import { useId, useState } from 'react';
import { uploadImage, type UploadedImage } from '../../services/media';
import { requestError } from '../../utils/requestError';
import Button from './Button';
interface Props {
  value: string;
  onChange: (image: UploadedImage | null) => void;
  onBusyChange?: (busy: boolean) => void;
  label?: string;
  disabled?: boolean;
}
export default function ImageUpload({
  value,
  onChange,
  onBusyChange,
  label = 'תמונה',
  disabled,
}: Props) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const select = async (file?: File) => {
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError('בחרו PNG, JPEG או WebP עד 5MB');
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      setError(requestError(e));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };
  return (
    <div className="space-y-2 min-w-0">
      <label htmlFor={id} className="block font-bold text-sm">
        {label}
      </label>
      {value && (
        <img
          src={value}
          alt={label}
          className="w-20 h-20 object-contain rounded-md border bg-white"
        />
      )}
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="block w-full min-w-0 text-sm file:rounded-md file:border-0 file:bg-blue-500 file:text-white file:px-3 file:py-2 file:me-2"
        disabled={disabled || busy}
        onChange={(e) => {
          void select(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <p className="text-xs text-muted-foreground">
        {busy ? 'מעלה תמונה...' : 'PNG, JPEG, WebP · עד 5MB'}
      </p>
      {value && (
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

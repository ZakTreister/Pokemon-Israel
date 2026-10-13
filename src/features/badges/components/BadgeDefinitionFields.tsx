import { useId } from 'react';
import FormField from '../../../components/ui/FormField';
import ImageUpload from '../../../components/ui/ImageUpload';
import type { UploadedImage } from '../../../services/media';
export default function BadgeDefinitionFields({
  value,
  onChange,
  entityId,
  imageUrl,
  onImageChange,
  onBusyChange,
  disabled,
}: {
  value: { name: string; description: string };
  onChange: (value: { name: string; description: string }) => void;
  entityId?: string;
  imageUrl: string;
  onImageChange: (image: UploadedImage | null) => void;
  onBusyChange: (busy: boolean) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <>
      <FormField label="שם התג" htmlFor={`${id}-name`} required>
        <input
          id={`${id}-name`}
          required
          maxLength={100}
          value={value.name}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="w-full p-2 border rounded-md bg-background"
        />
      </FormField>
      <FormField label="תיאור (רשות)" htmlFor={`${id}-description`}>
        <textarea
          id={`${id}-description`}
          rows={2}
          maxLength={500}
          value={value.description}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className="w-full p-2 border rounded-md bg-background"
        />
      </FormField>
      <ImageUpload
        purpose="badge-image"
        entityId={entityId}
        label="תמונת התג (רשות)"
        value={imageUrl}
        onChange={onImageChange}
        onBusyChange={onBusyChange}
        disabled={disabled}
      />
    </>
  );
}

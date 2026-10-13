import { useState } from 'react';
import type { Update } from '../../../types/update';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import ImageUpload from '../../../components/ui/ImageUpload';
import updatesService from '../updatesService';
import { updateFormSchema } from '../utils/updateForm';
import { requestError } from '../../../utils/requestError';
export default function UpdateEditDialog({
  update,
  onClose,
  onSaved,
}: {
  update?: Update;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState({
    title: update?.title || '',
    description: update?.description ?? update?.content ?? '',
    ctaText: update?.ctaText || '',
    ctaUrl: update?.ctaUrl || '',
  });
  const [image, setImage] = useState(update?.image || '');
  const [imageUploadId, setImageUploadId] = useState<string | null>();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (busy || uploading) return;
    const parsed = updateFormSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const input = { ...parsed.data, imageUploadId };
      if (update) await updatesService.updateUpdate(update.id, input);
      else await updatesService.createUpdate(input);
      await onSaved();
      onClose();
    } catch (e) {
      setError(requestError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={update ? 'עריכת עדכון' : 'עדכון חדש'}
      panelClassName="max-w-xl"
      onClose={busy || uploading ? undefined : onClose}
      footer={
        <div className="flex gap-2 justify-end">
          <Button
            disabled={busy || uploading}
            variant="outline"
            onClick={onClose}
          >
            ביטול
          </Button>
          <Button disabled={busy || uploading} onClick={() => void save()}>
            {busy ? 'שומר…' : 'שמור'}
          </Button>
        </div>
      }
    >
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
        {(['title', 'description', 'ctaText', 'ctaUrl'] as const).map(
          (field, index) => (
            <label key={field} className="block">
              {['כותרת', 'תיאור', 'קריאה לפעולה', 'קישור קריאה לפעולה'][index]}
              {field === 'description' ? (
                <textarea
                  className="w-full p-2 border rounded-md bg-background"
                  rows={4}
                  value={value[field]}
                  onChange={(e) =>
                    setValue({ ...value, [field]: e.target.value })
                  }
                />
              ) : (
                <input
                  className="w-full p-2 border rounded-md bg-background"
                  value={value[field]}
                  onChange={(e) =>
                    setValue({ ...value, [field]: e.target.value })
                  }
                />
              )}
            </label>
          ),
        )}
        <ImageUpload
          purpose="update-image"
          entityId={update?.id}
          label="תמונת העדכון"
          value={image}
          onChange={(image) => {
            setImage(image?.url || '');
            setImageUploadId(image?.uploadId || null);
          }}
          onBusyChange={setUploading}
          disabled={busy}
        />
      </form>
    </Modal>
  );
}

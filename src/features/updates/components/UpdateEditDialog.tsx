import { useEffect, useState } from 'react';
import { publicTeams } from '../../../services/publicTeams';
import type { Team } from '../../../types/team';
import type { Update } from '../../../types/update';
import RichHtmlField from '../../../components/content/RichHtmlField';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import ImageUpload from '../../../components/ui/ImageUpload';
import MediaManager from '../../../components/media/MediaManager';
import updatesService from '../updatesService';
import { updateFormSchema, legacyUpdateHtml } from '../utils/updateForm';
import { requestError } from '../../../utils/requestError';
export default function UpdateEditDialog({
  update,
  onClose,
  onSaved,
  defaultEventId,
}: {
  update?: Update;
  defaultEventId?: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState({
    title: update?.title || '',
    description: update?.descriptionHtml ?? legacyUpdateHtml(update?.description ?? update?.content ?? ''),
    ctaText: update?.ctaText || '',
    ctaUrl: update?.ctaUrl || '',
  });
  const [published,setPublished]=useState(update?update.published!==false:false);
  const [showInNews,setShowInNews]=useState(update?.showInNews!==false);
  const [imageInGallery,setImageInGallery]=useState(!!update?.imageInGallery);
  const [teams,setTeams]=useState<Team[]>([]),[teamIds,setTeamIds]=useState<string[]>(update?.teamIds??[]);
  useEffect(()=>{let active=true;publicTeams.list().then(rows=>{if(active)setTeams(rows);}).catch(()=>{});return()=>{active=false};},[]);
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
      const { description, ...fields } = parsed.data;
      const input = { ...fields, descriptionHtml: description, imageUploadId, teamIds,published,showInNews,imageInGallery };
      if (update) await updatesService.updateUpdate(update.id, input);
      else await updatesService.createUpdate({ ...input, eventId: defaultEventId ?? null });
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
        <label className="block">
          כותרת
          <input className="w-full p-2 border rounded-md bg-background" value={value.title}
            onChange={e => setValue(old => ({ ...old, title: e.target.value }))}/>
        </label>
        <RichHtmlField label="תיאור" value={value.description}
          onChange={description => setValue(old => ({ ...old, description }))}/>
        {(['ctaText', 'ctaUrl'] as const).map((field, index) => (
          <label key={field} className="block">
            {['קריאה לפעולה', 'קישור קריאה לפעולה'][index]}
            <input className="w-full p-2 border rounded-md bg-background" value={value[field]}
              onChange={e => setValue(old => ({ ...old, [field]: e.target.value }))}/>
          </label>
        ))}
        {update && <MediaManager owner="update" id={update.id} items={update.mediaItems||[]} onChanged={onSaved}/>}
        <fieldset className="space-y-2"><legend className="font-bold">נבחרות משויכות (אופציונלי)</legend><p className="text-sm text-muted-foreground">העדכון יוצג לאוהדי הנבחרות שנבחרו.</p>{teams.map(t=><label key={t.id} className="flex gap-2"><input type="checkbox" checked={teamIds.includes(t.id)} onChange={e=>setTeamIds(old=>e.target.checked?[...old,t.id]:old.filter(id=>id!==t.id))}/>{t.name}</label>)}</fieldset>
        <label className="flex gap-2"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> פרסם</label>
        <label className="flex gap-2"><input type="checkbox" checked={showInNews} onChange={e=>setShowInNews(e.target.checked)}/> הצג בעמוד החדשות</label>
        <p className="text-sm text-muted-foreground">{!published?'טיוטה — העדכון לא יוצג לציבור.':!showInNews?'העדכון יוצג רק באירוע המשויך (אם פורסם).':'העדכון יוצג בחדשות ובאירוע המשויך (אם פורסם).'}</p>
        <label className="flex gap-2"><input type="checkbox" checked={imageInGallery} onChange={e=>setImageInGallery(e.target.checked)}/> הצג את תמונת העדכון בגלריה</label>
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

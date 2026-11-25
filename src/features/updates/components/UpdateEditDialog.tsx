import { useEffect, useState } from 'react';
import { eventsService } from '../../../services/events';
import { publicTeams } from '../../../services/publicTeams';
import type { Team } from '../../../types/team';
import type { EventSummary } from '../../../types/event';
import type { Update } from '../../../types/update';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import ImageUpload from '../../../components/ui/ImageUpload';
import MediaManager from '../../../components/media/MediaManager';
import updatesService from '../updatesService';
import { updateFormSchema } from '../utils/updateForm';
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
    description: update?.description ?? update?.content ?? '',
    ctaText: update?.ctaText || '',
    ctaUrl: update?.ctaUrl || '',
  });
  const [showInFieldNews,setShowInFieldNews]=useState(update?.showInFieldNews!==false);
  const [imageInGallery,setImageInGallery]=useState(!!update?.imageInGallery);
  const [eventId,setEventId] = useState(update?.eventId ?? defaultEventId ?? null);
  const [events,setEvents] = useState<EventSummary[]>([]);
  const [teams,setTeams]=useState<Team[]>([]),[teamIds,setTeamIds]=useState<string[]>(update?.teamIds??[]);
  useEffect(()=>{let active=true;publicTeams.list().then(rows=>{if(active)setTeams(rows);}).catch(()=>{});return()=>{active=false};},[]);
  useEffect(()=>{eventsService.manage().then(rows=>setEvents(Array.isArray(rows)?rows:[])).catch(()=>{});},[]);
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
      const input = { ...parsed.data, imageUploadId, eventId,teamIds,showInFieldNews,imageInGallery };
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
        {update && <MediaManager owner="update" id={update.id} items={update.mediaItems||[]} onChanged={onSaved}/>}
        {!defaultEventId && <label className="block">אירוע משויך (אופציונלי)<select className="block w-full border rounded-md p-2 bg-background" value={eventId||""} onChange={e=>setEventId(e.target.value||null)}><option value="">עדכון רגיל ללא אירוע</option>{events.map(ev=><option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></label>}
        <fieldset className="space-y-2"><legend className="font-bold">נבחרות משויכות (אופציונלי)</legend><p className="text-sm text-muted-foreground">העדכון יוצג לאוהדי הנבחרות שנבחרו.</p>{teams.map(t=><label key={t.id} className="flex gap-2"><input type="checkbox" checked={teamIds.includes(t.id)} onChange={e=>setTeamIds(old=>e.target.checked?[...old,t.id]:old.filter(id=>id!==t.id))}/>{t.name}</label>)}</fieldset>
        <label className="flex gap-2"><input type="checkbox" checked={showInFieldNews} onChange={e=>setShowInFieldNews(e.target.checked)}/> הצג בחדשות מהשטח</label>
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

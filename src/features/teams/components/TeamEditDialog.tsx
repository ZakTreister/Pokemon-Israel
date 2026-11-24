import { useConfirm } from '../../../components/ui/ConfirmProvider';
import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import ImageUpload from '../../../components/ui/ImageUpload';
import { useAppDispatch } from '../../../hooks/redux';
import { updateTeam } from '../teamsSlice';
import teamsService from '../teamsService';
import type { Team, StaffTeacher } from '../../../types/team';
import { requestError } from '../../../utils/requestError';
export default function TeamEditDialog({
  team,
  onClose,
  onSaved,
}: {
  team: Team;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const dispatch = useAppDispatch();
  const { showConfirm } = useConfirm();
  const [name, setName] = useState(team.name);
  const [region,setRegion] = useState(team.region||'');
  const [description,setDescription] = useState(team.description||'');
  const [themeColor,setThemeColor] = useState(team.themeColor||'#2563eb');
  const [cover,setCover] = useState(team.coverUrl||'');
  const [coverUploadId,setCoverUploadId] = useState<string|null>();
  const [teacher, setTeacher] = useState(team.teacher?.id || '');
  const [active, setActive] = useState(team.isActive);
  const [logo, setLogo] = useState(team.logo || '');
  const [logoUploadId, setLogoUploadId] = useState<string | null>();
  const [teachers, setTeachers] = useState<StaffTeacher[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    teamsService
      .getTeachers()
      .then((rows) => {
        if (alive) setTeachers(rows);
      })
      .catch((e) => {
        if (alive) setError(requestError(e));
      });
    return () => {
      alive = false;
    };
  }, []);
  const save = async () => {
    if (busy || uploading) return;
    if (!name.trim()) {
      setError('שם נבחרת הוא חובה');
      return;
    }
    if (
      active !== team.isActive &&
      !(await showConfirm({
        title: active ? 'הפעלת נבחרת' : 'השבתת נבחרת',
        message: active
          ? 'להפעיל את הנבחרת?'
          : 'להשבית את הנבחרת? יש להסיר קודם את חבריה הפעילים.',
        confirmText: active ? 'הפעל' : 'השבת',
        variant: 'destructive',
      }))
    )
      return;
    setBusy(true);
    setError('');
    try {
      await dispatch(
        updateTeam({
          id: team.id,
          input: {
            name: name.trim(),region,description,themeColor,coverUploadId,
            logoUploadId,
            isActive: active,
            ...(teacher ? { teacher } : {}),
          },
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
    <Modal
      title="עריכת נבחרת"
      onClose={busy || uploading ? undefined : onClose}
      footer={
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            disabled={busy || uploading}
            onClick={onClose}
          >
            ביטול
          </Button>
          <Button disabled={busy || uploading} onClick={() => void save()}>
            {busy ? 'שומר…' : 'שמור שינויים'}
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
          שם נבחרת
          <input
            className="w-full p-2 border rounded-md bg-background"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">אזור הנבחרת<input className="w-full p-2 border rounded-md bg-background" maxLength={120} value={region} onChange={e=>setRegion(e.target.value)}/></label>
        <label className="block">משפט היכרות<textarea className="w-full p-2 border rounded-md bg-background" maxLength={1200} value={description} onChange={e=>setDescription(e.target.value)}/></label>
        <label className="block">צבע נבחרת<input type="color" className="block mt-2" value={themeColor} onChange={e=>setThemeColor(e.target.value)}/></label>
        <ImageUpload purpose="team-cover" entityId={team.id} label="תמונה קבוצתית / שער" value={cover} onChange={image=>{setCover(image?.url||"");setCoverUploadId(image?.uploadId||null);}} onBusyChange={setUploading} disabled={busy}/>
        <ImageUpload
          purpose="team-logo"
          entityId={team.id}
          label="סמל הנבחרת"
          value={logo}
          onChange={(image) => {
            setLogo(image?.url || '');
            setLogoUploadId(image?.uploadId || null);
          }}
          onBusyChange={setUploading}
          disabled={busy}
        />
        <label className="block">
          מורה הנבחרת
          <select
            className="w-full p-2 border rounded-md bg-background"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
          >
            <option value="">טרם שויך מורה</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.role === 'admin' ? 'מנהל' : 'שופט'}
              </option>
            ))}
          </select>
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          נבחרת פעילה
        </label>
      </form>
    </Modal>
  );
}

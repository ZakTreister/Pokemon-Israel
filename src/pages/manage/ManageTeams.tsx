import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  fetchTeams,
  createTeam,
  clearError,
} from '../../features/teams/teamsSlice';
import teamsService from '../../features/teams/teamsService';
import OperationalTeamCard from '../../features/teams/components/OperationalTeamCard';
import ImageUpload from '../../components/ui/ImageUpload';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { requestError } from '../../utils/requestError';
import type { StaffTeacher } from '../../types/team';
export default function ManageTeams() {
  const admin = useAppSelector((state) => state.auth.user?.role === 'admin');
  const { teams, isLoading, error } = useAppSelector((state) => state.teams);
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [teachers, setTeachers] = useState<StaffTeacher[]>([]);
  const [logo, setLogo] = useState('');
  const [logoPublicId, setLogoPublicId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    dispatch(fetchTeams());
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);
  useEffect(() => {
    if (admin)
      teamsService
        .getTeachers()
        .then(setTeachers)
        .catch((e) => showToast(requestError(e), 'error'));
  }, [admin, showToast]);
  const create = async () => {
    if (busy || uploading || !teacher || !name.trim()) return;
    setBusy(true);
    try {
      await dispatch(
        createTeam({ name: name.trim(), teacher, logo, logoPublicId }),
      ).unwrap();
      setOpen(false);
      setName('');
      setTeacher('');
      setLogo('');
      setLogoPublicId('');
      showToast('הנבחרת נוצרה בהצלחה', 'success');
    } catch (e) {
      showToast(requestError(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <header className="flex justify-between items-center gap-3">
        <h2 className="text-2xl font-bold">ניהול נבחרות</h2>
        {admin && !open && (
          <Button onClick={() => setOpen(true)}>נבחרת חדשה</Button>
        )}
      </header>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {admin && open && (
        <form
          className="border rounded-lg p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <h3 className="font-bold">יצירת נבחרת חדשה</h3>
          <label className="block">
            שם הנבחרת
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full min-w-0 border rounded-md p-2 bg-background"
            />
          </label>
          <label className="block">
            מורה הנבחרת
            <select
              required
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              className="block w-full min-w-0 border rounded-md p-2 bg-background"
            >
              <option value="">בחרו מורה</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.role === 'admin' ? 'מנהל' : 'שופט'}
                </option>
              ))}
            </select>
          </label>
          <ImageUpload
            label="סמל הנבחרת"
            value={logo}
            onChange={(image) => {
              setLogo(image?.secureUrl || '');
              setLogoPublicId(image?.publicId || '');
            }}
            onBusyChange={setUploading}
            disabled={busy}
          />
          <div className="flex gap-2">
            <Button disabled={busy || uploading || !teacher || !name.trim()}>
              {busy ? 'יוצר…' : 'צור'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || uploading}
              onClick={() => setOpen(false)}
            >
              ביטול
            </Button>
          </div>
        </form>
      )}
      {isLoading ? (
        <p>טוען נתונים…</p>
      ) : !teams.length ? (
        <p>אין נבחרות עדיין</p>
      ) : (
        teams.map((team) => (
          <OperationalTeamCard key={team.id} team={team} members />
        ))
      )}
    </div>
  );
}
